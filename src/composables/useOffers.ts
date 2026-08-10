import { computed, ref } from 'vue'
import { useSiteConfig, type FlatOffer } from './useSiteConfig'
import { API_BASE } from '../config-api'
import { formatInr } from '../utils/currency'

/**
 * The storefront half of offer pricing. Mirrors server/api/offers-source.js —
 * that module is authoritative and recomputes every rupee at checkout; this one
 * exists so the catalog can show the discounted price without a round trip per
 * card. The two must agree, so any change to the maths belongs in both.
 *
 * Two kinds of offer, deliberately different:
 *   Flat offer  — site-wide and automatic. Baked into the price on every
 *                 product card, so what the shopper sees is what they pay.
 *   Promo code  — typed in at checkout. Leaves catalog prices alone and comes
 *                 off the subtotal, on top of the flat offer.
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
 * The price a single unit sells for under the flat offer.
 *
 * A rupee-amount offer is skipped on pieces that cost no more than the offer
 * itself — "₹5,000 off" on a ₹4,000 piece would otherwise price it at zero.
 */
export function unitPriceWithOffer(listPrice: number, offer: FlatOffer): number {
  const price = Math.round(Number(listPrice) || 0)
  if (!offer.enabled || !(price > 0)) return price
  if (offer.type === 'PERCENT') return Math.round((price * (100 - offer.value)) / 100)
  return price > offer.value ? price - offer.value : price
}

export function useOffers() {
  const { flatOffer } = useSiteConfig()

  const offerActive = computed(() => flatOffer.value.enabled && flatOffer.value.value > 0)

  /** Badge copy: the admin's own wording when set, else one built from the value. */
  const offerLabel = computed(() => {
    if (!offerActive.value) return ''
    if (flatOffer.value.label) return flatOffer.value.label
    return flatOffer.value.type === 'PERCENT'
      ? `${flatOffer.value.value}% OFF`
      : `${formatInr(flatOffer.value.value)} OFF`
  })

  /** Discounted unit price for a list price, or the list price when no offer runs. */
  function offerPrice(listPrice: number): number {
    return unitPriceWithOffer(listPrice, flatOffer.value)
  }

  /**
   * What a product card needs in one call: whether this piece is actually
   * discounted (a rupee offer can skip cheap pieces), and both prices to show.
   */
  function priceDisplay(listPrice: number) {
    const list = Math.round(Number(listPrice) || 0)
    const discounted = Math.min(offerPrice(list), list)
    return {
      discounted,
      list,
      hasOffer: discounted < list,
      formattedDiscounted: formatInr(discounted),
      formattedList: formatInr(list),
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
    flatOffer,
    offerActive,
    offerLabel,
    offerPrice,
    priceDisplay,
    appliedPromo,
    promoError,
    promoChecking,
    applyPromoCode,
    clearPromoCode,
  }
}
