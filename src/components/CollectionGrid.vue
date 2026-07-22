<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import ProductCard from './ProductCard.vue'
import FilterModal from './FilterModal.vue'
import { CATEGORIES, STONE_TYPE_OPTIONS, COLORS, CENTER_SHAPE_OPTIONS, CENTER_STONE_SIZE_OPTIONS, type Category, type Material, type Color, type ProductSubtype } from '../data/products'
import { useCollectionPreset } from '../composables/useCollectionPreset'
import { useProductsApi } from '../composables/useProductsApi'
import { API_BASE } from '../config-api'

type TabId = 'new' | 'bestseller' | 'all'

interface Filters {
  categories: Category[]
  materials: Material[]
  colors: Color[]
  priceMin: number
  priceMax: number
  stoneTags: string[]
  subtypes: ProductSubtype[]
  centerShapes: string[]
  centerStoneSizes: string[]
}

defineProps<{ hideHeader?: boolean; sidebar?: boolean }>()

const { products, ensureProductsLoaded, loading: productsLoading, loaded: productsLoaded } = useProductsApi()
const maxPrice = computed(() => {
  const values = products.value.map((p) => p.priceValue).filter((v) => typeof v === 'number')
  return values.length ? Math.max(...values) : 0
})

const { preset, consumePreset } = useCollectionPreset()

const activeTab = ref<TabId>('all')
const filterOpen = ref(false)
// When a collection preset locks a single category (e.g. the Rings page),
// the Category section is hidden in the filter — the page already conveys it.
const lockedCategory = ref<Category | null>(null)
const appliedFilters = ref<Filters>({ categories: [], materials: [], colors: [], priceMin: 0, priceMax: 0, stoneTags: [], subtypes: [], centerShapes: [], centerStoneSizes: [] })
const filteredProducts = ref<any[]>([])
const listLoading = ref(false)
const firstLoadDone = ref(false)
const readyForFilterFetch = ref(false)

function applyPreset(p: NonNullable<typeof preset.value>) {
  const f: Filters = { categories: [], materials: [], colors: [], priceMin: 0, priceMax: maxPrice.value, stoneTags: [], subtypes: [], centerShapes: [], centerStoneSizes: [] }
  if (p.category) f.categories = [p.category]
  if (p.material) f.materials = [p.material]
  if (p.color) f.colors = [p.color]
  if (p.priceMin !== undefined) f.priceMin = p.priceMin
  if (p.priceMax !== undefined) f.priceMax = p.priceMax
  if (p.stoneTags !== undefined) f.stoneTags = p.stoneTags
  if (p.subtypes !== undefined) f.subtypes = p.subtypes
  appliedFilters.value = f
  lockedCategory.value = p.category ?? null
  if (p.tab) activeTab.value = p.tab
}

onMounted(async () => {
  await ensureProductsLoaded()
  if (maxPrice.value > 0) {
    appliedFilters.value = { ...appliedFilters.value, priceMax: maxPrice.value }
  }
  const pending = preset.value
  if (pending) {
    applyPreset(pending)
    consumePreset()
  }
  readyForFilterFetch.value = true
  if (pending || activeFilterCount.value > 0 || activeTab.value !== 'all') {
    await loadFilteredProducts()
  } else {
    filteredProducts.value = products.value
    firstLoadDone.value = true
  }
})

watch(preset, (p) => {
  if (p) {
    applyPreset(p)
    consumePreset()
  }
})

const tabs: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New Arrival' },
  { id: 'bestseller', label: 'Best Seller' },
]

function switchTab(tab: TabId) {
  activeTab.value = tab
}

// --- Sort (desktop sidebar layout) ---
type SortId = 'featured' | 'price-asc' | 'price-desc' | 'newest'
const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'newest', label: 'Newest' },
]
const sortBy = ref<SortId>('featured')
const sortOpen = ref(false)
const sortLabel = computed(() => SORT_OPTIONS.find((o) => o.id === sortBy.value)?.label ?? 'Featured')

function selectSort(id: SortId) {
  sortBy.value = id
  sortOpen.value = false
}

const displayedProducts = computed(() => {
  const list = [...filteredProducts.value]
  if (sortBy.value === 'price-asc') list.sort((a, b) => (a.priceValue ?? 0) - (b.priceValue ?? 0))
  else if (sortBy.value === 'price-desc') list.sort((a, b) => (b.priceValue ?? 0) - (a.priceValue ?? 0))
  else if (sortBy.value === 'newest') list.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0))
  return list
})

