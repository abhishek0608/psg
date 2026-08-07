/**
 * POST /api/payment?action=verify   — confirms a Checkout success server-side
 * POST /api/payment?action=webhook  — Razorpay webhook receiver
 *
 * Both routes exist because neither alone is enough. The Checkout callback is
 * fast but lives in a browser that can lie, so `verify` re-checks the signature
 * and re-reads the payment from Razorpay's API. The webhook is slow but
 * authoritative, and is the only thing that hears about a UPI collect request
 * the customer approves after closing the tab.
 *
 * They are folded into one function because Vercel's Hobby plan caps a
 * deployment at 12 serverless functions (see the note in api/internal.js).
 *
 * Env (Vercel):
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET  — required
 *   RAZORPAY_WEBHOOK_SECRET               — required for ?action=webhook
 */
import { applyCors, handlePreflight } from '../server/api/cors.js'
import {
  getRazorpayCredentials,
  getWebhookSecret,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  fetchRazorpayPayment,
  mapRazorpayMethod,
  readRawBody,
} from '../server/api/razorpay.js'
import {
  findPaymentByRazorpayOrder,
  markOrderPaid,
  markPaymentFailed,
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

// ---------------------------------------------------------------------------
// ?action=verify — called by the browser right after Checkout reports success.
// ---------------------------------------------------------------------------

async function handleVerify(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS')
    return res.status(405).json({ message: 'Method not allowed' })
  }
  if (!getRazorpayCredentials().configured) {
    return res.status(503).json({ verified: false, message: 'Online payment is not configured.' })
  }

  const body = parseBody(req)
  const razorpayOrderId = String(body?.razorpay_order_id || '').trim()
  const razorpayPaymentId = String(body?.razorpay_payment_id || '').trim()
  const signature = String(body?.razorpay_signature || '').trim()

  if (!verifyCheckoutSignature({ razorpayOrderId, razorpayPaymentId, signature })) {
    console.warn('Payment verify rejected: bad signature for order', razorpayOrderId)
    return res.status(400).json({ verified: false, message: 'Payment could not be verified.' })
  }

  try {
    const payment = await findPaymentByRazorpayOrder(razorpayOrderId)
    if (!payment) {
      return res.status(404).json({ verified: false, message: 'No matching order found for this payment.' })
    }
    if (payment.status === 'SUCCESS') {
      return res.status(200).json({ verified: true, orderNo: payment.order.orderNo })
    }

    // The signature proves Razorpay sent it; this proves the payment is really
    // captured, really for this order, and really for the full amount.
    const remote = await fetchRazorpayPayment(razorpayPaymentId)
    if (remote.order_id !== razorpayOrderId) {
      console.warn('Payment verify rejected: order mismatch', razorpayPaymentId)
      return res.status(400).json({ verified: false, message: 'Payment could not be verified.' })
    }
    if (!['captured', 'authorized'].includes(String(remote.status))) {
      await markPaymentFailed({ payment, razorpayPaymentId })
      return res.status(400).json({ verified: false, message: `Payment ${remote.status}. Please try again.` })
    }
    const expectedPaise = payment.amountPaise * RUPEES_TO_PAISE
    if (Number(remote.amount) !== expectedPaise) {
      console.warn('Payment verify rejected: amount mismatch', razorpayPaymentId, remote.amount, expectedPaise)
      return res.status(400).json({ verified: false, message: 'Payment amount did not match the order.' })
    }

    await markOrderPaid({
      payment,
      razorpayPaymentId,
      method: mapRazorpayMethod(remote.method),
      amountPaise: Number(remote.amount),
    })

    return res.status(200).json({
      verified: true,
      orderNo: payment.order.orderNo,
      method: mapRazorpayMethod(remote.method) || undefined,
    })
  } catch (err) {
    console.error('Payment verification failed:', err)
    return res.status(500).json({ verified: false, message: 'Could not verify the payment. Please contact us.' })
  }
}

// ---------------------------------------------------------------------------
// ?action=webhook — Razorpay server-to-server events.
// ---------------------------------------------------------------------------

async function handleWebhook(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Method not allowed' })
  }
  if (!getWebhookSecret()) {
    console.error('Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is unset.')
    return res.status(503).json({ message: 'Webhook not configured.' })
  }

  const raw = await readRawBody(req)
  if (!verifyWebhookSignature(raw, req.headers['x-razorpay-signature'])) {
    console.warn('Razorpay webhook rejected: bad signature.')
    return res.status(400).json({ message: 'Invalid signature' })
  }

  let event
  try {
    event = JSON.parse(raw)
  } catch {
    return res.status(400).json({ message: 'Invalid payload' })
  }

  const entity = event?.payload?.payment?.entity || null
  const razorpayOrderId = entity?.order_id || event?.payload?.order?.entity?.id || null

  try {
    const payment = razorpayOrderId ? await findPaymentByRazorpayOrder(razorpayOrderId) : null
    if (!payment) {
      // An event for an order we never created (a different environment
      // sharing the webhook, say) is acknowledged so Razorpay stops retrying.
      console.warn('Razorpay webhook for unknown order:', razorpayOrderId, event?.event)
      return res.status(200).json({ received: true, handled: false })
    }

    switch (event?.event) {
      case 'payment.captured':
      case 'order.paid': {
        const expectedPaise = payment.amountPaise * RUPEES_TO_PAISE
        if (entity && Number(entity.amount) !== expectedPaise) {
          console.warn('Razorpay webhook amount mismatch for', razorpayOrderId)
          return res.status(200).json({ received: true, handled: false })
        }
        await markOrderPaid({
          payment,
          razorpayPaymentId: entity?.id,
          method: mapRazorpayMethod(entity?.method),
          amountPaise: entity ? Number(entity.amount) : undefined,
        })
        break
      }
      case 'payment.failed':
        await markPaymentFailed({ payment, razorpayPaymentId: entity?.id })
        break
      default:
        return res.status(200).json({ received: true, handled: false })
    }

    return res.status(200).json({ received: true, handled: true })
  } catch (err) {
    // A 500 makes Razorpay retry, which is what we want for a transient
    // database failure — the handlers above are idempotent.
    console.error('Razorpay webhook handling failed:', err)
    return res.status(500).json({ message: 'Webhook handling failed' })
  }
}

export default async function handler(req, res) {
  const action = String(req?.query?.action || '').toLowerCase()

  // The webhook is server-to-server and must read the raw body, so it skips
  // the CORS preamble entirely.
  if (action === 'webhook') return handleWebhook(req, res)

  const preflight = handlePreflight(req, res)
  if (preflight) return preflight
  applyCors(req, res)

  if (action === 'verify') return handleVerify(req, res)
  return res.status(400).json({ message: 'Unknown payment action. Use ?action=verify or ?action=webhook.' })
}
