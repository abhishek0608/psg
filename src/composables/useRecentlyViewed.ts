import { computed, reactive } from 'vue'
import type { Product } from '../data/products'

const STORAGE_KEY = 'jewelet-recently-viewed'
const MAX_RECENT_ITEMS = 12

function loadStoredItems(): Product[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(stored)) return []
    return stored
      .filter((item): item is Product => Boolean(item && typeof item.slug === 'string'))
      .slice(0, MAX_RECENT_ITEMS)
  } catch {
    return []
  }
}

const recentProducts = reactive<Product[]>(loadStoredItems())

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentProducts))
  } catch {
    // Browsing history remains available for this session when storage is blocked.
  }
}

export function useRecentlyViewed() {
  const items = computed(() => recentProducts)
  const count = computed(() => recentProducts.length)

  function record(product: Product) {
    const existingIndex = recentProducts.findIndex((item) => item.slug === product.slug)
    if (existingIndex !== -1) recentProducts.splice(existingIndex, 1)
    recentProducts.unshift(product)
    if (recentProducts.length > MAX_RECENT_ITEMS) {
      recentProducts.splice(MAX_RECENT_ITEMS)
    }
    persist()
  }

  function remove(slug: string) {
    const index = recentProducts.findIndex((item) => item.slug === slug)
    if (index === -1) return
    recentProducts.splice(index, 1)
    persist()
  }

  function clear() {
    recentProducts.splice(0, recentProducts.length)
    persist()
  }

  return { items, count, record, remove, clear }
}
