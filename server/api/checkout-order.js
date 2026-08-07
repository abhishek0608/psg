/**
 * Server-side pricing and order records for storefront checkout.
 *
 * The browser sends only what it wants to buy (slug + qty). Every rupee is
 * re-derived here from the catalog and the live discount config, so a tampered
 * cart cannot buy a necklace for ₹1. The amount handed to Razorpay is the
 * amount this module computed, never one the client supplied.
 *
 * Units: as elsewhere in this codebase the `*Paise` columns hold whole rupees
 * (the names are historical — see src/utils/currency.ts). Razorpay is the one
 * consumer that genuinely wants paise, so amounts are multiplied by 100 only
 * at that boundary.
 */
import { prisma } from './db.js'
import { pickVariantForPricing, pickPriceFromPriceBook } from './product-presenter.js'
import { getSiteConfig } from './site-config-source.js'

export const RUPEES_TO_PAISE = 100

/** Normalises the `items` array off the request body. */
export function normalizeRequestedItems(rawItems) {
  return (Array.isArray(rawItems) ? rawItems : [])
    .map((item) => ({
      slug: String(item?.slug || '').trim(),
      qty: Math.min(Math.max(Math.floor(Number(item?.qty) || 0), 0), 999),
    }))
    .filter((item) => item.slug && item.qty > 0)
}

/**
 * Prices the requested lines against the catalog and applies the same volume
 * discount the cart advertised — recomputed from config rather than trusted.
 *
 * `cartItems` is the whole cart, `requestedItems` only the part being charged.
 * They differ because customized and price-on-request pieces are quoted rather
 * than sold, and the storefront counts them toward the volume-discount
 * threshold while excluding them from the discounted subtotal. Passing both
 * keeps the server's tier decision identical to the one the shopper was shown;
 * quantities still have to belong to real catalog products, so the threshold
 * cannot be inflated with invented lines.
 *
 * Throws with `.statusCode = 400` when a line cannot be priced; an unpriced
 * ("price on request") piece is quoted by the team, never charged online.
 */
export async function priceCheckoutLines(requestedItems, cartItems) {
  const requested = normalizeRequestedItems(requestedItems)
  if (!requested.length) {
    throw Object.assign(new Error('Add at least one item before paying.'), { statusCode: 400 })
  }
  const wholeCart = normalizeRequestedItems(cartItems)

  const slugs = [...new Set([...requested, ...wholeCart].map((item) => item.slug))]
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs }, active: true },
    include: {
      variants: { where: { active: true } },
      priceBookMap: { include: { priceBook: true } },
    },
  })
  const bySlug = new Map(products.map((product) => [product.slug, product]))

  const lines = []
  for (const item of requested) {
    const product = bySlug.get(item.slug)
    if (!product) {
      throw Object.assign(new Error(`"${item.slug}" is no longer available.`), { statusCode: 400 })
    }
    const variant = pickVariantForPricing(product.variants)
    if (!variant) {
      throw Object.assign(new Error(`No purchasable option found for "${product.title}".`), {
        statusCode: 400,
      })
    }
    // Same precedence the storefront shows: a live B2C price-book row wins
    // over the variant list price.
    const priceBookPrice = pickPriceFromPriceBook(product)
    const unitPrice =
      priceBookPrice != null && priceBookPrice > 0 ? priceBookPrice : variant.listPricePaise || 0
    if (!(unitPrice > 0)) {
      throw Object.assign(
        new Error(`"${product.title}" is price-on-request — request a quote instead of paying online.`),
        { statusCode: 400 },
      )
    }
    lines.push({
      slug: product.slug,
      variantId: variant.id,
      titleSnapshot: product.title,
      unitPrice,
      qty: item.qty,
      currency: variant.currency || 'INR',
    })
  }

  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
  // Quantity that decides the tier: the whole cart when it was sent, and every
  // slug in it has to be a live product.
  const countedLines = wholeCart.length ? wholeCart.filter((item) => bySlug.has(item.slug)) : lines
  const totalQty = countedLines.reduce((sum, line) => sum + line.qty, 0)

  // Tiers arrive sorted highest-threshold first, so the first match is best.
  const config = await getSiteConfig().catch(() => null)
  const tier = config?.volumeDiscountEnabled
    ? (config.volumeDiscountTiers || []).find((t) => totalQty >= t.minQty) || null
    : null
  const discountPercent = tier?.percent || 0
  const discountAmount = Math.round((subtotal * discountPercent) / 100)
  const total = subtotal - discountAmount

  if (!(total > 0)) {
    throw Object.assign(new Error('Order total must be greater than zero.'), { statusCode: 400 })
  }

  return {
    lines,
    subtotal,
    discountPercent,
    discountAmount,
    total,
    totalQty,
    currency: lines[0].currency,
  }
}

