<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Material, Product } from '../data/products'
import { useCart } from '../composables/useCart'
import { useWishlist } from '../composables/useWishlist'
import ImageWatermark from './ImageWatermark.vue'

const props = defineProps<{
  slug: string
  title: string
  category: string
  material: Material
  price: string
  images?: string[]
  product?: Product
}>()

const emit = defineEmits<{ addToCart: [] }>()
const { addToCart, items } = useCart()
const { isWishlisted, toggle: toggleWishlist } = useWishlist()
const cartLoading = ref(false)

const wishlisted = computed(() => props.product ? isWishlisted(props.product.slug) : false)

const inCart = computed(() => {
  if (!props.product) return false
  return items.some((i) => i.product.slug === props.product!.slug)
})

async function handleAddToCart(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  if (!props.product || cartLoading.value) return
  cartLoading.value = true
  try {
    await addToCart(props.product)
    emit('addToCart')
  } catch (err) {
    console.error('Add to cart failed:', err)
  } finally {
    cartLoading.value = false
  }
}

function handleWishlist(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  if (props.product) toggleWishlist(props.product)
}

// Luxury presentation favours a single, quiet neutral so the jewellery —
// not a rainbow of category colours — is the focus of every card.
const PLACEHOLDER_GRADIENT = 'ect-from-champagne ect-to-cream'

