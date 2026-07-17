import { ref } from 'vue'
import type { Category, Material, Color, ProductSubtype } from '../data/products'

type TabId = 'new' | 'bestseller' | 'all'

export interface CollectionPreset {
  category?: Category
  material?: Material
  color?: Color
  tab?: TabId
  priceMax?: number
  stoneTags?: string[]
  subtypes?: ProductSubtype[]
}

const preset = ref<CollectionPreset | null>(null)

// backward-compat: some components still watch presetCategory directly
const presetCategory = ref<Category | null>(null)

export function useCollectionPreset() {
  function setPreset(p: CollectionPreset) {
    preset.value = p
    presetCategory.value = p.category ?? null
  }

  function setPresetAndScroll(category: Category) {
    setPreset({ category })
    const el = document.getElementById('collections')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function consumePreset(): CollectionPreset | null {
    const p = preset.value
    preset.value = null
    presetCategory.value = null
    return p
  }

  return { preset, presetCategory, setPreset, setPresetAndScroll, consumePreset }
}
