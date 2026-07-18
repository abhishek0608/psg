<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ProductCard from './ProductCard.vue'
import { useProductsApi } from '../composables/useProductsApi'

const LIMIT = 8
const UNDER_PRICE = 800

const { products, ensureProductsLoaded, loading, loaded } = useProductsApi()

onMounted(() => {
  void ensureProductsLoaded()
})

// Quick filter chips (Aurelle design). "Under $X" cuts across categories.
const FILTERS = ['All', 'Rings', 'Earrings', 'Necklaces', 'Bracelets', `Under $${UNDER_PRICE}`] as const
const activeFilter = ref<string>('All')

// Curated teaser within the active filter: lead with best sellers, then new
// arrivals, then fill with the rest — capped at LIMIT. The full filterable
// catalogue lives at /collections.
const featured = computed(() => {
  let pool = products.value
  if (activeFilter.value === `Under $${UNDER_PRICE}`) {
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
    <header class="ect-flex ect-items-end ect-justify-between ect-gap-4 ect-mb-6">
      <h2 class="ect-font-display ect-text-3xl sm:ect-text-[2.5rem] ect-font-medium ect-leading-tight ect-text-[#2b2723]">
        Best sellers
      </h2>
      <RouterLink
        to="/collections"
        class="ect-shrink-0 ect-font-body ect-text-[13.5px] ect-tracking-[0.05em] ect-text-[#2b2723] ect-border-b ect-border-[#cdbfa6] ect-pb-0.5 hover:ect-text-[#1f5c4d] ect-transition-colors"
      >
        View all jewellery
      </RouterLink>
    </header>

    <!-- Quick filters -->
    <div class="ect-flex ect-gap-2.5 ect-flex-wrap ect-mb-7">
      <button
        v-for="f in FILTERS"
        :key="f"
        type="button"
        class="ect-font-body ect-text-[13px] ect-tracking-[0.03em] ect-px-[18px] ect-py-[9px] ect-rounded-full ect-border ect-transition-colors"
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

    <!-- Skeleton -->
    <ul v-if="showSkeleton" class="ect-grid ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-4 sm:ect-gap-6 ect-list-none ect-m-0 ect-p-0">
      <li v-for="n in 8" :key="`skeleton-${n}`" class="ect-animate-pulse">
        <section class="ect-aspect-square ect-rounded-2xl ect-bg-[#efe7d6] ect-mb-3" />
        <section class="ect-h-4 ect-w-3/4 ect-rounded ect-bg-[#e6ddce] ect-mb-2" />
        <section class="ect-h-3 ect-w-1/3 ect-rounded ect-bg-[#e6ddce]" />
      </li>
    </ul>

    <!-- Curated grid -->
    <ul v-else-if="featured.length" class="ect-grid ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-4 sm:ect-gap-6 ect-list-none ect-m-0 ect-p-0">
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
