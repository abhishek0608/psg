/**
 * Payment config: from env at build time, optionally overridden by public/config.json at runtime.
 * Copy public/config.example.json to public/config.json and set razorpayKeyId to enable online payment.
 */
import { ref } from 'vue'

export interface PaymentConfig {
  razorpayKeyId: string
  orderApiUrl: string
}

const env = import.meta.env
const paymentConfig = ref<PaymentConfig>({
  razorpayKeyId: (env.VITE_RAZORPAY_KEY_ID as string) || '',
  orderApiUrl: (env.VITE_ORDER_API_URL as string) || '/api/create-order',
})

export { paymentConfig }

let loadPromise: Promise<void> | null = null

export function loadPaymentConfig(): Promise<void> {
  if (loadPromise) return loadPromise
  loadPromise = fetch('/config.json')
    .then((res) => (res.ok ? res.json() : null))
    .then((json: Partial<PaymentConfig> | null) => {
      if (json) {
        if (json.razorpayKeyId) paymentConfig.value.razorpayKeyId = json.razorpayKeyId
        if (json.orderApiUrl) paymentConfig.value.orderApiUrl = json.orderApiUrl
      }
    })
    .catch(() => {})
  return loadPromise
}