/**
 * Creates the PENDING Order + Payment pair that the Razorpay order is attached
 * to. Writing the order before payment means an abandoned or failed attempt
 * still leaves a trail, and the webhook has a row to update when the customer
 * completes a UPI collect request minutes after closing the tab.
 */
export async function createPendingOrder({
  pricing,
  customer,
  shipping,
  paymentMethod,
  customerId,
  notes,
}) {
  const noteLines = [
    `Storefront checkout (${paymentMethod})`,
    customer?.name ? `Name: ${customer.name}` : null,
    customer?.email ? `Email: ${customer.email}` : null,
    customer?.phone ? `Phone: ${customer.phone}` : null,
    shipping?.address
      ? `Ship to: ${[shipping.address, shipping.city, shipping.state, shipping.pincode, shipping.country]
          .filter(Boolean)
          .join(', ')}`
      : null,
    pricing.discountPercent ? `Volume discount: ${pricing.discountPercent}%` : null,
    notes || null,
  ].filter(Boolean)

  // Sequential ORD-000123 numbers; orderNo is unique, so retry with the next
  // number if a concurrent create grabbed the same one.
  let order = null
  let seq = (await prisma.order.count()) + 1
  let lastErr = null
  for (let attempt = 0; attempt < 5 && !order; attempt += 1, seq += 1) {
    try {
      order = await prisma.order.create({
        data: {
          orderNo: `ORD-${String(seq).padStart(6, '0')}`,
          channel: 'B2C',
          status: 'PENDING',
          customerId: customerId || undefined,
          subtotalPaise: pricing.subtotal,
          discountPaise: pricing.discountAmount,
          totalPaise: pricing.total,
          currency: pricing.currency,
          notes: noteLines.join('\n'),
          items: {
            create: pricing.lines.map((line) => ({
              variantId: line.variantId,
              titleSnapshot: line.titleSnapshot,
              pricePaise: line.unitPrice,
              qty: line.qty,
            })),
          },
          payments: {
            create: {
              provider: 'razorpay',
              method: paymentMethod,
              status: 'PENDING',
              amountPaise: pricing.total,
              currency: pricing.currency,
            },
          },
        },
        select: { id: true, orderNo: true, payments: { select: { id: true } } },
      })
    } catch (err) {
      lastErr = err
      if (err?.code !== 'P2002') throw err
    }
  }
  if (!order) throw lastErr || new Error('Could not allocate an order number.')
  return order
}

/**
 * Marks an order paid. Safe to call more than once — the Checkout handler and
 * the webhook routinely both report the same payment, and whichever arrives
 * first wins without the second one double-writing.
 */
export async function markOrderPaid({ payment, razorpayPaymentId, method, amountPaise }) {
  if (payment.status === 'SUCCESS') {
    return { order: await prisma.order.findUnique({ where: { id: payment.orderId } }), alreadyPaid: true }
  }

  const [, order] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerRef: razorpayPaymentId,
        status: 'SUCCESS',
        paidAt: new Date(),
        ...(method ? { method } : {}),
        ...(typeof amountPaise === 'number'
          ? { amountPaise: Math.round(amountPaise / RUPEES_TO_PAISE) }
          : {}),
      },
    }),
    prisma.order.update({ where: { id: payment.orderId }, data: { status: 'CONFIRMED' } }),
  ])

  return { order, alreadyPaid: false }
}

/** Records a failed attempt without cancelling the order — the customer may retry. */
export async function markPaymentFailed({ payment, razorpayPaymentId }) {
  if (!payment || payment.status === 'SUCCESS') return
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED', providerRef: razorpayPaymentId || payment.providerRef },
  })
}

/**
 * Finds the pending payment row a Razorpay order belongs to. Both the browser
 * callback and the webhook identify themselves by Razorpay order id, which is
 * the only handle they share with our records.
 */
export function findPaymentByRazorpayOrder(razorpayOrderId) {
  if (!razorpayOrderId) return null
  return prisma.payment.findFirst({
    where: { provider: 'razorpay', providerOrderRef: String(razorpayOrderId) },
    orderBy: { createdAt: 'desc' },
    include: { order: { select: { id: true, orderNo: true, totalPaise: true, currency: true } } },
  })
}

/** Links the Razorpay order id to the pending payment row we just created. */
export function attachRazorpayOrder(paymentId, razorpayOrderId) {
  return prisma.payment.update({
    where: { id: paymentId },
    data: { providerOrderRef: razorpayOrderId },
  })
}
