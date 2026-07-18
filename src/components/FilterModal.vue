<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { CATEGORIES, CENTER_SHAPE_OPTIONS, CENTER_STONE_SIZE_OPTIONS, COLORS, STONE_TYPE_OPTIONS, type Category, type Material, type Color } from '../data/products'

interface Filters {
  categories: Category[]
  materials: Material[]
  colors: Color[]
  priceMin: number
  priceMax: number
  stoneTags: string[]
  centerShapes: string[]
  centerStoneSizes: string[]
}

const props = defineProps<{
  modelValue: boolean
  initial: Filters
  maxPrice: number
  products?: any[]
  // Set when the page locks a single category (e.g. the Rings collection);
  // the Category section is hidden and the locked category is always kept.
  lockedCategory?: Category | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'apply', filters: Filters): void
}>()

const local = ref<Filters>({ ...props.initial, categories: [...props.initial.categories], materials: [...props.initial.materials], colors: [...props.initial.colors], stoneTags: [...(props.initial.stoneTags || [])], centerShapes: [...(props.initial.centerShapes || [])], centerStoneSizes: [...(props.initial.centerStoneSizes || [])] })

watch(() => props.modelValue, (open) => {
  if (open) {
    local.value = {
      ...props.initial,
      categories: [...props.initial.categories],
      materials: [...props.initial.materials],
      colors: [...props.initial.colors],
      stoneTags: [...(props.initial.stoneTags || [])],
      centerShapes: [...(props.initial.centerShapes || [])],
      centerStoneSizes: [...(props.initial.centerStoneSizes || [])],
    }
  }
})

const activeCount = computed(() => {
  let count = 0
  if (!props.lockedCategory && local.value.categories.length) count++
  if (local.value.materials.length) count++
  if (local.value.colors.length) count++
  if (local.value.priceMin > 0 || local.value.priceMax < props.maxPrice) count++
  if (local.value.stoneTags.length) count++
  if (local.value.centerShapes.length) count++
  if (local.value.centerStoneSizes.length) count++
  return count
})

// Live preview of how many pieces match the current (unapplied) selection.
const previewCount = computed(() => {
  const list = props.products
  if (!Array.isArray(list) || !list.length) return null
  const f = local.value
  return list.filter((p) => {
    if (f.categories.length && !f.categories.includes(p.category)) return false
    if (f.materials.length && !f.materials.includes(p.material)) return false
    if (f.colors.length && !f.colors.includes(p.color)) return false
    if (f.priceMin > 0 && p.priceValue < f.priceMin) return false
    if (f.priceMax < props.maxPrice && p.priceValue > f.priceMax) return false
    if (f.stoneTags.length && !f.stoneTags.some((t) => Array.isArray(p.stoneTags) && p.stoneTags.includes(t))) return false
    if (f.centerShapes.length && !f.centerShapes.some((s) => p.customizationOptions?.centerShapes?.includes(s))) return false
    if (f.centerStoneSizes.length && !f.centerStoneSizes.some((s) => p.customizationOptions?.centerStoneSizes?.includes(s))) return false
    return true
  }).length
})

function toggleCategory(cat: Category) {
  const idx = local.value.categories.indexOf(cat)
  if (idx === -1) local.value.categories.push(cat)
  else local.value.categories.splice(idx, 1)
}

function toggleMaterial(m: Material) {
  const idx = local.value.materials.indexOf(m)
  if (idx === -1) local.value.materials.push(m)
  else local.value.materials.splice(idx, 1)
}

function toggleColor(c: Color) {
  const idx = local.value.colors.indexOf(c)
  if (idx === -1) local.value.colors.push(c)
  else local.value.colors.splice(idx, 1)
}

function toggleStoneType(s: string) {
  const idx = local.value.stoneTags.indexOf(s)
  if (idx === -1) local.value.stoneTags.push(s)
  else local.value.stoneTags.splice(idx, 1)
}

function toggleCenterShape(s: string) {
  const idx = local.value.centerShapes.indexOf(s)
  if (idx === -1) local.value.centerShapes.push(s)
  else local.value.centerShapes.splice(idx, 1)
}

function toggleCenterStoneSize(s: string) {
  const idx = local.value.centerStoneSizes.indexOf(s)
  if (idx === -1) local.value.centerStoneSizes.push(s)
  else local.value.centerStoneSizes.splice(idx, 1)
}

