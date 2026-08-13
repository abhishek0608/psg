/**
 * Offer pricing — the single source of truth for storefront discounts.
 *
 * There are exactly two, and they behave differently on purpose:
 *
 *   Automatic offer — targets the whole catalog or selected products and is
 *                     part of each matching product's sticker price.
 *   Promo code  — typed in at checkout. Catalog prices are untouched; the code
 *                 reduces the order subtotal once it has been entered.
 *
 * A promo code applies to the subtotal *after* the flat offer, which is the
 * behaviour a shopper expects once the discounted price is the price they were
 * shown. The two therefore stack.
 *
 * Units: as elsewhere in this codebase the `*Paise` names hold whole rupees
 * (see src/utils/currency.ts). Percentages are whole numbers.
 */
import { prisma } from './db.js'

export const OFFER_TYPES = ['PERCENT', 'AMOUNT']

// A percent offer is capped below 100 so enabling one can never drive an order
// to ₹0 and take checkout down with it — Razorpay cannot charge nothing.
export const MAX_OFFER_PERCENT = 90

export function normalizeOfferType(value) {
  const type = String(value || '').trim().toUpperCase()
  return OFFER_TYPES.includes(type) ? type : 'PERCENT'
}

/** Clamps an offer value into range for its type: 1-90 percent, or whole rupees. */
export function normalizeOfferValue(value, type) {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  if (normalizeOfferType(type) === 'PERCENT') return Math.min(MAX_OFFER_PERCENT, parsed)
  return Math.min(100_000_000, parsed)
}

/**
 * Coerces the stored flat-offer columns into a clean shape. A malformed or
 * zero-valued offer reads as disabled rather than throwing, so a bad row can
 * never break price rendering on the storefront.
 */
export function normalizeFlatOffer(row) {
  const type = normalizeOfferType(row?.flatOfferType)
  const value = normalizeOfferValue(row?.flatOfferValue, type)
  const label = typeof row?.flatOfferLabel === 'string' ? row.flatOfferLabel.trim().slice(0, 60) : ''
  return {
    enabled: Boolean(row?.flatOfferEnabled) && value > 0,
    type,
    value,
    label,
  }
}

/** Badge copy for the storefront: the admin's own wording, else a generated one. */
export function flatOfferLabel(offer) {
  if (!offer?.enabled) return ''
  if (offer.label) return offer.label
  return offer.type === 'PERCENT' ? `${offer.value}% OFF` : `₹${offer.value.toLocaleString('en-IN')} OFF`
}

/**
 * The price a single unit actually sells for under the flat offer.
 *
 * A rupee-amount offer is skipped on pieces that cost no more than the offer
 * itself: "₹5,000 off" on a ₹4,000 piece would otherwise price it at or below
 * zero, and a free necklace is never what the admin meant.
 */
export function applyFlatOfferToUnitPrice(listPrice, offer) {
  const price = Math.round(Number(listPrice) || 0)
  const enabled = Boolean(offer?.enabled ?? offer?.active)
  if (!enabled || !(price > 0)) return price
  if (offer.type === 'PERCENT') {
    return Math.round((price * (100 - offer.value)) / 100)
  }
  return price > offer.value ? price - offer.value : price
}

// ---------------------------------------------------------------------------
// Scoped automatic offers
// ---------------------------------------------------------------------------

export const OFFER_SCOPES = ['ALL_PRODUCTS', 'PRODUCTS']

export function normalizeOfferScope(value) {
  const scope = String(value || '').trim().toUpperCase()
  return OFFER_SCOPES.includes(scope) ? scope : 'ALL_PRODUCTS'
}

/** Normalized internal shape shared by catalog and checkout resolution. */
export function normalizeAutomaticOffer(row) {
  const type = normalizeOfferType(row?.type)
  const value = normalizeOfferValue(row?.value, type)
  const productIds = Array.isArray(row?.products)
    ? row.products.map((target) => String(target?.productId || '')).filter(Boolean)
    : []
  return {
    id: String(row?.id || ''),
    name: typeof row?.name === 'string' ? row.name.trim().slice(0, 100) : '',
    type,
    value,
    label: typeof row?.label === 'string' ? row.label.trim().slice(0, 60) : '',
    scope: normalizeOfferScope(row?.scope),
    active: Boolean(row?.active) && value > 0,
    startsAt: row?.startsAt || null,
    endsAt: row?.endsAt || null,
    productIds,
  }
}

export function automaticOfferLabel(offer) {
  if (!offer?.active) return ''
  if (offer.label) return offer.label
  return offer.type === 'PERCENT'
    ? `${offer.value}% OFF`
    : `₹${offer.value.toLocaleString('en-IN')} OFF`
}

/**
 * Loads every currently active offer that can match one of the supplied
 * products. Date checks happen in Postgres so expired campaigns are not sent
 * through the rest of the pricing path.
 */
