<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductCard from '../components/ProductCard.vue'
import { useProductsApi } from '../composables/useProductsApi'
import { useSearch } from '../composables/useSearch'

const route = useRoute()
const router = useRouter()
const { searchSubmitTick } = useSearch()
const { products, ensureProductsLoaded, loading: productsLoading } = useProductsApi()

const localQuery = ref(String(route.query.q || ''))
const submittedQuery = ref('')

const textResults = computed(() => {
  const needle = submittedQuery.value.toLowerCase().trim()
  if (!needle) return products.value

  return products.value.filter((product) =>
    [product.title, product.category, product.description, product.material]
      .some((value) => String(value || '').toLowerCase().includes(needle)),
  )
})

function executeSearch(rawQuery: string) {
  submittedQuery.value = rawQuery.trim()
}

function handleSubmit() {
  const q = localQuery.value.trim()
  router.replace({ path: '/search', query: q ? { q } : {} })
  executeSearch(q)
}

function clearQuery() {
  localQuery.value = ''
  router.replace('/search')
  executeSearch('')
}

watch(() => route.query.q, (value) => {
  const next = String(value || '')
  localQuery.value = next
  executeSearch(next)
})

watch(searchSubmitTick, () => {
  localQuery.value = String(route.query.q || '')
  executeSearch(localQuery.value)
})

onMounted(async () => {
  await ensureProductsLoaded()
  executeSearch(localQuery.value)
})
</script>

<template>
  <main class="ect-min-h-screen ect-bg-[#faf7f2] ect-pt-32 ect-pb-20 ect-px-5">
    <section class="ect-max-w-5xl ect-mx-auto">
      <form
        @submit.prevent="handleSubmit"
        class="ect-hidden lg:ect-flex ect-items-center ect-mb-10"
      >
        <section class="ect-flex-1 ect-flex ect-items-center ect-gap-3 ect-bg-white ect-rounded-2xl ect-shadow-sm ect-ring-1 ect-ring-charcoal/[0.07] focus-within:ect-ring-gold-400/40 ect-px-4 ect-py-3 ect-transition-all">
          <button
            type="submit"
            title="Search"
            aria-label="Search"
            class="ect-shrink-0 ect-text-charcoal/25 hover:ect-text-gold-700 ect-transition-colors"
          >
            <svg class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          <input
            v-model="localQuery"
            type="search"
            placeholder="Search for jewellery…"
            autofocus
            class="ect-flex-1 ect-bg-transparent ect-font-body ect-text-base ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none"
          />
          <button
            v-if="localQuery"
            type="button"
            aria-label="Clear search"
            class="ect-text-charcoal/30 hover:ect-text-charcoal ect-transition-colors ect-shrink-0"
            @click="clearQuery"
          >
            <svg class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </section>
      </form>

      <p v-if="submittedQuery && !productsLoading" class="ect-font-body ect-text-sm ect-text-charcoal/40 ect-mb-6">
        {{ textResults.length }} {{ textResults.length === 1 ? 'result' : 'results' }} for
        <span class="ect-text-charcoal/70 ect-font-medium">"{{ submittedQuery }}"</span>
      </p>

      <ul v-if="productsLoading" class="ect-grid ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-4 sm:ect-gap-[22px] ect-list-none ect-m-0 ect-p-0">
        <li v-for="n in 8" :key="n" class="ect-animate-pulse">
          <section class="ect-aspect-square ect-rounded-t-lg ect-bg-[#efe7d6]" />
          <section class="ect-rounded-b-lg ect-border ect-border-t-0 ect-border-[#ece4d5] ect-bg-white ect-p-4">
            <section class="ect-h-3 ect-w-1/3 ect-rounded ect-bg-[#e6ddce] ect-mb-3" />
            <section class="ect-h-4 ect-w-3/4 ect-rounded ect-bg-[#e6ddce] ect-mb-3" />
            <section class="ect-h-5 ect-w-1/2 ect-rounded ect-bg-[#e6ddce]" />
          </section>
        </li>
      </ul>

      <ul v-else-if="textResults.length" class="ect-grid ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-4 sm:ect-gap-[22px] ect-list-none ect-m-0 ect-p-0">
        <li v-for="item in textResults" :key="item.slug" class="ect-h-full">
          <ProductCard
            :slug="item.slug"
            :title="item.title"
            :category="item.category"
            :material="item.material"
            :price="item.price"
            :images="item.images"
            :product="item"
          />
        </li>
      </ul>

      <section v-else-if="submittedQuery" class="ect-flex ect-flex-col ect-items-center ect-py-24 ect-text-center">
        <span class="ect-w-16 ect-h-16 ect-rounded-full ect-bg-champagne/50 ect-flex ect-items-center ect-justify-center ect-mb-4">
          <svg class="ect-w-7 ect-h-7 ect-text-gold-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </span>
        <p class="ect-font-display ect-text-lg ect-font-light ect-text-charcoal ect-mb-1">No results for "{{ submittedQuery }}"</p>
        <p class="ect-font-body ect-text-sm ect-text-charcoal/45">Try a different product name, category, or material.</p>
      </section>
    </section>
  </main>
</template>