// Faceted counts: how many products match every active facet EXCEPT the named
// one, so each pill can show the count it would yield if chosen.
function baseMatch(p: any, exclude: string) {
  const f = local.value
  if (exclude !== 'category' && f.categories.length && !f.categories.includes(p.category)) return false
  if (exclude !== 'material' && f.materials.length && !f.materials.includes(p.material)) return false
  if (exclude !== 'color' && f.colors.length && !f.colors.includes(p.color)) return false
  if (f.priceMin > 0 && p.priceValue < f.priceMin) return false
  if (f.priceMax < props.maxPrice && p.priceValue > f.priceMax) return false
  if (exclude !== 'stone' && f.stoneTags.length && !f.stoneTags.some((t) => Array.isArray(p.stoneTags) && p.stoneTags.includes(t))) return false
  if (exclude !== 'shape' && f.centerShapes.length && !f.centerShapes.some((s) => p.customizationOptions?.centerShapes?.includes(s))) return false
  if (exclude !== 'size' && f.centerStoneSizes.length && !f.centerStoneSizes.some((s) => p.customizationOptions?.centerStoneSizes?.includes(s))) return false
  return true
}

function countFor(facet: string, predicate: (p: any) => boolean) {
  const list = props.products
  if (!Array.isArray(list)) return 0
  return list.filter((p) => baseMatch(p, facet) && predicate(p)).length
}

const categoryCount = (cat: Category) => countFor('category', (p) => p.category === cat)
const materialCount = (m: Material) => countFor('material', (p) => p.material === m)
const stoneCount = (id: string) => countFor('stone', (p) => Array.isArray(p.stoneTags) && p.stoneTags.includes(id))
const shapeCount = (s: string) => countFor('shape', (p) => p.customizationOptions?.centerShapes?.includes(s))
const sizeCount = (s: string) => countFor('size', (p) => p.customizationOptions?.centerStoneSizes?.includes(s))

// Applied selections rendered as removable chips at the top of the panel.
const priceActive = computed(() => local.value.priceMin > 0 || local.value.priceMax < props.maxPrice)
const activeChips = computed(() => {
  const chips: { key: string; label: string; remove: () => void }[] = []
  local.value.materials.forEach((m) => chips.push({ key: `mat-${m}`, label: m.charAt(0).toUpperCase() + m.slice(1), remove: () => toggleMaterial(m) }))
  local.value.stoneTags.forEach((id) => {
    const opt = STONE_TYPE_OPTIONS.find((o) => o.id === id)
    chips.push({ key: `stone-${id}`, label: opt ? opt.label : id, remove: () => toggleStoneType(id) })
  })
  if (!props.lockedCategory) {
    local.value.categories.forEach((c) => chips.push({ key: `cat-${c}`, label: c, remove: () => toggleCategory(c) }))
  }
  local.value.colors.forEach((c) => {
    const opt = COLORS.find((o) => o.id === c)
    chips.push({ key: `color-${c}`, label: opt ? (opt.label.split(' ')[0] ?? opt.label) : c, remove: () => toggleColor(c) })
  })
  local.value.centerShapes.forEach((s) => chips.push({ key: `shape-${s}`, label: s, remove: () => toggleCenterShape(s) }))
  local.value.centerStoneSizes.forEach((s) => chips.push({ key: `size-${s}`, label: s, remove: () => toggleCenterStoneSize(s) }))
  if (priceActive.value) chips.push({ key: 'price', label: `${formatPrice(local.value.priceMin)} – ${formatPrice(local.value.priceMax)}${local.value.priceMax >= props.maxPrice ? '+' : ''}`, remove: resetPrice })
  return chips
})

function resetPrice() {
  local.value.priceMin = 0
  local.value.priceMax = props.maxPrice
}

// Keep the price range coherent: min must never exceed max and vice versa.
function onPriceMinChange() {
  if (local.value.priceMin > local.value.priceMax) local.value.priceMax = local.value.priceMin
}
function onPriceMaxChange() {
  if (local.value.priceMax < local.value.priceMin) local.value.priceMin = local.value.priceMax
}

function clear() {
  local.value = { categories: props.lockedCategory ? [props.lockedCategory] : [], materials: [], colors: [], priceMin: 0, priceMax: props.maxPrice, stoneTags: [], centerShapes: [], centerStoneSizes: [] }
}

// Collapsible sections (header toggles content visibility).
const stoneTypeOpen = ref(true)
const stoneShapeOpen = ref(false)
const stoneSizeOpen = ref(false)

