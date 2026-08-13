import { ref } from 'vue'
import { API_BASE } from '../config-api'
import { formatInr } from '../utils/currency'
import type { ProductOffer } from '../data/products'

/**
 * The storefront half of offer pricing. Mirrors server/api/offers-source.js —
 * that module is authoritative and recomputes every rupee at checkout; this one
 * exists so the catalog can show the discounted price without a round trip per
 * card. The two must agree, so any change to the maths belongs in both.
 *
 * Two kinds of offer, deliberately different:
 *   Automatic offer — org-wide or product-scoped. The catalog API resolves
 *                     the winning offer for every product.
 *   Promo code  — typed in at checkout. Leaves catalog prices alone and comes
 *                 off the subtotal, on top of automatic product offers.
 */

export interface AppliedPromo {
  code: string
  /** Rupees off the subtotal, as computed by the server. */
  discount: number
}

/** The applied code is module-level state so cart and checkout share one truth. */
const appliedPromo = ref<AppliedPromo | null>(null)
const promoError = ref('')
const promoChecking = ref(false)

/**
 * The price a single unit sells for under its resolved automatic offer.
 *
 * A rupee-amount offer is skipped on pieces that cost no more than the offer
 * itself — "₹5,000 off" on a ₹4,000 piece would otherwise price it at zero.
 */
export function unitPriceWithOffer(listPrice: number, offer?: ProductOffer | null): number {
  const price = Math.round(Number(listPrice) || 0)
  if (!offer || !(price > 0)) return price
  const resolved = Math.round(Number(offer.discountedPrice))
  if (Number.isFinite(resolved) && resolved > 0 && resolved < price) return resolved
  if (offer.type === 'PERCENT') return Math.round((price * (100 - offer.value)) / 100)
  if (offer.type === 'FIXED_PRICE') return offer.value < price ? offer.value : price
  return price > offer.value ? price - offer.value : price
}

export function useOffers() {
  /** Discounted unit price for a product's resolved offer, else list price. */
  function offerPrice(listPrice: number, offer?: ProductOffer | null): number {
    return unitPriceWithOffer(listPrice, offer)
  }

  /**
   * What a product card needs in one call: whether this piece is actually
   * discounted (a rupee offer can skip cheap pieces), and both prices to show.
   */
  function priceDisplay(listPrice: number, offer?: ProductOffer | null) {
    const list = Math.round(Number(listPrice) || 0)
    const discounted = Math.min(offerPrice(list, offer), list)
    return {
      discounted,
      list,
      hasOffer: discounted < list,
      formattedDiscounted: formatInr(discounted),
      formattedList: formatInr(list),
      label: offer?.label || '',
    }
  }

  /**
   * Asks the server what a code is worth for this cart. The check runs through
   * the same pricing path that will charge the shopper, so a code accepted here
   * is a code that applies at payment.
   */
  async function applyPromoCode(
    code: string,
    items: Array<{ slug: string; qty: number }>,
    cartItems: Array<{ slug: string; qty: number }>,
  ) {
    const trimmed = String(code || '').trim()
    if (!trimmed) {
      promoError.value = 'Enter a promo code.'
      return false
    }
    promoChecking.value = true
    promoError.value = ''
    try {
      const res = await fetch(`${API_BASE}/api/site-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'validate-promo', code: trimmed, items, cartItems }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Could not apply that code.')
      appliedPromo.value = {
        code: String(data?.promo?.code || trimmed).toUpperCase(),
        discount: Math.max(0, Math.round(Number(data?.promo?.discount) || 0)),
      }
      return true
    } catch (err) {
      appliedPromo.value = null
      promoError.value = err instanceof Error ? err.message : 'Could not apply that code.'
      return false
    } finally {
      promoChecking.value = false
    }
  }

  function clearPromoCode() {
    appliedPromo.value = null
    promoError.value = ''
  }

  return {
    offerPrice,
    priceDisplay,
    appliedPromo,
    promoError,
    promoChecking,
    applyPromoCode,
    clearPromoCode,
  }
}
