/**
 * POST /api/create-order — starts an online (UPI / card) checkout.
 *
 * The browser posts what it wants to buy, never what it wants to pay:
 *   { items: [{ slug, qty }], cartItems: [{ slug, qty }],
 *     customer: {...}, shipping: {...}, method, userId? }
 * `items` is the priced, chargeable part of the cart; `cartItems` is the whole
 * cart, which only decides which volume-discount tier applies.
 * Every amount is re-derived from the catalog and the live discount config
 * (server/api/checkout-order.js), a PENDING Order + Payment pair is written,
 * and a Razorpay order is opened for that server-computed total.
 *
 * Returns: { orderId, orderNo, amountPaise, currency, keyId }
 *   orderId  — Razorpay's order id, handed to Checkout
 *   orderNo  — our ORD-000123 reference, shown to the customer
 *
 * Env (Vercel): RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 */
import { applyCors, handlePreflight } from '../server/api/cors.js'
import { prisma } from '../server/api/db.js'
import {
  getRazorpayCredentials,
  createRazorpayOrder,
  methodFromCheckoutChoice,
} from '../server/api/razorpay.js'
import {
  priceCheckoutLines,
  createPendingOrder,
  attachRazorpayOrder,
  RUPEES_TO_PAISE,
} from '../server/api/checkout-order.js'

function parseBody(req) {
  if (typeof req.body !== 'string') return req.body || {}
  try {
    return JSON.parse(req.body || '{}')
  } catch {
    return {}
  }
}

function text(value, max = 200) {
  return String(value ?? '').trim().slice(0, max)
}

export default async function handler(req, res) {
  const preflight = handlePreflight(req, res)
  if (preflight) return preflight
  applyCors(req, res)

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS')
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { keyId, configured } = getRazorpayCredentials()
  if (!configured) {
    return res
      .status(503)
      .json({ message: 'Online payment is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' })
  }

  const body = parseBody(req)

  try {
    const pricing = await priceCheckoutLines(body?.items, body?.cartItems)
    const paymentMethod = methodFromCheckoutChoice(body?.method)
    if (paymentMethod === 'COD') {
      return res.status(400).json({ message: 'Cash on delivery does not go through online payment.' })
    }

    const customer = {
      name: text(body?.customer?.name, 120),
      email: text(body?.customer?.email, 160).toLowerCase(),
      phone: text(body?.customer?.phone, 32),
    }
    const shipping = {
      address: text(body?.shipping?.address, 300),
      city: text(body?.shipping?.city, 120),
      state: text(body?.shipping?.state, 120),
      country: text(body?.shipping?.country, 80),
      pincode: text(body?.shipping?.pincode, 24),
    }

    // A signed-in shopper's order is attached to their account; guests still
    // get an order record, just without a customer link.
    let customerId = null
    const requestedUserId = text(body?.userId, 64)
    if (requestedUserId) {
      const user = await prisma.user.findUnique({ where: { id: requestedUserId }, select: { id: true } })
      customerId = user?.id || null
    }

    const order = await createPendingOrder({
      pricing,
      customer,
      shipping,
      paymentMethod,
      customerId,
    })

    const amountPaise = pricing.total * RUPEES_TO_PAISE
    const rzpOrder = await createRazorpayOrder({
      amountPaise,
      currency: pricing.currency,
      receipt: order.orderNo,
      // Echoed back on the webhook payload, which makes a stray event traceable
      // to an order even before the providerOrderRef lookup.
      notes: { orderNo: order.orderNo, orderId: order.id },
    })

    await attachRazorpayOrder(order.payments[0].id, rzpOrder.id)

    return res.status(200).json({
      orderId: rzpOrder.id,
      orderNo: order.orderNo,
      amountPaise,
      currency: pricing.currency,
      keyId,
    })
  } catch (err) {
    if (err?.statusCode === 400) {
      return res.status(400).json({ message: err.message })
    }
    console.error('Razorpay order create error:', err)
    return res.status(500).json({ message: 'Could not start the payment. Please try again.' })
  }
}