// --- Sidebar filter toggles (bind directly to appliedFilters; the deep
// watcher re-fetches the filtered list on change) ---
const materialOptions: { id: Material; label: string }[] = [
  { id: 'gold', label: 'Gold' },
  { id: 'silver', label: 'Silver' },
]

function toggleCategory(cat: Category) {
  const arr = appliedFilters.value.categories
  const i = arr.indexOf(cat)
  if (i === -1) arr.push(cat)
  else arr.splice(i, 1)
}
function toggleMaterial(m: Material) {
  const arr = appliedFilters.value.materials
  const i = arr.indexOf(m)
  if (i === -1) arr.push(m)
  else arr.splice(i, 1)
}
function toggleStoneTag(tag: string) {
  const arr = appliedFilters.value.stoneTags
  const i = arr.indexOf(tag)
  if (i === -1) arr.push(tag)
  else arr.splice(i, 1)
}
function toggleColor(c: Color) {
  const arr = appliedFilters.value.colors
  const i = arr.indexOf(c)
  if (i === -1) arr.push(c)
  else arr.splice(i, 1)
}
function toggleCenterShape(s: string) {
  const arr = appliedFilters.value.centerShapes
  const i = arr.indexOf(s)
  if (i === -1) arr.push(s)
  else arr.splice(i, 1)
}
function toggleCenterStoneSize(s: string) {
  const arr = appliedFilters.value.centerStoneSizes
  const i = arr.indexOf(s)
  if (i === -1) arr.push(s)
  else arr.splice(i, 1)
}
function onPriceMinInput() {
  if (appliedFilters.value.priceMin > appliedFilters.value.priceMax) appliedFilters.value.priceMax = appliedFilters.value.priceMin
}
function onPriceMaxInput() {
  if (appliedFilters.value.priceMax < appliedFilters.value.priceMin) appliedFilters.value.priceMin = appliedFilters.value.priceMax
}
const minPct = computed(() => maxPrice.value ? Math.min(100, (appliedFilters.value.priceMin / maxPrice.value) * 100) : 0)
const maxPct = computed(() => maxPrice.value ? Math.min(100, (appliedFilters.value.priceMax / maxPrice.value) * 100) : 100)
function formatPrice(val: number) {
  return '$' + val.toLocaleString('en-US')
}

function applyClientFilters() {
  let list = products.value
  if (activeTab.value === 'new') list = list.filter((p) => p.isNewArrival)
  else if (activeTab.value === 'bestseller') list = list.filter((p) => p.isBestSeller)
  const f = appliedFilters.value
  if (f.categories.length) list = list.filter((p) => f.categories.includes(p.category))
  if (f.materials.length) list = list.filter((p) => f.materials.includes(p.material))
  if (f.colors.length) list = list.filter((p) => f.colors.includes(p.color))
  if (f.priceMin > 0) list = list.filter((p) => p.priceValue >= f.priceMin)
  if (f.priceMax < maxPrice.value) list = list.filter((p) => p.priceValue <= f.priceMax)
  if (f.stoneTags?.length) list = list.filter((p) => f.stoneTags.some((tag) => p.stoneTags?.includes(tag)))
  if (f.subtypes?.length) list = list.filter((p) => f.subtypes.includes(p.subtype as ProductSubtype))
  if (f.centerShapes?.length) list = list.filter((p) => f.centerShapes.some((s) => p.customizationOptions?.centerShapes?.includes(s)))
  if (f.centerStoneSizes?.length) list = list.filter((p) => f.centerStoneSizes.some((s) => p.customizationOptions?.centerStoneSizes?.includes(s)))
  return list
}

