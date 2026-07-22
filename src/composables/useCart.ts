import { reactive, computed, watch, ref } from 'vue'
import type { Product } from '../data/products'
import { useAuth } from './useAuth'
import { useSiteConfig, type VolumeDiscountTier } from './useSiteConfig'
import { API_BASE } from '../config-api'

export interface ProductCustomization {
  isCustomized?: boolean
  diamondQuality?: string
  metalColor?: string
  metalPurity?: string
  centerShape?: string
  centerStoneSize?: string
  stoneType?: string
  ringSize?: string
  bangleSize?: string
  necklaceSize?: string
  additionalRemarks?: string
}

export interface CartItem {
  id: string
  product: Product
  qty: number
  customization?: ProductCustomization | null
}

export function isCustomizedCartItem(item: Pick<CartItem, 'customization'>) {
  return Boolean(item.customization?.isCustomized)
}

// Unpriced ("$0") products are quoted individually, so cart/checkout labels
// them "Price on request" rather than displaying a zero amount.
export function isPriceOnRequestCartItem(item: Pick<CartItem, 'product'>) {
  const value =
    item.product.priceValue ?? Number(String(item.product.price || '').replace(/[^0-9.]/g, ''))
  return !(Number.isFinite(value) && value > 0)
}

const LEGACY_CART_STORAGE_KEY = 'kiana-demo-cart'
const CART_CACHE_KEY = 'jewelet-cart-cache'

function clearLegacyCartStorage() {
  try {
    localStorage.removeItem(LEGACY_CART_STORAGE_KEY)
  } catch {
    // ignore storage errors
  }
}

function loadCachedCart(): { cartId: string | null; items: CartItem[] } {
  try {
    const raw = localStorage.getItem(CART_CACHE_KEY)
    if (!raw) return { cartId: null, items: [] }
    const parsed = JSON.parse(raw)
    return {
      cartId: parsed?.cartId || null,
      items: Array.isArray(parsed?.items) ? parsed.items : [],
    }
  } catch {
    return { cartId: null, items: [] }
  }
}

function saveCartCache(id: string | null, cartItems: CartItem[]) {
  try {
    localStorage.setItem(CART_CACHE_KEY, JSON.stringify({ cartId: id, items: cartItems }))
  } catch {
    // ignore storage errors
  }
}

function clearCartCache() {
  try {
    localStorage.removeItem(CART_CACHE_KEY)
  } catch {
    // ignore storage errors
  }
}

function customizationSignature(customization?: ProductCustomization | null) {
  if (!customization) return ''
  return JSON.stringify(
    Object.entries(customization)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([a], [b]) => a.localeCompare(b)),
  )
}

