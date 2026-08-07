/**
 * Razorpay credentials, signature verification and REST helpers.
 *
 * Everything that decides whether money actually moved lives here: the browser
 * is never trusted to report its own payment as successful. Razorpay signs
 * both the Checkout handler payload and its webhooks with the account's
 * secret, so a payment only counts once one of those signatures verifies
 * server-side against a secret the browser never sees.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

const RAZORPAY_API = 'https://api.razorpay.com/v1'

export function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID || ''
  const keySecret = process.env.RAZORPAY_KEY_SECRET || ''
  return { keyId, keySecret, configured: Boolean(keyId && keySecret) }
}

/** Webhooks are signed with their own secret, set when creating the webhook. */
export function getWebhookSecret() {
  return process.env.RAZORPAY_WEBHOOK_SECRET || ''
}

/**
 * Constant-time compare of two hex digests. A plain `===` on a signature leaks
 * how many leading characters matched, which is enough to forge one byte at a
 * time given enough attempts.
 */
function signaturesMatch(expected, received) {
  const a = Buffer.from(String(expected || ''), 'utf8')
  const b = Buffer.from(String(received || ''), 'utf8')
  if (a.length !== b.length || !a.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Razorpay Checkout returns `razorpay_signature` = HMAC-SHA256 of
 * "<razorpay_order_id>|<razorpay_payment_id>" keyed with the API secret.
 */
export function verifyCheckoutSignature({ razorpayOrderId, razorpayPaymentId, signature }) {
  const { keySecret, configured } = getRazorpayCredentials()
  if (!configured) return false
  if (!razorpayOrderId || !razorpayPaymentId || !signature) return false
  const expected = createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')
  return signaturesMatch(expected, signature)
}

/** Webhook bodies are signed as a whole, so the raw bytes must be hashed. */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = getWebhookSecret()
  if (!secret || !rawBody || !signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  return signaturesMatch(expected, signature)
}

function authHeader() {
  const { keyId, keySecret } = getRazorpayCredentials()
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
}

async function razorpayFetch(path, init = {}) {
  const res = await fetch(`${RAZORPAY_API}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = payload?.error?.description || `Razorpay request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    throw err
  }
  return payload
}

export function createRazorpayOrder({ amountPaise, currency = 'INR', receipt, notes }) {
  return razorpayFetch('/orders', {
    method: 'POST',
    body: JSON.stringify({ amount: amountPaise, currency, receipt, notes, payment_capture: 1 }),
  })
}

/**
 * The signature proves the payload came from Razorpay; this proves what the
 * payload claims. Re-reading the payment from the API is what catches a replay
 * of an old-but-genuine signature against a different order or amount.
 */
export function fetchRazorpayPayment(paymentId) {
  return razorpayFetch(`/payments/${encodeURIComponent(paymentId)}`)
}

/** Razorpay's method strings → the PaymentMethod enum in schema.prisma. */
export function mapRazorpayMethod(method) {
  switch (String(method || '').toLowerCase()) {
    case 'card':
      return 'CARD'
    case 'upi':
      return 'UPI'
    case 'netbanking':
      return 'NETBANKING'
    case 'wallet':
      return 'WALLET'
    case 'bank_transfer':
      return 'BANK_TRANSFER'
    default:
      return null
  }
}

/** The checkout radio ids ('upi' / 'card') → PaymentMethod, for the pending row. */
export function methodFromCheckoutChoice(choice) {
  switch (String(choice || '').toLowerCase()) {
    case 'upi':
      return 'UPI'
    case 'card':
      return 'CARD'
    case 'cod':
      return 'COD'
    default:
      return 'CARD'
  }
}

/**
 * Vercel's Node runtime parses JSON bodies before the handler runs, which
 * consumes the stream the webhook signature needs. Read the raw stream when it
 * is still readable and fall back to re-serialising the parsed body — Razorpay
 * emits compact JSON, so the round trip reproduces the signed bytes.
 */
export async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8')
  if (req.readable) {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    if (chunks.length) return Buffer.concat(chunks).toString('utf8')
  }
  return req.body ? JSON.stringify(req.body) : ''
}