async function loadFilteredProducts() {
  listLoading.value = true
  try {
    const res = await fetch(`${API_BASE}/api/products-filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tab: activeTab.value,
        filters: appliedFilters.value,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Failed to load filtered products.')
    let list = Array.isArray(data?.products) ? data.products : []
    const st = appliedFilters.value.stoneTags
    if (st?.length) {
      list = list.filter((p: any) => st.some((tag) => Array.isArray(p.stoneTags) && p.stoneTags.includes(tag)))
    }
    const subtypes = appliedFilters.value.subtypes
    if (subtypes?.length) {
      list = list.filter((p: any) => subtypes.includes(p.subtype))
    }
    const shapes = appliedFilters.value.centerShapes
    if (shapes?.length) {
      list = list.filter((p: any) => shapes.some((s) => Array.isArray(p.customizationOptions?.centerShapes) && p.customizationOptions.centerShapes.includes(s)))
    }
    const sizes = appliedFilters.value.centerStoneSizes
    if (sizes?.length) {
      list = list.filter((p: any) => sizes.some((s) => Array.isArray(p.customizationOptions?.centerStoneSizes) && p.customizationOptions.centerStoneSizes.includes(s)))
    }
    filteredProducts.value = list
  } catch (err) {
    console.error('Filter API error:', err)
    filteredProducts.value = applyClientFilters()
  } finally {
    listLoading.value = false
    firstLoadDone.value = true
  }
}

const activeFilterCount = computed(() => {
  const f = appliedFilters.value
  let count = 0
  // The locked category is page context, not a user-applied filter.
  if (f.categories.some((c) => c !== lockedCategory.value)) count++
  if (f.materials.length) count++
  if (f.colors.length) count++
  if (f.stoneTags?.length) count++
  if (f.subtypes?.length) count++
  if (f.centerShapes?.length) count++
  if (f.centerStoneSizes?.length) count++
  if (f.priceMin > 0 || f.priceMax < maxPrice.value) count++
  return count
})

watch([activeTab, appliedFilters], () => {
  if (!readyForFilterFetch.value) return
  void loadFilteredProducts()
}, { deep: true })
</script>

<template>
  <section id="collections" class="ect-px-6 ect-max-w-7xl ect-mx-auto ect-pb-16 sm:ect-pb-24" :class="hideHeader ? 'ect-pt-5' : 'ect-pt-16 sm:ect-pt-24'">
    <header v-if="!hideHeader" class="ect-flex ect-flex-col sm:ect-flex-row sm:ect-items-end sm:ect-justify-between ect-gap-2 ect-mb-8">
      <section>
        <p class="ect-inline-flex ect-items-center ect-gap-2.5 ect-font-body ect-text-[11px] ect-uppercase ect-tracking-[0.22em] ect-text-gold-700 ect-mb-3">
          <span class="ect-w-8 ect-h-px ect-bg-gold-400" />
          The Collection
        </p>
        <h2 class="ect-font-display ect-text-3xl sm:ect-text-[2.75rem] ect-font-light ect-leading-tight ect-text-charcoal">Discover Our Pieces</h2>
      </section>
    </header>

    <!-- Tabs + Filter (single line on mobile: All, New, Best, icon) -->
    <section class="ect-flex ect-items-center ect-justify-between ect-gap-2 ect-mb-7 ect-border-b ect-border-[#e6ddce] ect-min-w-0" :class="sidebar ? 'lg:ect-hidden' : ''">
      <!-- Filter: icon only on mobile -->
      <button
        type="button"
        @click="filterOpen = true"
        aria-label="Filter"
        class="ect-relative ect-shrink-0 ect-flex ect-items-center ect-justify-center ect-w-9 ect-h-9 sm:ect-w-auto sm:ect-h-auto sm:ect-gap-1.5 sm:ect-px-3 sm:ect-py-2 ect-mb-1 ect-rounded-full ect-border ect-transition-colors"
        :class="activeFilterCount > 0 ? 'ect-border-[#1f3f37] ect-text-[#1f3f37] ect-bg-white' : 'ect-border-[#d8ccb5] ect-text-charcoal/60 hover:ect-border-[#1f3f37]/60 hover:ect-text-charcoal'"
      >
        <svg class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
        <span class="ect-hidden sm:ect-inline ect-font-body ect-text-sm ect-font-medium">Filter</span>
        <span v-if="activeFilterCount > 0" class="ect-absolute -ect-top-0.5 -ect-right-0.5 sm:ect-static sm:ect-ml-0 ect-inline-flex ect-items-center ect-justify-center ect-min-w-[18px] ect-h-[18px] ect-rounded-full ect-bg-charcoal ect-text-white ect-text-[10px] ect-font-bold ect-px-1">{{ activeFilterCount }}</span>
      </button>

      <!-- Result count (right of the filter icon) -->
      <p class="ect-mb-1 ect-shrink-0 ect-font-body ect-text-xs ect-text-charcoal/40 ect-whitespace-nowrap">
        <template v-if="listLoading || productsLoading || !productsLoaded || !firstLoadDone">
          Loading pieces...
        </template>
        <template v-else>
          {{ filteredProducts.length }} {{ filteredProducts.length === 1 ? 'piece' : 'pieces' }} found
        </template>
      </p>

      <nav class="ect-flex ect-gap-0.5 sm:ect-gap-1 ect-min-w-0 ect-flex-1 ect-justify-end" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :aria-label="tab.label"
          :class="activeTab === tab.id ? 'ect-text-charcoal ect-border-[#1f3f37]' : 'ect-text-charcoal/50 hover:ect-text-charcoal ect-border-transparent'"
          class="ect-font-body ect-text-xs sm:ect-text-sm ect-font-medium ect-px-2 sm:ect-px-4 ect-py-3 ect--mb-px ect-border-b-2 ect-transition-colors ect-whitespace-nowrap"
          @click="switchTab(tab.id)"
        >
          <span v-if="tab.id === 'all'">{{ tab.label }}</span>
          <template v-else-if="tab.id === 'new'">
            <span class="sm:ect-hidden">New</span>
            <span class="ect-hidden sm:ect-inline">New Arrival</span>
          </template>
          <template v-else-if="tab.id === 'bestseller'">
            <span class="sm:ect-hidden">Best</span>
            <span class="ect-hidden sm:ect-inline">Best Seller</span>
          </template>
        </button>
      </nav>
    </section>

    <!-- Two-column layout (persistent sidebar on desktop) -->
    <div :class="sidebar ? 'lg:ect-flex lg:ect-items-start lg:ect-gap-10' : ''">

      <!-- Desktop filter sidebar -->
      <aside v-if="sidebar" class="ect-hidden lg:ect-block lg:ect-w-56 lg:ect-shrink-0 lg:ect-sticky lg:ect-top-28 lg:ect-self-start lg:ect-max-h-[calc(100vh-8rem)] lg:ect-overflow-y-auto lg:ect-pr-2 ect-no-scrollbar">
        <!-- Category -->
        <section v-if="!lockedCategory" class="ect-mb-6">
          <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-[#8a8172] ect-mb-3.5">Category</h3>
          <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-3">
            <li v-for="cat in CATEGORIES" :key="cat">
              <label class="ect-flex ect-items-center ect-gap-2.5 ect-cursor-pointer ect-group">
                <input type="checkbox" class="ect-sr-only" :checked="appliedFilters.categories.includes(cat)" @change="toggleCategory(cat)" />
                <span class="ect-w-[18px] ect-h-[18px] ect-rounded ect-border ect-flex ect-items-center ect-justify-center ect-transition-colors" :class="appliedFilters.categories.includes(cat) ? 'ect-bg-[#1f3f37] ect-border-[#1f3f37]' : 'ect-border-[#d8ccb5] group-hover:ect-border-[#1f3f37]/60'">
                  <svg v-if="appliedFilters.categories.includes(cat)" class="ect-w-3 ect-h-3 ect-text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                <span class="ect-font-body ect-text-sm ect-text-charcoal/80 group-hover:ect-text-charcoal ect-transition-colors">{{ cat }}</span>
              </label>
            </li>
          </ul>
        </section>
        <hr v-if="!lockedCategory" class="ect-border-[#e6ddce] ect-mb-6" />

        <!-- Price -->
        <section class="ect-mb-6">
          <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-[#8a8172] ect-mb-3.5">Price</h3>
          <div class="jewelet-range">
            <span class="jewelet-range__track"></span>
            <span class="jewelet-range__fill" :style="{ left: minPct + '%', right: (100 - maxPct) + '%' }"></span>
            <input type="range" :min="0" :max="maxPrice" step="50" v-model.number="appliedFilters.priceMin" @input="onPriceMinInput" aria-label="Minimum price" />
            <input type="range" :min="0" :max="maxPrice" step="50" v-model.number="appliedFilters.priceMax" @input="onPriceMaxInput" aria-label="Maximum price" />
          </div>
          <div class="ect-flex ect-justify-between ect-mt-2.5 ect-font-body ect-text-xs ect-text-charcoal/55">
            <span>{{ formatPrice(appliedFilters.priceMin) }}</span>
            <span>{{ formatPrice(appliedFilters.priceMax) }}{{ appliedFilters.priceMax >= maxPrice ? '+' : '' }}</span>
          </div>
        </section>
        <hr class="ect-border-[#e6ddce] ect-mb-6" />

        <!-- Material -->
        <section class="ect-mb-6">
          <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-[#8a8172] ect-mb-3.5">Material</h3>
          <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-3">
            <li v-for="m in materialOptions" :key="m.id">
              <label class="ect-flex ect-items-center ect-gap-2.5 ect-cursor-pointer ect-group">
                <input type="checkbox" class="ect-sr-only" :checked="appliedFilters.materials.includes(m.id)" @change="toggleMaterial(m.id)" />
                <span class="ect-w-[18px] ect-h-[18px] ect-rounded ect-border ect-flex ect-items-center ect-justify-center ect-transition-colors" :class="appliedFilters.materials.includes(m.id) ? 'ect-bg-[#1f3f37] ect-border-[#1f3f37]' : 'ect-border-[#d8ccb5] group-hover:ect-border-[#1f3f37]/60'">
                  <svg v-if="appliedFilters.materials.includes(m.id)" class="ect-w-3 ect-h-3 ect-text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                <span class="ect-font-body ect-text-sm ect-text-charcoal/80 group-hover:ect-text-charcoal ect-transition-colors">{{ m.label }}</span>
              </label>
            </li>
          </ul>
        </section>
        <hr class="ect-border-[#e6ddce] ect-mb-6" />

        <!-- Stone Type -->
        <section>
          <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-[#8a8172] ect-mb-3.5">Stone</h3>
          <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-3">
            <li v-for="stone in STONE_TYPE_OPTIONS" :key="stone.id">
              <label class="ect-flex ect-items-center ect-gap-2.5 ect-cursor-pointer ect-group">
                <input type="checkbox" class="ect-sr-only" :checked="appliedFilters.stoneTags.includes(stone.id)" @change="toggleStoneTag(stone.id)" />
                <span class="ect-w-[18px] ect-h-[18px] ect-rounded ect-border ect-flex ect-items-center ect-justify-center ect-transition-colors" :class="appliedFilters.stoneTags.includes(stone.id) ? 'ect-bg-[#1f3f37] ect-border-[#1f3f37]' : 'ect-border-[#d8ccb5] group-hover:ect-border-[#1f3f37]/60'">
                  <svg v-if="appliedFilters.stoneTags.includes(stone.id)" class="ect-w-3 ect-h-3 ect-text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                <span class="ect-font-body ect-text-sm ect-text-charcoal/80 group-hover:ect-text-charcoal ect-transition-colors">{{ stone.label }}</span>
              </label>
            </li>
          </ul>
        </section>
        <hr class="ect-border-[#e6ddce] ect-my-6" />

        <!-- Color -->
        <section>
          <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-[#8a8172] ect-mb-3.5">Color</h3>
          <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-3">
            <li v-for="c in COLORS" :key="c.id">
              <label class="ect-flex ect-items-center ect-gap-2.5 ect-cursor-pointer ect-group">
                <input type="checkbox" class="ect-sr-only" :checked="appliedFilters.colors.includes(c.id)" @change="toggleColor(c.id)" />
                <span class="ect-w-[18px] ect-h-[18px] ect-rounded ect-border ect-flex ect-items-center ect-justify-center ect-transition-colors" :class="appliedFilters.colors.includes(c.id) ? 'ect-bg-[#1f3f37] ect-border-[#1f3f37]' : 'ect-border-[#d8ccb5] group-hover:ect-border-[#1f3f37]/60'">
                  <svg v-if="appliedFilters.colors.includes(c.id)" class="ect-w-3 ect-h-3 ect-text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                <span class="ect-w-3.5 ect-h-3.5 ect-rounded-full ect-ring-1 ect-ring-charcoal/15 ect-shrink-0" :style="{ backgroundColor: c.hex }" />
                <span class="ect-font-body ect-text-sm ect-text-charcoal/80 group-hover:ect-text-charcoal ect-transition-colors">{{ c.label }}</span>
              </label>
            </li>
          </ul>
        </section>
        <hr class="ect-border-[#e6ddce] ect-my-6" />

        <!-- Stone Shape -->
        <section>
          <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-[#8a8172] ect-mb-3.5">Stone Shape</h3>
          <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-3">
            <li v-for="shape in CENTER_SHAPE_OPTIONS" :key="shape">
              <label class="ect-flex ect-items-center ect-gap-2.5 ect-cursor-pointer ect-group">
                <input type="checkbox" class="ect-sr-only" :checked="appliedFilters.centerShapes.includes(shape)" @change="toggleCenterShape(shape)" />
                <span class="ect-w-[18px] ect-h-[18px] ect-rounded ect-border ect-flex ect-items-center ect-justify-center ect-transition-colors" :class="appliedFilters.centerShapes.includes(shape) ? 'ect-bg-[#1f3f37] ect-border-[#1f3f37]' : 'ect-border-[#d8ccb5] group-hover:ect-border-[#1f3f37]/60'">
                  <svg v-if="appliedFilters.centerShapes.includes(shape)" class="ect-w-3 ect-h-3 ect-text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                <span class="ect-font-body ect-text-sm ect-text-charcoal/80 group-hover:ect-text-charcoal ect-transition-colors">{{ shape }}</span>
              </label>
            </li>
          </ul>
        </section>
        <hr class="ect-border-[#e6ddce] ect-my-6" />

        <!-- Stone Size -->
        <section>
          <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-[#8a8172] ect-mb-3.5">Stone Size</h3>
          <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-3">
            <li v-for="size in CENTER_STONE_SIZE_OPTIONS" :key="size">
              <label class="ect-flex ect-items-center ect-gap-2.5 ect-cursor-pointer ect-group">
                <input type="checkbox" class="ect-sr-only" :checked="appliedFilters.centerStoneSizes.includes(size)" @change="toggleCenterStoneSize(size)" />
                <span class="ect-w-[18px] ect-h-[18px] ect-rounded ect-border ect-flex ect-items-center ect-justify-center ect-transition-colors" :class="appliedFilters.centerStoneSizes.includes(size) ? 'ect-bg-[#1f3f37] ect-border-[#1f3f37]' : 'ect-border-[#d8ccb5] group-hover:ect-border-[#1f3f37]/60'">
                  <svg v-if="appliedFilters.centerStoneSizes.includes(size)" class="ect-w-3 ect-h-3 ect-text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                <span class="ect-font-body ect-text-sm ect-text-charcoal/80 group-hover:ect-text-charcoal ect-transition-colors">{{ size }}</span>
              </label>
            </li>
          </ul>
        </section>
      </aside>

      <!-- Main column -->
      <div class="ect-flex-1 ect-min-w-0">

        <!-- Desktop count + sort bar -->
        <div v-if="sidebar" class="ect-hidden lg:ect-flex ect-items-center ect-justify-between ect-mb-7">
          <p class="ect-font-body ect-text-sm ect-text-charcoal/55">
            <template v-if="listLoading || productsLoading || !productsLoaded || !firstLoadDone">Loading pieces…</template>
            <template v-else>{{ filteredProducts.length }} {{ filteredProducts.length === 1 ? 'piece' : 'pieces' }}</template>
          </p>
          <div class="ect-relative">
            <button
              type="button"
              @click="sortOpen = !sortOpen"
              class="ect-flex ect-items-center ect-gap-2.5 ect-px-4 ect-py-2.5 ect-rounded-full ect-border ect-border-[#d8ccb5] ect-bg-white ect-font-body ect-text-sm ect-text-charcoal hover:ect-border-[#1f3f37]/60 ect-transition-colors"
              :aria-expanded="sortOpen"
            >
              <span>Sort: {{ sortLabel }}</span>
              <svg class="ect-w-4 ect-h-4 ect-text-charcoal/40 ect-transition-transform" :class="sortOpen ? 'ect-rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <span v-if="sortOpen" @click="sortOpen = false" class="ect-fixed ect-inset-0 ect-z-10"></span>
            <div v-if="sortOpen" class="ect-absolute ect-right-0 ect-top-full ect-mt-2 ect-w-52 ect-z-20 ect-rounded-lg ect-border ect-border-[#ece4d5] ect-bg-white ect-shadow-luxe-sm ect-py-1.5 ect-overflow-hidden">
              <button
                v-for="opt in SORT_OPTIONS"
                :key="opt.id"
                type="button"
                @click="selectSort(opt.id)"
                class="ect-w-full ect-text-left ect-px-4 ect-py-2 ect-font-body ect-text-sm hover:ect-bg-champagne ect-transition-colors"
                :class="sortBy === opt.id ? 'ect-text-[#1f3f37] ect-font-semibold' : 'ect-text-charcoal/80'"
              >{{ opt.label }}</button>
            </div>
          </div>
        </div>

    <!-- Active filter chips -->
    <section v-if="activeFilterCount > 0" class="ect-flex ect-flex-wrap ect-gap-2 ect-mb-6" :class="sidebar ? 'lg:ect-hidden' : ''">
      <span v-for="cat in appliedFilters.categories.filter(c => c !== lockedCategory)" :key="cat" class="ect-inline-flex ect-items-center ect-gap-1 ect-px-3 ect-py-1 ect-rounded-full ect-bg-charcoal/10 ect-text-charcoal ect-font-body ect-text-xs ect-font-medium">
        {{ cat }}
        <button type="button" @click="appliedFilters.categories = appliedFilters.categories.filter(c => c !== cat)" class="hover:ect-text-charcoal/70">×</button>
      </span>
      <span v-for="m in appliedFilters.materials" :key="m" class="ect-inline-flex ect-items-center ect-gap-1 ect-px-3 ect-py-1 ect-rounded-full ect-bg-charcoal/10 ect-text-charcoal ect-font-body ect-text-xs ect-font-medium ect-capitalize">
        {{ m }}
        <button type="button" @click="appliedFilters.materials = appliedFilters.materials.filter(v => v !== m)" class="hover:ect-text-charcoal/70">×</button>
      </span>
      <span v-for="c in appliedFilters.colors" :key="c" class="ect-inline-flex ect-items-center ect-gap-1 ect-px-3 ect-py-1 ect-rounded-full ect-bg-charcoal/10 ect-text-charcoal ect-font-body ect-text-xs ect-font-medium ect-capitalize">
        {{ c }}
        <button type="button" @click="appliedFilters.colors = appliedFilters.colors.filter(v => v !== c)" class="hover:ect-text-charcoal/70">×</button>
      </span>
      <span v-for="tag in appliedFilters.stoneTags" :key="tag" class="ect-inline-flex ect-items-center ect-gap-1 ect-px-3 ect-py-1 ect-rounded-full ect-bg-charcoal/10 ect-text-charcoal ect-font-body ect-text-xs ect-font-medium ect-capitalize">
        {{ tag }}
        <button type="button" @click="appliedFilters.stoneTags = appliedFilters.stoneTags.filter(t => t !== tag)" class="hover:ect-text-charcoal/70">×</button>
      </span>
      <span v-for="subtype in appliedFilters.subtypes" :key="subtype" class="ect-inline-flex ect-items-center ect-gap-1 ect-px-3 ect-py-1 ect-rounded-full ect-bg-charcoal/10 ect-text-charcoal ect-font-body ect-text-xs ect-font-medium ect-capitalize">
        {{ subtype.replace('-', ' ') }}
        <button type="button" @click="appliedFilters.subtypes = appliedFilters.subtypes.filter(t => t !== subtype)" class="hover:ect-text-charcoal/70">×</button>
      </span>
      <span v-for="shape in appliedFilters.centerShapes" :key="'shape-'+shape" class="ect-inline-flex ect-items-center ect-gap-1 ect-px-3 ect-py-1 ect-rounded-full ect-bg-charcoal/10 ect-text-charcoal ect-font-body ect-text-xs ect-font-medium">
        {{ shape }}
        <button type="button" @click="appliedFilters.centerShapes = appliedFilters.centerShapes.filter(s => s !== shape)" class="hover:ect-text-charcoal/70">×</button>
      </span>
      <span v-for="size in appliedFilters.centerStoneSizes" :key="'size-'+size" class="ect-inline-flex ect-items-center ect-gap-1 ect-px-3 ect-py-1 ect-rounded-full ect-bg-charcoal/10 ect-text-charcoal ect-font-body ect-text-xs ect-font-medium">
        {{ size }}
        <button type="button" @click="appliedFilters.centerStoneSizes = appliedFilters.centerStoneSizes.filter(s => s !== size)" class="hover:ect-text-charcoal/70">×</button>
      </span>
      <span v-if="appliedFilters.priceMin > 0 || appliedFilters.priceMax < maxPrice" class="ect-inline-flex ect-items-center ect-gap-1 ect-px-3 ect-py-1 ect-rounded-full ect-bg-charcoal/10 ect-text-charcoal ect-font-body ect-text-xs ect-font-medium">
        ${{ appliedFilters.priceMin.toLocaleString('en-US') }} – ${{ appliedFilters.priceMax.toLocaleString('en-US') }}
        <button type="button" @click="appliedFilters.priceMin = 0; appliedFilters.priceMax = maxPrice" class="hover:ect-text-charcoal/70">×</button>
      </span>
    </section>

    <!-- Product skeleton -->
    <ul v-if="listLoading || !firstLoadDone" class="ect-grid ect-grid-cols-2 ect-gap-4 sm:ect-gap-[22px] ect-list-none ect-m-0 ect-p-0" :class="sidebar ? 'lg:ect-grid-cols-3' : 'lg:ect-grid-cols-4'">
      <li v-for="n in 8" :key="`skeleton-${n}`" class="ect-animate-pulse">
        <section class="ect-aspect-square ect-rounded-t-lg ect-bg-[#efe7d6]" />
        <section class="ect-rounded-b-lg ect-border ect-border-t-0 ect-border-[#ece4d5] ect-bg-white ect-p-4">
          <section class="ect-h-3 ect-w-1/3 ect-rounded ect-bg-[#e6ddce] ect-mb-3" />
          <section class="ect-h-4 ect-w-3/4 ect-rounded ect-bg-[#e6ddce] ect-mb-3" />
          <section class="ect-h-5 ect-w-1/2 ect-rounded ect-bg-[#e6ddce]" />
        </section>
      </li>
    </ul>

    <!-- Product grid -->
    <ul v-else-if="displayedProducts.length" class="ect-grid ect-grid-cols-2 ect-gap-4 sm:ect-gap-[22px] ect-list-none ect-m-0 ect-p-0" :class="sidebar ? 'lg:ect-grid-cols-3' : 'lg:ect-grid-cols-4'">
      <li v-for="piece in displayedProducts" :key="piece.slug" class="ect-h-full">
        <ProductCard :slug="piece.slug" :title="piece.title" :category="piece.category" :material="piece.material" :price="piece.price" :images="piece.images" :product="piece" />
      </li>
    </ul>

    <!-- Empty state -->
    <section v-else class="ect-flex ect-flex-col ect-items-center ect-py-24 ect-text-center">
      <span class="ect-w-16 ect-h-16 ect-rounded-full ect-bg-champagne ect-flex ect-items-center ect-justify-center ect-mb-4">
        <svg class="ect-w-7 ect-h-7 ect-text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
      </span>
      <p class="ect-font-display ect-text-lg ect-font-light ect-text-charcoal ect-mb-1">No pieces match your filters</p>
      <p class="ect-font-body ect-text-sm ect-text-charcoal/50 ect-mb-5">Try adjusting or clearing your filters to see more.</p>
      <button
        type="button"
        @click="appliedFilters = { categories: lockedCategory ? [lockedCategory] : [], materials: [], colors: [], priceMin: 0, priceMax: maxPrice, stoneTags: [], subtypes: [], centerShapes: [], centerStoneSizes: [] }"
        class="ect-inline-flex ect-items-center ect-gap-1.5 ect-px-5 ect-py-2.5 ect-rounded-full ect-bg-charcoal ect-text-white ect-font-body ect-text-sm ect-font-semibold hover:ect-bg-noir ect-transition-colors"
      >
        Clear all filters
      </button>
    </section>

      </div>
    </div>
  </section>

  <FilterModal
    v-model="filterOpen"
    :initial="appliedFilters"
    :max-price="maxPrice"
    :products="products"
    :locked-category="lockedCategory"
    @apply="(f) => appliedFilters = { ...f, subtypes: appliedFilters.subtypes }"
  />
</template>

<style scoped>
.ect-no-scrollbar::-webkit-scrollbar { display: none; }
.ect-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.jewelet-range {
  position: relative;
  height: 22px;
}
.jewelet-range__track,
.jewelet-range__fill {
  position: absolute;
  top: 9px;
  height: 3px;
  border-radius: 3px;
}
.jewelet-range__track {
  left: 0;
  right: 0;
  background: #e6ddce;
}
.jewelet-range__fill {
  background: #1f3f37;
}
.jewelet-range input[type='range'] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 22px;
  margin: 0;
  background: transparent;
  pointer-events: none;
  -webkit-appearance: none;
  appearance: none;
}
.jewelet-range input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  pointer-events: auto;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #1f3f37;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}
.jewelet-range input[type='range']::-moz-range-thumb {
  pointer-events: auto;
  width: 18px;
  height: 18px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #1f3f37;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}
.jewelet-range input[type='range']:focus-visible::-webkit-slider-thumb {
  outline: 2px solid #1f3f37;
  outline-offset: 2px;
}
</style>
