import { applyCors, handlePreflight } from '../server/api/cors.js'
import { getSiteConfig } from '../server/api/site-config-source.js'
import { getStoneSizesInUse } from '../server/api/stone-size-source.js'
import { priceCheckoutLines } from '../server/api/checkout-order.js'

function parseBody(req) {
  if (typeof req.body !== 'string') return req.body || {}
  try {
    return JSON.parse(req.body || '{}')
  } catch {
    return {}
  }
}

/**
 * POST /api/site-config — dry-runs a promo code against the cart.
 *
 * Body: { mode: 'validate-promo', code, items: [{slug, qty}], cartItems: [...] }
 *
 * The shopper needs to see what a code is worth before they pay, and the answer
 * has to come from the same code path that will charge them — so this prices the
 * cart exactly as checkout will, rather than trusting a subtotal off the wire. A
 * code that passes here is the code that applies at payment; the discount shown
 * is the discount taken.
 *
 * This rides on the site-config function instead of getting its own file to stay
 * under the Hobby plan's 12-function deployment cap — the same reason
 * api/internal.js fans out by `?resource=`.
 */
async function handleValidatePromo(req, res, body) {
  try {
    const pricing = await priceCheckoutLines({
      items: body?.items,
      cartItems: body?.cartItems,
      promoCode: body?.code,
    })
    return res.status(200).json({
      promo: {
        code: pricing.promoCode,
        discount: pricing.promoAmount,
      },
      subtotal: pricing.subtotal,
      total: pricing.total,
    })
  } catch (error) {
    if (error?.statusCode === 400) {
      return res.status(400).json({ message: error.message })
    }
    console.error('[site-config] promo validation failed:', error)
    return res.status(500).json({ message: 'Could not check that code. Please try again.' })
  }
}

export default async function handler(req, res) {
  const preflight = handlePreflight(req, res)
  if (preflight) return preflight
  applyCors(req, res)

  if (req.method === 'POST') {
    const body = parseBody(req)
    if (body?.mode === 'validate-promo') return handleValidatePromo(req, res, body)
    return res.status(400).json({ message: 'Unknown request.' })
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // The stone-size registry rides along on this already-global, cached config
    // request so the storefront can offer the set of sizes currently in use
    // without a dedicated serverless function (Hobby plan's 12-function cap).
    const [siteConfig, stoneSizes] = await Promise.all([getSiteConfig(), getStoneSizesInUse()])
    // Short cache so branding edits appear within a few seconds, with a brief
    // stale-while-revalidate window to keep the endpoint fast under load.
    res.setHeader('Cache-Control', 'public, max-age=10, s-maxage=10, stale-while-revalidate=30')
    return res.status(200).json({ siteConfig, stoneSizes })
  } catch (error) {
    console.error('[site-config] failed:', error)
    return res.status(500).json({ message: 'Unable to load site configuration.' })
  }
}