// A "$0" price reads as a bug; unpriced pieces are quoted individually instead.
const hasRetailPrice = computed(() => {
  const numeric = Number(String(props.price || '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(numeric) && numeric > 0
})

const ratingLabel = computed(() => {
  const rating = props.product?.rating
  return typeof rating === 'number' && rating > 0 ? rating.toFixed(1) : '4.8'
})

const reviewLabel = computed(() => {
  const count = props.product?.reviewCount
  if (typeof count !== 'number' || count <= 0) return 'Verified'
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count)
})

const productTag = computed(() => {
  if (props.product?.isBestSeller) return 'Bestseller'
  if (props.product?.isNewArrival) return 'New'
  if (props.product?.priceValue && props.product.priceValue <= 1000) return 'Under $1k'
  return ''
})
</script>

<template>
  <article class="ect-group ect-relative ect-flex ect-h-full ect-min-h-0 ect-flex-col ect-overflow-hidden ect-rounded-lg ect-border ect-border-[#ece4d5] ect-bg-white ect-transition-all ect-duration-200 hover:-ect-translate-y-0.5 hover:ect-shadow-[0_14px_34px_rgba(31,63,55,0.13)]">
    <RouterLink :to="`/product/${slug}`" class="ect-flex ect-min-h-0 ect-flex-1 ect-flex-col">

      <!-- Image / placeholder box -->
      <figure
        class="ect-relative ect-shrink-0 ect-aspect-square ect-overflow-hidden ect-bg-gradient-to-br"
        :class="[PLACEHOLDER_GRADIENT, !images?.length && 'ect-flex ect-items-center ect-justify-center']"
      >
        <img
          v-if="images?.length"
          :src="images[0]"
          :alt="title"
          loading="lazy"
          decoding="async"
          class="ect-w-full ect-h-full ect-object-cover ect-transition-transform ect-duration-[900ms] ect-ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:ect-scale-[1.06]"
        />
        <ImageWatermark v-if="images?.length" :opacity="0.55" :scale="0.15" />
        <svg v-else class="ect-w-12 ect-h-12 ect-text-[#a99f89] ect-transition-transform ect-duration-300 group-hover:ect-scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>

        <!-- Hover overlay -->
        <span class="ect-absolute ect-inset-0 ect-bg-charcoal/0 group-hover:ect-bg-charcoal/[0.035] ect-transition-colors ect-duration-300" />

        <!-- Listing badge (top-left) -->
        <span v-if="productTag" class="ect-absolute ect-top-3 ect-left-3 ect-inline-flex ect-items-center ect-rounded-full ect-px-2.5 ect-py-1 ect-font-body ect-text-[10px] ect-font-semibold ect-uppercase ect-tracking-[0.12em]" :class="productTag === 'Bestseller' ? 'ect-bg-[#1f3f37] ect-text-[#f4ecd9]' : 'ect-bg-[#b79a56] ect-text-[#2b2723]'">
          {{ productTag }}
        </span>

        <!-- Wishlist button (top-right) — always visible -->
        <button
          type="button"
          @click="handleWishlist"
          class="ect-absolute ect-top-2.5 ect-right-2.5 ect-w-[34px] ect-h-[34px] ect-rounded-full ect-bg-white/90 ect-backdrop-blur-sm ect-flex ect-items-center ect-justify-center ect-shadow-sm ect-transition-all ect-duration-200 hover:ect-scale-105"
          :aria-label="wishlisted ? 'Remove from wishlist' : 'Add to wishlist'"
        >
          <svg class="ect-w-4 ect-h-4 ect-transition-colors" :class="wishlisted ? 'ect-text-rose-500' : 'ect-text-charcoal/55'" :fill="wishlisted ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
      </figure>

      <section class="ect-flex ect-flex-1 ect-flex-col ect-px-4 ect-pt-4 ect-pb-0">
        <p class="ect-font-body ect-text-[11px] ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-[#a2987f]">{{ category }}</p>
        <h3
          class="ect-mt-1.5 ect-font-body ect-text-[15px] ect-font-normal ect-leading-snug ect-text-charcoal group-hover:ect-text-[#1f3f37] ect-transition-colors ect-line-clamp-2"
        >
          {{ title }}
        </h3>
        <p class="ect-mt-2 ect-flex ect-items-center ect-gap-1.5 ect-font-body ect-text-xs ect-text-[#7a7264]">
          <span class="ect-text-[#c99a2e]" aria-hidden="true">★★★★★</span>
          <span>{{ ratingLabel }} ({{ reviewLabel }})</span>
        </p>
      </section>
    </RouterLink>

    <!-- Price + Add to Cart -->
    <section class="ect-px-4 ect-pb-4 ect-pt-3">
      <div class="ect-flex ect-min-h-[30px] ect-items-baseline ect-gap-2 ect-flex-wrap">
        <p v-if="hasRetailPrice" class="ect-font-display ect-text-[22px] ect-font-medium ect-leading-none ect-text-charcoal">{{ price }}</p>
        <p v-else class="ect-font-body ect-text-sm ect-font-medium ect-tracking-[0.02em] ect-text-charcoal/55">Price on request</p>
        <span v-if="hasRetailPrice" class="ect-font-body ect-text-xs ect-font-medium ect-text-[#1f5c4d]">Price breakup</span>
      </div>
      <div class="ect-mt-3 ect-flex ect-gap-2">
      <button
        v-if="product"
        type="button"
        @click="handleAddToCart"
        :aria-label="cartLoading ? 'Adding to cart' : inCart ? 'Added to cart' : 'Add to cart'"
        :disabled="cartLoading"
        class="ect-min-w-0 ect-flex-1 ect-h-11 ect-rounded-full ect-flex ect-items-center ect-justify-center ect-gap-1.5 ect-font-body ect-text-xs sm:ect-text-[13px] ect-font-semibold ect-uppercase ect-tracking-[0.05em] ect-transition-all ect-duration-200 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-[#1f3f37]/30 focus:ect-ring-offset-1"
        :class="cartLoading
          ? 'ect-bg-[#1f3f37]/70 ect-text-[#f4ecd9] ect-cursor-wait'
          : inCart
          ? 'ect-bg-[#1f3f37] ect-text-[#f4ecd9]'
          : 'ect-bg-[#1f3f37] ect-text-[#f4ecd9] hover:ect-bg-[#17342d]'"
      >
        <svg v-if="cartLoading" class="ect-w-4 ect-h-4 ect-shrink-0 ect-animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="ect-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3.5" />
          <path class="ect-opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
        </svg>
        <svg v-else-if="!inCart" class="ect-w-[18px] ect-h-[18px] ect-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
        </svg>
        <svg v-else class="ect-w-[18px] ect-h-[18px] ect-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        <span class="ect-hidden sm:ect-inline">{{ cartLoading ? 'Adding...' : inCart ? 'Added' : 'Add to Bag' }}</span>
      </button>
      </div>
    </section>
  </article>
</template>
