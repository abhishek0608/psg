<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ProductCard from './ProductCard.vue'
import { useProductsApi } from '../composables/useProductsApi'

const props = withDefaults(defineProps<{
  title: string
  mode?: 'new' | 'under-price'
  priceMax?: number
  excludeSlugs?: string[]
  limit?: number
}>(), {
  mode: 'new',
  limit: 8,
  priceMax: 50000,
  excludeSlugs: () => [],
})

const { products, ensureProductsLoaded, loading, loaded } = useProductsApi()

onMounted(() => {
  void ensureProductsLoaded()
})

const pieces = computed(() => {
  const excluded = new Set(props.excludeSlugs)
  let pool = products.value.filter((product) => !excluded.has(product.slug))

  if (props.mode === 'under-price') {
    pool = pool.filter((product) => product.priceValue > 0 && product.priceValue < props.priceMax)
  } else {
    const arrivals = pool.filter((product) => product.isNewArrival)
    pool = arrivals.length >= 4 ? arrivals : [...arrivals, ...pool.filter((product) => !product.isNewArrival)]
  }

  return pool.slice(0, props.limit)
})

const browseTo = computed(() => props.mode === 'under-price'
  ? { path: '/collections', query: { priceMax: String(props.priceMax) } }
  : { path: '/collections', query: { tab: 'new' } })

const showSkeleton = computed(() => (loading.value || !loaded.value) && !products.value.length)
</script>

<template>
  <section class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-12 sm:ect-pt-16">
    <header class="ect-flex ect-items-baseline ect-justify-between ect-gap-4 ect-mb-5">
      <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-text-[#2b2723]">{{ title }}</h2>
      <RouterLink :to="browseTo" class="ect-shrink-0 ect-font-body ect-text-sm ect-text-[#5c5648] hover:ect-text-[#1f3f37] ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6]">
        View all
      </RouterLink>
    </header>

    <ul v-if="showSkeleton" class="ect-grid ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-x-2.5 ect-gap-y-3 sm:ect-gap-x-[22px] sm:ect-gap-y-5 ect-list-none ect-m-0 ect-p-0">
      <li v-for="n in props.limit" :key="n" class="ect-animate-pulse">
        <div class="ect-aspect-square ect-rounded-lg ect-bg-[#efe7d6]" />
        <div class="ect-mt-3 ect-h-4 ect-w-3/4 ect-rounded ect-bg-[#e6ddce]" />
        <div class="ect-mt-2 ect-h-4 ect-w-1/2 ect-rounded ect-bg-[#e6ddce]" />
      </li>
    </ul>

    <ul v-else-if="pieces.length" class="ect-grid ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-x-2.5 ect-gap-y-3 sm:ect-gap-x-[22px] sm:ect-gap-y-5 ect-list-none ect-m-0 ect-p-0">
      <li v-for="piece in pieces" :key="piece.slug" class="ect-h-full">
        <ProductCard :slug="piece.slug" :title="piece.title" :category="piece.category" :material="piece.material" :price="piece.price" :images="piece.images" :product="piece" />
      </li>
    </ul>

    <p v-else class="ect-font-body ect-text-sm ect-text-[#7a7264] ect-py-8">
      No products in this range right now.
      <RouterLink :to="browseTo" class="ect-underline hover:ect-text-[#1f5c4d]">Browse all jewellery</RouterLink>.
    </p>
  </section>
</template>