// Price slider: gold fill geometry between the two handles.
const minPct = computed(() => props.maxPrice ? Math.min(100, (local.value.priceMin / props.maxPrice) * 100) : 0)
const maxPct = computed(() => props.maxPrice ? Math.min(100, (local.value.priceMax / props.maxPrice) * 100) : 100)

function apply() {
  emit('apply', { ...local.value, categories: [...local.value.categories], materials: [...local.value.materials], colors: [...local.value.colors], stoneTags: [...local.value.stoneTags], centerShapes: [...local.value.centerShapes], centerStoneSizes: [...local.value.centerStoneSizes] })
  emit('update:modelValue', false)
}

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) close()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

function formatPrice(val: number) {
  return '$' + val.toLocaleString('en-US')
}
</script>

<template>
  <Transition
    enter-active-class="ect-transition ect-duration-200 ect-ease-out"
    enter-from-class="ect-opacity-0"
    enter-to-class="ect-opacity-100"
    leave-active-class="ect-transition ect-duration-150 ect-ease-in"
    leave-from-class="ect-opacity-100"
    leave-to-class="ect-opacity-0"
  >
    <section v-if="modelValue" class="ect-fixed ect-inset-0 ect-z-50 ect-flex ect-items-stretch ect-justify-start" role="dialog" aria-modal="true" aria-label="Filters">
      <!-- Backdrop -->
      <span class="ect-absolute ect-inset-0 ect-bg-charcoal/40 ect-backdrop-blur-sm" @click="close" />

      <!-- Panel (slides in from the left) -->
      <Transition
        enter-active-class="ect-transition ect-duration-300 ect-ease-out"
        enter-from-class="-ect-translate-x-full"
        enter-to-class="ect-translate-x-0"
        leave-active-class="ect-transition ect-duration-200 ect-ease-in"
        leave-from-class="ect-translate-x-0"
        leave-to-class="-ect-translate-x-full"
      >
        <article v-if="modelValue" class="ect-relative ect-w-[95%] ect-max-w-md ect-h-full ect-bg-cream ect-rounded-r-3xl ect-shadow-2xl ect-overflow-y-auto">
          <!-- Header -->
          <header class="ect-px-6 ect-pt-3 ect-pb-3 ect-border-b ect-border-sand ect-sticky ect-top-0 ect-bg-cream ect-z-10">
            <section class="ect-flex ect-items-start ect-justify-between">
              <div>
                <h2 class="ect-font-display ect-text-2xl ect-font-medium ect-text-charcoal ect-leading-none">Filters</h2>
                <p v-if="previewCount !== null" class="ect-font-body ect-text-xs ect-text-charcoal/50 ect-mt-1.5">{{ previewCount }} {{ previewCount === 1 ? 'piece' : 'pieces' }} match</p>
              </div>
              <button type="button" @click="close" class="ect-text-charcoal/70 hover:ect-text-charcoal ect-transition-colors -ect-mt-0.5" aria-label="Close">
                <svg class="ect-w-6 ect-h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </section>

            <!-- Active filter chips -->
            <section v-if="activeChips.length" class="ect-flex ect-items-center ect-gap-2 ect-flex-wrap ect-mt-3">
              <button
                v-for="chip in activeChips"
                :key="chip.key"
                type="button"
                @click="chip.remove()"
                class="ect-group ect-inline-flex ect-items-center ect-gap-1.5 ect-pl-3 ect-pr-2 ect-py-1.5 ect-bg-gold-50 ect-text-gold-700 ect-border ect-border-gold-400/50 ect-rounded-full ect-font-body ect-text-xs ect-font-medium ect-transition-colors hover:ect-bg-gold-100"
              >
                {{ chip.label }}
                <svg class="ect-w-3 ect-h-3 ect-text-gold-700/70 group-hover:ect-text-gold-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button type="button" @click="clear" class="ect-font-body ect-text-xs ect-font-medium ect-text-gold-700 hover:ect-text-gold-800 ect-underline ect-underline-offset-2 ect-ml-1 ect-transition-colors">Clear all</button>
            </section>
          </header>

          <section class="ect-px-6 ect-py-4 ect-space-y-4">
            <!-- Material -->
            <section>
              <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-widest ect-text-charcoal/50 ect-mb-2">Material</h3>
              <section class="ect-flex ect-gap-2.5 ect-flex-wrap">
                <button
                  v-for="m in (['gold', 'silver'] as Material[])"
                  :key="m"
                  type="button"
                  :aria-pressed="local.materials.includes(m)"
                  :class="local.materials.includes(m) ? 'ect-bg-rose-500 ect-text-white ect-border-rose-500' : 'ect-bg-champagne ect-text-charcoal ect-border-transparent hover:ect-bg-sand'"
                  class="ect-inline-flex ect-items-center ect-gap-1.5 ect-font-body ect-text-sm ect-font-medium ect-px-5 ect-py-2.5 ect-rounded-full ect-border ect-capitalize ect-transition-colors"
                  @click="toggleMaterial(m)"
                >
                  {{ m }}
                  <span class="ect-text-xs" :class="local.materials.includes(m) ? 'ect-text-white/60' : 'ect-text-charcoal/40'">{{ materialCount(m) }}</span>
                </button>
              </section>
            </section>

            <hr class="ect-border-sand" />

            <!-- Stone Type -->
            <section>
              <button
                type="button"
                class="ect-w-full ect-flex ect-items-center ect-justify-between ect-mb-2"
                :aria-expanded="stoneTypeOpen"
                @click="stoneTypeOpen = !stoneTypeOpen"
              >
                <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-widest ect-text-charcoal/50">Stone Type</h3>
                <span class="ect-flex ect-items-center ect-gap-2">
                  <span v-if="local.stoneTags.length" class="ect-font-body ect-text-xs ect-font-medium ect-text-charcoal/70">{{ local.stoneTags.length }} selected</span>
                  <svg class="ect-w-4 ect-h-4 ect-text-charcoal/40 ect-transition-transform" :class="stoneTypeOpen ? 'ect-rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              <section v-show="stoneTypeOpen" class="ect-flex ect-gap-2.5 ect-flex-wrap">
                <button
                  v-for="stone in STONE_TYPE_OPTIONS"
                  :key="stone.id"
                  type="button"
                  :aria-pressed="local.stoneTags.includes(stone.id)"
                  :class="local.stoneTags.includes(stone.id) ? 'ect-bg-gold-50 ect-text-gold-700 ect-border-gold-400' : 'ect-border-sand ect-text-charcoal/80 hover:ect-border-gold-400/60'"
                  class="ect-inline-flex ect-items-center ect-gap-1.5 ect-font-body ect-text-sm ect-font-medium ect-px-5 ect-py-2.5 ect-rounded-full ect-border ect-transition-colors"
                  @click="toggleStoneType(stone.id)"
                >
                  {{ stone.label }}
                  <span class="ect-text-xs" :class="local.stoneTags.includes(stone.id) ? 'ect-text-gold-700/60' : 'ect-text-charcoal/40'">{{ stoneCount(stone.id) }}</span>
                </button>
              </section>
            </section>

            <hr class="ect-border-sand" />

            <!-- Category (logic unchanged; pills wrap onto multiple lines).
                 Hidden when the page locks a single category. -->
            <template v-if="!lockedCategory">
              <section>
                <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-widest ect-text-charcoal/50 ect-mb-2">Category</h3>
                <section class="ect-flex ect-flex-wrap ect-gap-2">
                  <button
                    v-for="cat in CATEGORIES"
                    :key="cat"
                    type="button"
                    :aria-pressed="local.categories.includes(cat)"
                    :class="local.categories.includes(cat) ? 'ect-bg-gold-50 ect-text-gold-700 ect-border-gold-400' : 'ect-border-sand ect-text-charcoal/80 hover:ect-border-gold-400/60'"
                    class="ect-flex-none ect-inline-flex ect-items-center ect-gap-1.5 ect-font-body ect-text-[13px] ect-font-medium ect-px-3 ect-py-2.5 ect-rounded-full ect-border ect-whitespace-nowrap ect-transition-colors"
                    @click="toggleCategory(cat)"
                  >
                    {{ cat }}
                    <span class="ect-text-xs" :class="local.categories.includes(cat) ? 'ect-text-gold-700/60' : 'ect-text-charcoal/40'">{{ categoryCount(cat) }}</span>
                  </button>
                </section>
              </section>

              <hr class="ect-border-sand" />
            </template>

            <!-- Price Range -->
            <section>
              <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-widest ect-text-charcoal/50 ect-mb-2">Price Range</h3>
              <section>
                <!-- MIN / MAX value boxes -->
                <section class="ect-flex ect-items-stretch ect-gap-3 ect-mb-4">
                  <div class="ect-flex-1 ect-bg-white ect-border ect-border-sand ect-rounded-xl ect-px-4 ect-py-2.5">
                    <span class="ect-font-body ect-text-[10px] ect-font-semibold ect-uppercase ect-tracking-widest ect-text-charcoal/40 ect-block">Min</span>
                    <span class="ect-font-body ect-text-base ect-font-medium ect-text-charcoal">{{ formatPrice(local.priceMin) }}</span>
                  </div>
                  <div class="ect-flex-1 ect-bg-white ect-border ect-border-sand ect-rounded-xl ect-px-4 ect-py-2.5">
                    <span class="ect-font-body ect-text-[10px] ect-font-semibold ect-uppercase ect-tracking-widest ect-text-charcoal/40 ect-block">Max</span>
                    <span class="ect-font-body ect-text-base ect-font-medium ect-text-charcoal">{{ formatPrice(local.priceMax) }}{{ local.priceMax >= maxPrice ? '+' : '' }}</span>
                  </div>
                </section>

                <!-- Dual-handle gold slider -->
                <div class="jewelet-range">
                  <span class="jewelet-range__track"></span>
                  <span class="jewelet-range__fill" :style="{ left: minPct + '%', right: (100 - maxPct) + '%' }"></span>
                  <input type="range" :min="0" :max="maxPrice" step="50" v-model.number="local.priceMin" @input="onPriceMinChange" aria-label="Minimum price" />
                  <input type="range" :min="0" :max="maxPrice" step="50" v-model.number="local.priceMax" @input="onPriceMaxChange" aria-label="Maximum price" />
                </div>
              </section>
            </section>

            <hr class="ect-border-sand" />

            <!-- Color -->
            <section>
              <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-widest ect-text-charcoal/50 ect-mb-2">Metal Tone</h3>
              <section class="ect-flex ect-gap-5 ect-flex-wrap">
                <button
                  v-for="c in COLORS"
                  :key="c.id"
                  type="button"
                  :title="c.label"
                  :aria-pressed="local.colors.includes(c.id)"
                  class="ect-flex ect-flex-col ect-items-center ect-gap-2 ect-transition-opacity hover:ect-opacity-90"
                  @click="toggleColor(c.id)"
                >
                  <span
                    class="ect-relative ect-w-11 ect-h-11 ect-rounded-full ect-shadow-sm ect-shadow-charcoal/10 ect-transition-all"
                    :class="local.colors.includes(c.id) ? 'ect-ring-2 ect-ring-gold-500 ect-ring-offset-2 ect-ring-offset-cream' : 'ect-ring-1 ect-ring-charcoal/10'"
                    :style="{ backgroundColor: c.hex }"
                  >
                    <svg v-if="local.colors.includes(c.id)" class="ect-absolute ect-inset-0 ect-m-auto ect-w-5 ect-h-5 ect-text-white ect-drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span class="ect-font-body ect-text-xs ect-leading-none" :class="local.colors.includes(c.id) ? 'ect-text-charcoal ect-font-medium' : 'ect-text-charcoal/60'">{{ c.label.split(' ')[0] }}</span>
                </button>
              </section>
            </section>

            <hr class="ect-border-sand" />

            <!-- Stone Shape -->
            <section>
              <button
                type="button"
                class="ect-w-full ect-flex ect-items-center ect-justify-between ect-mb-2"
                :aria-expanded="stoneShapeOpen"
                @click="stoneShapeOpen = !stoneShapeOpen"
              >
                <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-widest ect-text-charcoal/50">Stone Shape</h3>
                <span class="ect-flex ect-items-center ect-gap-2">
                  <span v-if="local.centerShapes.length" class="ect-font-body ect-text-xs ect-font-medium ect-text-charcoal/70">{{ local.centerShapes.length }} selected</span>
                  <svg class="ect-w-4 ect-h-4 ect-text-charcoal/40 ect-transition-transform" :class="stoneShapeOpen ? 'ect-rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              <section v-show="stoneShapeOpen" class="ect-flex ect-gap-2.5 ect-flex-wrap">
                <button
                  v-for="shape in CENTER_SHAPE_OPTIONS"
                  :key="shape"
                  type="button"
                  :aria-pressed="local.centerShapes.includes(shape)"
                  :class="local.centerShapes.includes(shape) ? 'ect-bg-gold-50 ect-text-gold-700 ect-border-gold-400' : 'ect-border-sand ect-text-charcoal/80 hover:ect-border-gold-400/60'"
                  class="ect-inline-flex ect-items-center ect-gap-1.5 ect-font-body ect-text-sm ect-font-medium ect-px-5 ect-py-2.5 ect-rounded-full ect-border ect-transition-colors"
                  @click="toggleCenterShape(shape)"
                >
                  {{ shape }}
                  <span class="ect-text-xs" :class="local.centerShapes.includes(shape) ? 'ect-text-gold-700/60' : 'ect-text-charcoal/40'">{{ shapeCount(shape) }}</span>
                </button>
              </section>
            </section>

            <hr class="ect-border-sand" />

            <!-- Stone Size -->
            <section>
              <button
                type="button"
                class="ect-w-full ect-flex ect-items-center ect-justify-between ect-mb-2"
                :aria-expanded="stoneSizeOpen"
                @click="stoneSizeOpen = !stoneSizeOpen"
              >
                <h3 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-widest ect-text-charcoal/50">Stone Size</h3>
                <span class="ect-flex ect-items-center ect-gap-2">
                  <span v-if="local.centerStoneSizes.length" class="ect-font-body ect-text-xs ect-font-medium ect-text-charcoal/70">{{ local.centerStoneSizes.length }} selected</span>
                  <svg class="ect-w-4 ect-h-4 ect-text-charcoal/40 ect-transition-transform" :class="stoneSizeOpen ? 'ect-rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              <section v-show="stoneSizeOpen" class="ect-flex ect-gap-2.5 ect-flex-wrap">
                <button
                  v-for="size in CENTER_STONE_SIZE_OPTIONS"
                  :key="size"
                  type="button"
                  :aria-pressed="local.centerStoneSizes.includes(size)"
                  :class="local.centerStoneSizes.includes(size) ? 'ect-bg-gold-50 ect-text-gold-700 ect-border-gold-400' : 'ect-border-sand ect-text-charcoal/80 hover:ect-border-gold-400/60'"
                  class="ect-inline-flex ect-items-center ect-gap-1.5 ect-font-body ect-text-sm ect-font-medium ect-px-5 ect-py-2.5 ect-rounded-full ect-border ect-transition-colors"
                  @click="toggleCenterStoneSize(size)"
                >
                  {{ size }}
                  <span class="ect-text-xs" :class="local.centerStoneSizes.includes(size) ? 'ect-text-gold-700/60' : 'ect-text-charcoal/40'">{{ sizeCount(size) }}</span>
                </button>
              </section>
            </section>
          </section>

          <!-- Footer -->
          <footer class="ect-sticky ect-bottom-0 ect-bg-cream ect-border-t ect-border-sand ect-px-6 ect-py-3 ect-flex ect-gap-3">
            <button
              type="button"
              @click="clear"
              class="ect-flex-1 ect-flex ect-items-center ect-justify-center ect-gap-2 ect-py-3.5 ect-bg-white ect-border ect-border-sand ect-text-charcoal ect-font-body ect-text-sm ect-font-medium ect-rounded-full hover:ect-bg-pearl ect-transition-colors"
            >
              <svg class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M5.6 9A7.5 7.5 0 0119 8.5M18.4 15A7.5 7.5 0 015 15.5" />
              </svg>
              Reset
            </button>
            <button
              type="button"
              @click="apply"
              :disabled="previewCount === 0"
              class="ect-flex-[1.6] ect-py-3.5 ect-bg-rose-500 ect-text-white ect-font-body ect-text-sm ect-font-semibold ect-uppercase ect-tracking-wider ect-rounded-full hover:ect-bg-rose-600 ect-transition-colors disabled:ect-opacity-40 disabled:ect-cursor-not-allowed"
            >
              <template v-if="previewCount !== null">{{ previewCount === 0 ? 'No pieces match' : `Show ${previewCount} ${previewCount === 1 ? 'piece' : 'pieces'}` }}</template>
              <template v-else>Apply Filters{{ activeCount > 0 ? ` (${activeCount})` : '' }}</template>
            </button>
          </footer>
        </article>
      </Transition>
    </section>
  </Transition>
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
  background: #ebe7e2;
}
.jewelet-range__fill {
  background: #c9a227;
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
  background: #c9a227;
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
  background: #c9a227;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}
.jewelet-range input[type='range']:focus-visible::-webkit-slider-thumb {
  outline: 2px solid #c9a227;
  outline-offset: 2px;
}
</style>
