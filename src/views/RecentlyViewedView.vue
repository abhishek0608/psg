<script setup lang="ts">
import ProductCard from '../components/ProductCard.vue'
import { useRecentlyViewed } from '../composables/useRecentlyViewed'

const { items, remove, clear } = useRecentlyViewed()
</script>

<template>
  <section class="ect-pt-28 sm:ect-pt-36 lg:ect-pt-44 ect-pb-24 ect-px-6 ect-bg-cream ect-min-h-screen">
    <article class="ect-max-w-7xl ect-mx-auto">
      <header class="ect-mb-8 ect-flex ect-flex-wrap ect-items-end ect-justify-between ect-gap-4">
        <div>
          <p class="ect-inline-flex ect-items-center ect-gap-1.5 ect-font-body ect-text-xs ect-uppercase ect-tracking-label ect-text-gold-700 ect-mb-2">
            <span class="ect-w-5 ect-h-px ect-bg-gold-400" /> Your history
          </p>
          <h1 class="ect-font-display ect-text-3xl sm:ect-text-4xl ect-font-light ect-text-charcoal">Recently Viewed</h1>
          <p v-if="items.length" class="ect-font-body ect-text-sm ect-text-charcoal/50 ect-mt-1">
            {{ items.length }} {{ items.length === 1 ? 'piece' : 'pieces' }}
          </p>
        </div>

        <button
          v-if="items.length"
          type="button"
          class="ect-px-4 ect-py-2.5 ect-border ect-border-charcoal/20 ect-bg-white ect-text-charcoal/60 ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-rounded-xl hover:ect-border-rose-300 hover:ect-text-rose-700 ect-transition-colors"
          @click="clear"
        >
          Clear history
        </button>
      </header>

      <section v-if="!items.length" class="ect-flex ect-flex-col ect-items-center ect-justify-center ect-py-28 ect-text-center">
        <span class="ect-w-20 ect-h-20 ect-rounded-full ect-bg-champagne ect-flex ect-items-center ect-justify-center ect-mx-auto ect-mb-6">
          <svg class="ect-w-9 ect-h-9 ect-text-gold-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2m5-2a9 9 0 11-9-9 8.96 8.96 0 016.36 2.64M18 3v4h-4" />
          </svg>
        </span>
        <h2 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal ect-mb-2">No recently viewed pieces</h2>
        <p class="ect-font-body ect-text-base ect-text-charcoal/60 ect-mb-8">Pieces you open will appear here, with the newest first.</p>
        <RouterLink to="/#collections" class="ect-inline-flex ect-items-center ect-gap-2 ect-px-6 ect-py-3 ect-bg-charcoal ect-text-white ect-font-body ect-text-sm ect-font-semibold ect-rounded-full hover:ect-bg-noir ect-transition-colors">
          Browse Collections
        </RouterLink>
      </section>

      <ul v-else class="ect-grid ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-x-2.5 ect-gap-y-5 sm:ect-gap-x-[22px] sm:ect-gap-y-7 ect-list-none ect-m-0 ect-p-0">
        <li v-for="product in items" :key="product.slug" class="ect-h-full ect-flex ect-flex-col ect-gap-2">
          <ProductCard
            :slug="product.slug"
            :title="product.title"
            :category="product.category"
            :material="product.material"
            :price="product.price"
            :images="product.images"
            :product="product"
          />
          <button
            type="button"
            class="ect-self-start ect-font-body ect-text-xs ect-text-charcoal/45 hover:ect-text-rose-700 ect-transition-colors"
            @click="remove(product.slug)"
          >
            Remove from history
          </button>
        </li>
      </ul>
    </article>
  </section>
</template>
