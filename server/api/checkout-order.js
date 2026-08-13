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
import {
  getActiveAutomaticOffers,
  resolveAutomaticOffer,
  resolvePromoCode,
} from './offers-source.js'

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
 * Prices the requested lines against the catalog and applies the same offers
 * the storefront advertised — every one recomputed from config rather than
 * trusted, so a tampered cart cannot invent its own discount.
 *
 * Discounts are layered in the order a shopper sees them:
 *   1. automatic offer — the best matching org/product campaign reduces each
 *      unit price, exactly as the catalog displayed it
 *   2. volume tier — dormant (no admin surface); contributes 0 unless a B2B
 *      channel re-enables volumeDiscountEnabled directly in the database
 *   3. promo code — typed in at checkout, applied to what is left
 *
 * `cartItems` is the whole cart, `requestedItems` only the part being charged.
 * They differ because customized and price-on-request pieces are quoted rather
 * than sold, and the storefront counts them toward the volume-discount
 * threshold while excluding them from the discounted subtotal. Passing both
 * keeps the server's tier decision identical to the one the shopper was shown;
 * quantities still have to belong to real catalog products, so the threshold
 * cannot be inflated with invented lines.
 *
 * Throws with `.statusCode = 400` when a line cannot be priced or a promo code
 * is unusable; an unpriced ("price on request") piece is quoted by the team,
 * never charged online.
 */
export async function priceCheckoutLines({ items, cartItems, promoCode } = {}) {
  const requested = normalizeRequestedItems(items)
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

  // Config drives the dormant quantity tier. Automatic offers are separate
  // records and are loaded for only the products in this checkout. Either read
  // failing falls back toward list price, which is the safe direction.
  const [config, automaticOffers] = await Promise.all([
    getSiteConfig().catch(() => null),
    getActiveAutomaticOffers(products.map((product) => product.id)).catch(() => []),
  ])

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
    const listPrice =
      priceBookPrice != null && priceBookPrice > 0 ? priceBookPrice : variant.listPricePaise || 0
    if (!(listPrice > 0)) {
      throw Object.assign(
        new Error(`"${product.title}" is price-on-request — request a quote instead of paying online.`),
        { statusCode: 400 },
      )
    }
    // The winning automatic offer is part of the sticker price, so it is baked
    // into the unit price the order line records. Overlapping offers do not
    // stack; the resolver chooses the lowest customer price.
    const automaticOffer = resolveAutomaticOffer(product.id, listPrice, automaticOffers)
    const unitPrice = automaticOffer?.discountedPrice ?? listPrice
    lines.push({
      slug: product.slug,
      variantId: variant.id,
      titleSnapshot: product.title,
      listPrice,
      unitPrice,
      qty: item.qty,
      currency: variant.currency || 'INR',
      automaticOffer: automaticOffer
        ? { id: automaticOffer.id, name: automaticOffer.name, label: automaticOffer.label }
        : null,
    })
  }

  const listSubtotal = lines.reduce((sum, line) => sum + line.listPrice * line.qty, 0)
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
  const automaticOfferAmount = listSubtotal - subtotal
  // Quantity that decides the tier: the whole cart when it was sent, and every
  // slug in it has to be a live product.
  const countedLines = wholeCart.length ? wholeCart.filter((item) => bySlug.has(item.slug)) : lines
  const totalQty = countedLines.reduce((sum, line) => sum + line.qty, 0)

  // Tiers arrive sorted highest-threshold first, so the first match is best.
  // Dormant in practice — nothing in the internal workspace can enable this.
  const tier = config?.volumeDiscountEnabled
    ? (config.volumeDiscountTiers || []).find((t) => totalQty >= t.minQty) || null
    : null
  const volumePercent = tier?.percent || 0
  const volumeAmount = Math.round((subtotal * volumePercent) / 100)
  const afterVolume = subtotal - volumeAmount

  // A promo code is the shopper's own input, so an unusable one throws here and
  // the checkout call fails loudly rather than quietly charging full price.
  let promo = null
  let promoAmount = 0
  if (promoCode) {
    const resolved = await resolvePromoCode(promoCode, afterVolume)
    promo = resolved.promo
    promoAmount = resolved.discount
  }

  const discountAmount = volumeAmount + promoAmount
  const total = afterVolume - promoAmount

  if (!(total > 0)) {
    throw Object.assign(new Error('Order total must be greater than zero.'), { statusCode: 400 })
  }

  return {
    lines,
    listSubtotal,
    subtotal,
    automaticOfferAmount,
    // Backward-compatible field name for older order-note callers.
    flatOfferAmount: automaticOfferAmount,
    volumePercent,
    volumeAmount,
    promoCode: promo?.code || null,
    promoAmount,
    // Everything taken off the priced subtotal, which is what the Order's
    // discountPaise column records. Automatic offers are not part of it — they are
    // already inside each line's unit price.
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
    pricing.automaticOfferAmount || pricing.flatOfferAmount
      ? `Automatic product offers: −₹${(pricing.automaticOfferAmount || pricing.flatOfferAmount).toLocaleString('en-IN')} (in unit prices)`
      : null,
    pricing.volumePercent ? `Volume discount: ${pricing.volumePercent}%` : null,
    pricing.promoCode
      ? `Promo code ${pricing.promoCode}: −₹${pricing.promoAmount.toLocaleString('en-IN')}`
      : null,
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
          promoCode: pricing.promoCode || null,
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
