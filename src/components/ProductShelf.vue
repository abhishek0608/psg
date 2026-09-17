<script setup lang="ts">
import { computed, onMounted } from 'vue'
import ProductCard from './ProductCard.vue'
import { useProductsApi } from '../composables/useProductsApi'

const props = withDefaults(defineProps<{
  eyebrow: string
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
  <section class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-16 sm:ect-pt-20">
    <header class="ect-flex ect-items-end ect-justify-between ect-gap-4 ect-mb-6">
      <div>
        <p class="ect-eyebrow ect-text-gold-600">{{ eyebrow }}</p>
        <h2 class="ect-mt-2 ect-font-display ect-text-3xl sm:ect-text-[2.5rem] ect-font-medium ect-leading-tight ect-text-[#2b2723]">
          {{ title }}
        </h2>
      </div>
      <RouterLink
        :to="browseTo"
        class="ect-shrink-0 ect-font-body ect-text-ui ect-tracking-wide ect-text-[#2b2723] ect-border-b ect-border-[#cdbfa6] ect-pb-0.5 hover:ect-text-[#1f5c4d] ect-transition-colors"
      >
        Shop all
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

    <div v-else class="ect-rounded-xl ect-border ect-border-[#e6ddce] ect-bg-white ect-p-8 ect-text-center">
      <p class="ect-font-body ect-text-sm ect-text-[#7a7264]">More pieces are being added to this edit.</p>
      <RouterLink :to="browseTo" class="ect-mt-3 ect-inline-block ect-font-body ect-text-ui ect-font-semibold ect-uppercase ect-tracking-label ect-text-[#1f3f37] ect-underline ect-underline-offset-4">
        Browse the full collection
      </RouterLink>
    </div>
  </section>
</template>
