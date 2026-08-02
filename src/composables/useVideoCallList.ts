import { computed, reactive } from 'vue'
import type { Product } from '../data/products'
import { ensureSiteConfigLoaded, useSiteConfig } from './useSiteConfig'

// The shortlist a shopper builds for a video consultation: the pieces they want
// an advisor to show them on the call. It deliberately lives in localStorage
// rather than on the server — requesting a call needs no account, so the list
// has to work for a signed-out visitor too.
const STORAGE_KEY = 'jewelet-video-call-list'

export interface VideoCallListItem {
  slug: string
  title: string
  price: string
  priceValue: number
  imageUrl: string
}

export type AddToVideoCallResult =
  | { ok: true }
  | { ok: false; reason: 'disabled' | 'duplicate' | 'full' | 'below-minimum' }

function loadStoredItems(): VideoCallListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((entry) => entry && typeof entry === 'object' && typeof entry.slug === 'string')
      .map((entry) => ({
        slug: String(entry.slug),
        title: String(entry.title || ''),
        price: String(entry.price || ''),
        priceValue: Number(entry.priceValue) || 0,
        imageUrl: String(entry.imageUrl || ''),
      }))
  } catch {
    return []
  }
}

const items = reactive<VideoCallListItem[]>(loadStoredItems())

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore storage errors
  }
}

function toListItem(product: Product): VideoCallListItem {
  return {
    slug: product.slug,
    title: product.title,
    price: product.price,
    priceValue: product.priceValue ?? Number(String(product.price || '').replace(/[^0-9.]/g, '')) ?? 0,
    imageUrl: product.images?.[0] || '',
  }
}

export function useVideoCallList() {
  const { loaded, videoCallEnabled, videoCallMinPrice, videoCallMaxItems } = useSiteConfig()
  void ensureSiteConfigLoaded()

  const count = computed(() => items.length)
  const isFull = computed(() => items.length >= videoCallMaxItems.value)

  function has(slug: string) {
    return items.some((item) => item.slug === slug)
  }

  // A piece qualifies once it is priced at or above the configured floor.
  // Unpriced ("price on request") pieces are quoted individually and are
  // exactly the sort of thing a call is for, so they always qualify.
  //
  // Nothing qualifies until the config has actually arrived: the defaults are
  // permissive, so answering early would flash the option onto pieces the store
  // has put below its threshold — and let a quick shopper add one.
  function isEligible(product: Pick<Product, 'price' | 'priceValue'>) {
    if (!loaded.value || !videoCallEnabled.value) return false
    const value = product.priceValue ?? Number(String(product.price || '').replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(value) || value <= 0) return true
    return value >= videoCallMinPrice.value
  }

  function add(product: Product): AddToVideoCallResult {
    if (!videoCallEnabled.value) return { ok: false, reason: 'disabled' }
    if (has(product.slug)) return { ok: false, reason: 'duplicate' }
    if (!isEligible(product)) return { ok: false, reason: 'below-minimum' }
    if (isFull.value) return { ok: false, reason: 'full' }
    items.push(toListItem(product))
    persist()
    return { ok: true }
  }

  function remove(slug: string) {
    const index = items.findIndex((item) => item.slug === slug)
    if (index === -1) return
    items.splice(index, 1)
    persist()
  }

  function clear() {
    items.splice(0, items.length)
    persist()
  }

  return { items, count, isFull, has, isEligible, add, remove, clear, maxItems: videoCallMaxItems, enabled: videoCallEnabled, minPrice: videoCallMinPrice }
}
