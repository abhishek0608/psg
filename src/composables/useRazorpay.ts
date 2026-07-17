/**
 * Razorpay Checkout integration.
 * Config from src/config/payment (env + optional public/config.json). See api/create-order.js for backend.
 */

import { computed } from 'vue'
import { paymentConfig } from '../config/payment'

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

export interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description?: string
  prefill?: { name?: string; email?: string; contact?: string }
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string }) => void
  modal?: { ondismiss?: () => void }
}

export interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: () => void) => void
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
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(script)
  })
  return scriptLoaded
}

export function useRazorpay() {
  const keyId = computed(() => paymentConfig.value.razorpayKeyId)
  const orderApiUrl = computed(() => paymentConfig.value.orderApiUrl)

  async function createOrder(amountPaise: number, receipt?: string): Promise<{ orderId: string }> {
    const url = orderApiUrl.value
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: receipt || `rcpt_${Date.now()}` }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message || 'Failed to create order')
    }
    const data = (await res.json()) as { orderId?: string; id?: string }
    const orderId = data.orderId || data.id
    if (!orderId) throw new Error('Invalid order response')
    return { orderId }
  }

  async function openCheckout(options: {
    amountPaise: number
    orderId: string
    customerName: string
    customerEmail: string
    customerPhone: string
    onSuccess: () => void
    onDismiss?: () => void
  }) {
    const k = keyId.value
    if (!k) throw new Error('Razorpay key not configured. Set VITE_RAZORPAY_KEY_ID or add public/config.json.')
    await loadScript()
    return new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: k,
        amount: options.amountPaise,
        currency: 'INR',
        order_id: options.orderId,
        name: 'Kiana Jewels',
        description: 'Fine Jewellery',
        prefill: {
          name: options.customerName,
          email: options.customerEmail,
          contact: options.customerPhone,
        },
        handler: () => {
          options.onSuccess()
          resolve()
        },
        modal: {
          ondismiss: () => {
            options.onDismiss?.()
            reject(new Error('Payment cancelled'))
          },
        },
      })
      rzp.open()
    })
  }

  const isConfigured = computed(() => Boolean(keyId.value))

  return { createOrder, openCheckout, loadScript, isConfigured, keyId, orderApiUrl }
}
