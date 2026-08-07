/**
 * Razorpay Checkout integration (UPI + credit/debit card).
 *
 * The browser never decides what an order costs or whether it was paid. It
 * sends the cart to /api/create-order, which prices it and opens a Razorpay
 * order; when Checkout reports success the payload is sent to
 * /api/payment?action=verify, and only a server-verified signature counts as
 * payment. See api/create-order.js and api/payment.js.
 */

import { computed } from 'vue'
import { paymentConfig } from '../config/payment'

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

export interface CheckoutLine {
  slug: string
  qty: number
}

export interface CheckoutCustomer {
  name: string
  email: string
  phone: string
}

export interface CheckoutShipping {
  address: string
  city: string
  state: string
  country: string
  pincode: string
}

export interface RazorpayHandlerResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description?: string
  prefill?: { name?: string; email?: string; contact?: string; method?: string }
  handler: (response: RazorpayHandlerResponse) => void
  modal?: { ondismiss?: () => void }
}

export interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: (payload: unknown) => void) => void
}

/** What the server settled on after pricing the cart itself. */
export interface CreatedOrder {
  orderId: string
  orderNo: string
  amountPaise: number
  currency: string
  keyId: string
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'
let scriptLoaded: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (scriptLoaded) return scriptLoaded
  scriptLoaded = new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever.
      scriptLoaded = null
      reject(new Error('Could not reach the payment gateway. Check your connection and try again.'))
    }
    document.body.appendChild(script)
  })
  return scriptLoaded
}

export function useRazorpay() {
  const keyId = computed(() => paymentConfig.value.razorpayKeyId)
  const orderApiUrl = computed(() => paymentConfig.value.orderApiUrl)
  const verifyApiUrl = computed(() => paymentConfig.value.verifyApiUrl)

  async function postJson<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({}))) as T & { message?: string }
    if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.')
    return data
  }

  /**
   * Asks the server to price the cart and open a Razorpay order. Only slugs and
   * quantities are sent — the amount comes back, it does not go out.
   */
  async function createOrder(payload: {
    /** The chargeable lines: priced, non-customized pieces. */
    items: CheckoutLine[]
    /** The whole cart — only used to pick the volume-discount tier. */
    cartItems: CheckoutLine[]
    customer: CheckoutCustomer
    shipping: CheckoutShipping
    method: string
    userId?: string
  }): Promise<CreatedOrder> {
    const data = await postJson<Partial<CreatedOrder>>(orderApiUrl.value, payload)
    if (!data.orderId || !data.amountPaise) throw new Error('Invalid order response from the server.')
    return {
      orderId: data.orderId,
      orderNo: data.orderNo || '',
      amountPaise: data.amountPaise,
      currency: data.currency || 'INR',
      keyId: data.keyId || keyId.value,
    }
  }

  /** Sends the Checkout payload back for signature verification. */
  async function verifyPayment(response: RazorpayHandlerResponse): Promise<{ orderNo?: string }> {
    const data = await postJson<{ verified?: boolean; orderNo?: string; message?: string }>(
      verifyApiUrl.value,
      response,
    )
    if (!data.verified) throw new Error(data.message || 'Payment could not be verified.')
    return { orderNo: data.orderNo }
  }

  /**
   * Opens Checkout and resolves only once the payment has been verified
   * server-side. Rejects on dismissal, gateway failure, or a payment the
   * server would not confirm.
   */
  async function openCheckout(options: {
    order: CreatedOrder
    customerName: string
    customerEmail: string
    customerPhone: string
    /** 'upi' or 'card' — opens Checkout on the method the customer picked. */
    preferredMethod?: string
    onDismiss?: () => void
  }): Promise<{ orderNo?: string }> {
    const key = options.order.keyId
    if (!key) {
      throw new Error('Razorpay key not configured. Set VITE_RAZORPAY_KEY_ID or add public/config.json.')
    }
    await loadScript()

    return new Promise<{ orderNo?: string }>((resolve, reject) => {
      let settled = false
      const settle = (fn: () => void) => {
        if (settled) return
        settled = true
        fn()
      }

      const rzp = new window.Razorpay({
        key,
        amount: options.order.amountPaise,
        currency: options.order.currency,
        order_id: options.order.orderId,
        name: 'Jewelet',
        description: options.order.orderNo ? `Order ${options.order.orderNo}` : 'Fine Jewellery',
        prefill: {
          name: options.customerName,
          email: options.customerEmail,
          contact: options.customerPhone,
          method: options.preferredMethod,
        },
        handler: (response) => {
          verifyPayment(response).then(
            (result) => settle(() => resolve(result)),
            (err: unknown) =>
              settle(() =>
                reject(
                  err instanceof Error
                    ? err
                    : new Error('Payment could not be verified. Please contact us before paying again.'),
                ),
              ),
          )
        },
        modal: {
          ondismiss: () => {
            options.onDismiss?.()
            settle(() => reject(new Error('Payment cancelled.')))
          },
        },
      })

      // A declined card or an expired UPI request fires this instead of the
      // handler; without it the modal closes and the promise never settles.
      rzp.on('payment.failed', (payload: unknown) => {
        const description = (payload as { error?: { description?: string } })?.error?.description
        settle(() => reject(new Error(description || 'Payment failed. Please try another method.')))
      })

      rzp.open()
    })
  }

  const isConfigured = computed(() => Boolean(keyId.value))

  return { createOrder, openCheckout, verifyPayment, loadScript, isConfigured, keyId, orderApiUrl }
}