export async function getActiveAutomaticOffers(productIds = []) {
  const ids = [...new Set((Array.isArray(productIds) ? productIds : []).map(String).filter(Boolean))]
  const now = new Date()
  const targetClause = ids.length
    ? [{ scope: 'PRODUCTS', products: { some: { productId: { in: ids } } } }]
    : []
  const rows = await prisma.offer.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        { OR: [{ scope: 'ALL_PRODUCTS' }, ...targetClause] },
      ],
    },
    include: {
      products: {
        ...(ids.length ? { where: { productId: { in: ids } } } : {}),
        select: { productId: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(normalizeAutomaticOffer).filter((offer) => offer.active)
}

/**
 * Resolves overlapping campaigns in the shopper's favour: automatic offers
 * never stack; the one producing the lowest unit price wins. On an exact tie,
 * a selected-product campaign wins over an organisation-wide campaign, then
 * id order keeps the result deterministic.
 */
export function resolveAutomaticOffer(productId, listPrice, offers = []) {
  const price = Math.max(0, Math.round(Number(listPrice) || 0))
  if (!(price > 0)) return null

  let winner = null
  for (const offer of Array.isArray(offers) ? offers : []) {
    if (!offer?.active) continue
    const matches =
      offer.scope === 'ALL_PRODUCTS' ||
      (offer.scope === 'PRODUCTS' && offer.productIds?.includes(String(productId)))
    if (!matches) continue
    const discountedPrice = applyFlatOfferToUnitPrice(price, offer)
    if (!(discountedPrice < price)) continue

    const candidate = { ...offer, discountedPrice }
    if (!winner || candidate.discountedPrice < winner.discountedPrice) {
      winner = candidate
      continue
    }
    if (candidate.discountedPrice !== winner.discountedPrice) continue
    if (candidate.scope === 'PRODUCTS' && winner.scope !== 'PRODUCTS') {
      winner = candidate
      continue
    }
    if (candidate.scope === winner.scope && candidate.id.localeCompare(winner.id) < 0) winner = candidate
  }
  return winner
}

/** Public product payload; excludes schedules and target membership. */
export function toProductOfferPayload(offer) {
  if (!offer) return null
  return {
    id: offer.id,
    name: offer.name,
    type: offer.type,
    value: offer.value,
    label: automaticOfferLabel(offer),
    scope: offer.scope,
    discountedPrice: offer.discountedPrice,
  }
}

// ---------------------------------------------------------------------------
// Promo codes
// ---------------------------------------------------------------------------

/** Codes are stored and compared upper-case so "diwali10" and "DIWALI10" match. */
export function normalizePromoCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .slice(0, 40)
}

/**
 * The rupees a code takes off a subtotal, capped so at least ₹1 remains payable
 * — an order of ₹0 cannot be handed to Razorpay.
 */
export function promoDiscountFor(promo, subtotal) {
  const base = Math.max(0, Math.round(Number(subtotal) || 0))
  if (!promo || !(base > 0)) return 0
  const raw =
    promo.type === 'PERCENT' ? Math.round((base * promo.value) / 100) : Math.round(promo.value)
  return Math.max(0, Math.min(raw, base - 1))
}

/** Public shape for a code — never leaks the row id or internal timestamps. */
export function toPromoPayload(promo, discount) {
  return {
    code: promo.code,
    type: promo.type,
    value: promo.value,
    minOrderPaise: promo.minOrderPaise,
    discount,
  }
}

/**
 * Looks a code up and checks it against a subtotal.
 *
 * Returns `{ promo, discount }` on success. Throws with `.statusCode = 400` and
 * a shopper-readable message otherwise, so both the validate endpoint and
 * checkout reject an unusable code the same way and for the same reason.
 */
export async function resolvePromoCode(rawCode, subtotal) {
  const code = normalizePromoCode(rawCode)
  if (!code) {
    throw Object.assign(new Error('Enter a promo code.'), { statusCode: 400 })
  }

  const row = await prisma.promoCode.findUnique({ where: { code } })
  // An inactive or unknown code gets the same message either way: confirming
  // that a disabled code exists tells a guesser they are close.
  if (!row || !row.active) {
    throw Object.assign(new Error(`"${code}" is not a valid promo code.`), { statusCode: 400 })
  }

  const now = new Date()
  if (row.startsAt && new Date(row.startsAt) > now) {
    throw Object.assign(new Error(`"${code}" is not active yet.`), { statusCode: 400 })
  }
  if (row.endsAt && new Date(row.endsAt) < now) {
    throw Object.assign(new Error(`"${code}" has expired.`), { statusCode: 400 })
  }

  const base = Math.max(0, Math.round(Number(subtotal) || 0))
  if (row.minOrderPaise > 0 && base < row.minOrderPaise) {
    throw Object.assign(
      new Error(`"${code}" needs an order of at least ₹${row.minOrderPaise.toLocaleString('en-IN')}.`),
      { statusCode: 400 },
    )
  }

  const promo = {
    code: row.code,
    type: normalizeOfferType(row.type),
    value: normalizeOfferValue(row.value, row.type),
    minOrderPaise: Math.max(0, Math.floor(Number(row.minOrderPaise) || 0)),
  }
  const discount = promoDiscountFor(promo, base)
  if (!(discount > 0)) {
    throw Object.assign(new Error(`"${code}" does not reduce this order.`), { statusCode: 400 })
  }

  return { promo, discount }
}