function createGuestCartItemId() {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

clearLegacyCartStorage()
const cached = loadCachedCart()
const items = reactive<CartItem[]>(cached.items)
const cartId = ref<string | null>(cached.cartId)
const loading = ref(false)
let cartSyncBound = false

export function useCart() {
  const { user } = useAuth()
  const { volumeDiscountEnabled, volumeDiscountTiers } = useSiteConfig()
  const totalItems = computed(() => items.reduce((sum, i) => sum + i.qty, 0))

  const totalPrice = computed(() =>
    items.reduce((sum, i) => {
      if (isCustomizedCartItem(i)) return sum
      const num = i.product.priceValue ?? Number(i.product.price.replace(/[^\d]/g, ''))
      return sum + num * i.qty
    }, 0),
  )

  const formattedTotal = computed(() => '$' + totalPrice.value.toLocaleString('en-US'))

  // --- Site-wide volume (quantity) discount ---
  // The best applicable tier is the one with the highest minQty the cart's
  // total item count satisfies (tiers arrive sorted high→low). Customized
  // items count toward the quantity threshold but, since they're quoted
  // separately, the percentage only reduces the priced subtotal (totalPrice).
  const volumeDiscountTier = computed<VolumeDiscountTier | null>(() => {
    if (!volumeDiscountEnabled.value) return null
    const qty = totalItems.value
    return volumeDiscountTiers.value.find((t) => qty >= t.minQty) ?? null
  })

  const discountPercent = computed(() => volumeDiscountTier.value?.percent ?? 0)
  const discountAmount = computed(() => Math.round((totalPrice.value * discountPercent.value) / 100))
  const discountedTotal = computed(() => totalPrice.value - discountAmount.value)
  const formattedDiscount = computed(() => '$' + discountAmount.value.toLocaleString('en-US'))
  const formattedDiscountedTotal = computed(() => '$' + discountedTotal.value.toLocaleString('en-US'))

  // The next unreached tier, used to nudge shoppers ("add N more to save X%").
  const nextVolumeDiscountTier = computed<VolumeDiscountTier | null>(() => {
    if (!volumeDiscountEnabled.value) return null
    const qty = totalItems.value
    const higher = volumeDiscountTiers.value.filter((t) => t.minQty > qty)
    return higher[higher.length - 1] ?? null
  })

  async function syncFromServer() {
    if (!user.value?.id) return
    loading.value = true
    const res = await fetch(
      `${API_BASE}/api/account?mode=cart&userId=${encodeURIComponent(user.value.id)}`,
      { method: 'GET' }
    )
    const data = await res.json().catch(() => ({}))
    try {
      if (!res.ok) throw new Error(data?.message || 'Unable to load cart.')
      cartId.value = typeof data?.cartId === 'string' && data.cartId ? data.cartId : cartId.value
      const nextItems = Array.isArray(data?.items) ? data.items : []
      items.splice(0, items.length, ...nextItems)
      saveCartCache(cartId.value, nextItems)
    } finally {
      loading.value = false
    }
  }

  async function mutateServerCart(payload: Record<string, unknown>) {
    if (!user.value?.id) return
    const res = await fetch(`${API_BASE}/api/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'cart', userId: user.value.id, ...payload }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Unable to update cart.')
    cartId.value = typeof data?.cartId === 'string' && data.cartId ? data.cartId : cartId.value
    const nextItems = Array.isArray(data?.items) ? data.items : []
    items.splice(0, items.length, ...nextItems)
    saveCartCache(cartId.value, nextItems)
  }

  async function addToCart(product: Product, qty = 1, customization?: ProductCustomization) {
    if (!user.value?.id) {
      const quantity = Math.max(1, Math.floor(Number(qty) || 1))
      const signature = customizationSignature(customization)
      const existing = items.find(
        (item) =>
          item.product.slug === product.slug &&
          customizationSignature(item.customization) === signature,
      )
      if (existing) existing.qty += quantity
      else {
        items.push({
          id: createGuestCartItemId(),
          product,
          qty: quantity,
          customization: customization || null,
        })
      }
      cartId.value = null
      saveCartCache(null, items)
      return
    }
    if (!cartId.value) {
      await syncFromServer()
    }
    await mutateServerCart({
      action: 'add',
      cartId: cartId.value,
      productId: product.id,
      slug: product.slug,
      qty,
      customization,
    })
  }

  async function removeFromCart(cartItemId: string, slug?: string) {
    if (!cartItemId && !slug) throw new Error('Missing cart item reference.')
    if (!user.value?.id) {
      const index = items.findIndex((item) =>
        cartItemId ? item.id === cartItemId : item.product.slug === slug,
      )
      if (index >= 0) items.splice(index, 1)
      saveCartCache(null, items)
      return
    }
    await mutateServerCart({
      action: 'remove',
      cartId: cartId.value,
      ...(cartItemId ? { cartItemId } : {}),
      ...(!cartItemId && slug ? { slug } : {}),
    })
  }

  async function updateQty(cartItemId: string, qty: number, slug?: string) {
    if (qty <= 0) {
      await removeFromCart(cartItemId, slug)
    } else if (!user.value?.id) {
      const item = items.find((entry) =>
        cartItemId ? entry.id === cartItemId : entry.product.slug === slug,
      )
      if (item) item.qty = Math.max(1, Math.floor(Number(qty) || 1))
      saveCartCache(null, items)
    } else {
      await mutateServerCart({
        action: 'set',
        cartId: cartId.value,
        qty,
        ...(cartItemId ? { cartItemId } : {}),
        ...(!cartItemId && slug ? { slug } : {}),
      })
    }
  }

  async function clearCart() {
    if (!user.value?.id) {
      items.splice(0, items.length)
      clearLegacyCartStorage()
      clearCartCache()
      return
    }
    await mutateServerCart({ action: 'clear', cartId: cartId.value })
  }

  if (!cartSyncBound) {
    cartSyncBound = true
    watch(
      () => user.value?.id || null,
      async (userId, previousUserId) => {
        if (!userId) {
          cartId.value = null
          loading.value = false
          // Keep an anonymous shopper's local cart across reloads. When a
          // signed-in customer explicitly logs out, clear their server-backed
          // cart snapshot so it is not exposed as a guest cart.
          if (previousUserId) {
            items.splice(0, items.length)
            clearCartCache()
          }
          return
        }
        try {
          await syncFromServer()
        } catch (err) {
          console.error('Cart initial sync failed:', err)
          loading.value = false
        }
      },
      { immediate: true }
    )
  }

  return {
    items,
    cartId,
    loading,
    totalItems,
    totalPrice,
    formattedTotal,
    volumeDiscountTier,
    nextVolumeDiscountTier,
    discountPercent,
    discountAmount,
    discountedTotal,
    formattedDiscount,
    formattedDiscountedTotal,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
  }
}
