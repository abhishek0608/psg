<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ProductCard from './ProductCard.vue'
import { useProductsApi } from '../composables/useProductsApi'
import { formatInr } from '../utils/currency'

const LIMIT = 8
const UNDER_PRICE = 75000

const { products, ensureProductsLoaded, loading, loaded } = useProductsApi()

onMounted(() => {
  void ensureProductsLoaded()
})

// Quick filter chips (Aurelle design). "Under ₹X" cuts across categories.
const UNDER_PRICE_LABEL = `Under ${formatInr(UNDER_PRICE)}`
const FILTERS = ['All', 'Rings', 'Earrings', 'Necklaces', 'Bracelets', UNDER_PRICE_LABEL] as const
const activeFilter = ref<string>('All')

// Curated teaser within the active filter: lead with best sellers, then new
// arrivals, then fill with the rest — capped at LIMIT. The full filterable
// catalogue lives at /collections.
const featured = computed(() => {
  let pool = products.value
  if (activeFilter.value === UNDER_PRICE_LABEL) {
    pool = pool.filter((p) => p.priceValue > 0 && p.priceValue < UNDER_PRICE)
  } else if (activeFilter.value !== 'All') {
    pool = pool.filter((p) => p.category === activeFilter.value)
  }
  const seen = new Set<string>()
  const picks: typeof pool = []
  const add = (list: typeof pool) => {
    for (const p of list) {
      if (picks.length >= LIMIT) break
      if (seen.has(p.slug)) continue
      seen.add(p.slug)
      picks.push(p)
    }
  }
  add(pool.filter((p) => p.isBestSeller))
  add(pool.filter((p) => p.isNewArrival))
  add(pool)
  return picks.slice(0, LIMIT)
})

const showSkeleton = computed(() => (loading.value || !loaded.value) && !products.value.length)
</script>

<template>
  <section id="collections" class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-14 sm:ect-pt-16">
    <!-- Eyebrow + heading, matching the two sections either side of this one.
         Without the kicker this heading sat a line higher than its neighbours
         and broke the vertical rhythm down the page. -->
    <header class="ect-flex ect-items-end ect-justify-between ect-gap-4 ect-mb-6">
      <div>
        <p class="ect-eyebrow ect-text-gold-600">Curated selection</p>
        <h2 class="ect-mt-2 ect-font-display ect-text-3xl sm:ect-text-[2.5rem] ect-font-medium ect-leading-tight ect-text-[#2b2723]">
          Best sellers
        </h2>
      </div>
      <RouterLink
        to="/collections"
        class="ect-shrink-0 ect-font-body ect-text-ui ect-tracking-wide ect-text-[#2b2723] ect-border-b ect-border-[#cdbfa6] ect-pb-0.5 hover:ect-text-[#1f5c4d] ect-transition-colors"
      >
        View all jewellery
      </RouterLink>
    </header>

    <!-- Quick filters -->
    <div class="ect-flex ect-gap-2.5 ect-flex-wrap ect-mb-3 sm:ect-mb-5">
      <button
        v-for="f in FILTERS"
        :key="f"
        type="button"
        class="ect-font-body ect-text-ui ect-tracking-wide ect-px-[18px] ect-py-[9px] ect-rounded-full ect-border ect-transition-colors"
        :class="
 activeFilter === f
            ? 'ect-border-[#1f3f37] ect-bg-[#1f3f37] ect-text-[#f4ecd9]'
            : 'ect-border-[#d8ccb5] ect-bg-white ect-text-[#5c5648] hover:ect-bg-[#efe7d6]'
        "
        @click="activeFilter = f"
      >
        {{ f }}
      </button>
    </div>

    <!-- Skeleton. Mirrors the real card's block so the grid doesn't jump when
         the products resolve. -->
    <ul v-if="showSkeleton" class="ect-grid ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-x-2.5 ect-gap-y-2 sm:ect-gap-x-[22px] sm:ect-gap-y-4 ect-list-none ect-m-0 ect-p-0">
      <li v-for="n in 8" :key="`skeleton-${n}`" class="ect-animate-pulse">
        <section class="ect-aspect-square ect-rounded-t-lg ect-bg-[#efe7d6]" />
        <section class="ect-rounded-b-lg ect-border ect-border-t-0 ect-border-[#ece4d5] ect-bg-white ect-px-3 ect-pt-2 ect-pb-3 sm:ect-px-3.5">
          <section class="ect-h-3 ect-w-1/3 ect-rounded ect-bg-[#e6ddce]" />
          <section class="ect-mt-1.5 ect-h-4 ect-w-3/4 ect-rounded ect-bg-[#e6ddce]" />
          <section class="ect-mt-2.5 ect-flex ect-items-center ect-gap-2">
            <section class="ect-h-5 ect-flex-1 ect-rounded ect-bg-[#e6ddce]" />
            <section class="ect-h-9 ect-w-9 sm:ect-h-10 sm:ect-w-24 ect-rounded-full ect-bg-[#e6ddce]" />
          </section>
        </section>
      </li>
    </ul>

    <!-- Curated grid. Same gaps as the collection page: the two grids show the
         same cards, so they should not sit on different rhythms. -->
    <ul v-else-if="featured.length" class="ect-grid ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-x-2.5 ect-gap-y-2 sm:ect-gap-x-[22px] sm:ect-gap-y-4 ect-list-none ect-m-0 ect-p-0">
      <li v-for="piece in featured" :key="piece.slug" class="ect-h-full">
        <ProductCard :slug="piece.slug" :title="piece.title" :category="piece.category" :material="piece.material" :price="piece.price" :images="piece.images" :product="piece" />
      </li>
    </ul>

    <p v-else class="ect-font-body ect-text-sm ect-text-[#7a7264] ect-py-8">
      Nothing here just yet — try another filter or
      <RouterLink to="/collections" class="ect-underline hover:ect-text-[#1f5c4d]">browse all jewellery</RouterLink>.
    </p>
  </section>
</template>
