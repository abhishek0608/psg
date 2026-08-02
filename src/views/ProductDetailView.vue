<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductCard from '../components/ProductCard.vue'
import StarRating from '../components/StarRating.vue'
import VolumeDiscountInfo from '../components/VolumeDiscountInfo.vue'
import ImageWatermark from '../components/ImageWatermark.vue'
import { useCart } from '../composables/useCart'
import { useVideoCallList } from '../composables/useVideoCallList'
import { useProductsApi } from '../composables/useProductsApi'
import { setPageMeta, setProductJsonLd } from '../composables/useSeo'
import { SITE_SETTINGS } from '../config/site-settings'
import { COLORS, getProductReviews, type Color, type Product, type ProductCustomizationOptions } from '../data/products'

const route = useRoute()
const router = useRouter()

// Return to the page the user arrived from (e.g. a collection); a deep link
// with no in-app history falls back to the homepage collections section.
function goBack() {
  if (router.options.history.state.back) router.back()
  else router.push('/#collections')
}
const { addToCart, items: cartItems } = useCart()
const {
  add: addToVideoCall,
  has: inVideoCallList,
  isEligible: videoCallEligible,
  isFull: videoCallListFull,
  maxItems: videoCallMaxItems,
} = useVideoCallList()
const { products, ensureProductsLoaded, loading } = useProductsApi()

const product = computed(() => products.value.find((p) => p.slug === String(route.params.slug || '')))
const addedImages = ref<string[]>([])
const addingToCart = ref(false)
const activeImage = ref(0)
const thumbsRef = ref<HTMLElement | null>(null)

// Hover-zoom magnifier lens for the main product image
const ZOOM_LEVEL = 1.7
const LENS_SIZE = 170
const stageRef = ref<HTMLElement | null>(null)
const zoomActive = ref(false)
const lensStyle = ref<Record<string, string>>({})

function canHover() {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function startZoom() {
  if (!canHover() || !galleryImages.value[activeImage.value]) return
  zoomActive.value = true
}

function stopZoom() {
  zoomActive.value = false
}

function moveZoom(event: MouseEvent) {
  const stage = stageRef.value
  const src = galleryImages.value[activeImage.value]
  if (!stage || !src) return
  const rect = stage.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const half = LENS_SIZE / 2
  // keep the lens fully inside the image bounds
  const left = Math.max(0, Math.min(x - half, rect.width - LENS_SIZE))
  const top = Math.max(0, Math.min(y - half, rect.height - LENS_SIZE))
  // Mirror the img's object-cover sizing so the lens magnifies without
  // stretching non-square photos (which made round pieces look oval)
  let coverW = rect.width
  let coverH = rect.height
  const img = stage.querySelector('img')
  if (img?.naturalWidth && img.naturalHeight) {
    const scale = Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight)
    coverW = img.naturalWidth * scale
    coverH = img.naturalHeight * scale
  }
  const bgX = ((x + (coverW - rect.width) / 2) / coverW) * 100
  const bgY = ((y + (coverH - rect.height) / 2) / coverH) * 100
  lensStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    backgroundImage: `url("${src}")`,
    backgroundSize: `${coverW * ZOOM_LEVEL}px ${coverH * ZOOM_LEVEL}px`,
    backgroundPosition: `${bgX}% ${bgY}%`,
  }
}

// Decode the metal color an image represents from its filename. Uploads follow
// a "... <COLOR> (n)" convention where COLOR is a standalone R / W / Y letter
// (Rose / White / Yellow gold), e.g. "snapshot R (1).png". Returns null when no
// such token is present (older images, generic/model shots).
const COLOR_BY_LETTER: Record<string, Color> = { r: 'rose', w: 'white', y: 'yellow' }
function imageColor(url: string): Color | null {
  const file = decodeURIComponent(url.split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '')
  for (const token of file.toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length === 1 && COLOR_BY_LETTER[token]) return COLOR_BY_LETTER[token]
  }
  return null
}

const allImages = computed(() => {
  const base = product.value?.images?.filter(Boolean) || []
  return [...base, ...addedImages.value.filter((img) => !base.includes(img))]
})

// Whether any image filename encodes a metal color. Products whose images
// predate the convention show every image regardless of the selected color.
const hasColorTaggedImages = computed(() => allImages.value.some((img) => imageColor(img)))

// Gallery filtered to the metal color this piece is actually crafted in.
// Color-tagged shots for that color are shown alongside any untagged (generic)
// images; if the piece's color has no dedicated shots, fall back to everything.
const galleryImages = computed(() => {
  const all = allImages.value
  if (!hasColorTaggedImages.value) return all
  const productColor = product.value?.color
  const matching = all.filter((img) => {
    const color = imageColor(img)
    return color === null || color === productColor
  })
  return matching.length ? matching : all
})

const showThumbRailControls = computed(() => galleryImages.value.length > 5)

const reviews = computed(() =>
  SITE_SETTINGS.enableReviews && product.value ? getProductReviews(product.value.slug) : []
)

const relatedProducts = computed<Product[]>(() => {
  if (!product.value) return []

  const current = product.value
  const currentTags = new Set([...(current.styleTags || []), ...(current.stoneTags || [])])

  return products.value
    .filter((item) => item.slug !== current.slug)
    .map((item) => {
      let score = 0
      if (item.category === current.category) score += 4
      if (item.material === current.material) score += 2
      if (item.color === current.color) score += 1
      if (item.subtype && item.subtype === current.subtype) score += 3
      for (const tag of item.styleTags || []) {
        if (currentTags.has(tag)) score += 1
      }
      for (const tag of item.stoneTags || []) {
        if (currentTags.has(tag)) score += 1
      }
      return { item, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ item }) => item)
})

// The metal this piece is crafted in, e.g. "Yellow Gold" — a stated spec now
// that the finish is fixed per product rather than chosen by the customer.
const metalLabel = computed(() => {
  const item = product.value
  if (!item) return ''
  const named = COLORS.find((option) => option.id === item.color)?.label
  if (named) return named
  return item.material === 'silver' ? 'Silver' : 'Gold'
})

const productBadges = computed(() => {
  if (!product.value) return []
  return [
    product.value.isNewArrival ? 'New arrival' : '',
    product.value.isBestSeller ? 'Best seller' : '',
  ].filter(Boolean)
})

const reviewSummary = computed(() => {
  if (!SITE_SETTINGS.enableReviews) return ''
  if (!product.value?.rating || !product.value?.reviewCount) return ''
  return `${product.value.rating.toFixed(1)} · ${product.value.reviewCount} reviews`
})

// A "₹0" price reads as a bug; unpriced pieces are quoted individually instead.
const hasRetailPrice = computed(() => {
  const numeric = Number(String(product.value?.price || '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(numeric) && numeric > 0
})

const technicalDetailRows = computed<Array<{ label: string; value: string }>>(() => {
  const desc = product.value?.description?.trim() || ''
  const specs: Array<{ label: string; value: string }> = []
  const attributeSpecs = [
    { label: 'Gross Weight', value: product.value?.productAttributes?.grossWeight || '' },
    { label: 'Diamond Carats', value: product.value?.productAttributes?.diamondCarats || '' },
    { label: 'Diamond Quantity', value: product.value?.productAttributes?.diamondQuantity || '' },
  ].filter((spec) => spec.value)
  const seenLabels = new Set(attributeSpecs.map((spec) => spec.label.toLowerCase()))

  const regex = /([A-Z][A-Za-z ]+?):\s*(.+?)(?=\s+[A-Z][A-Za-z ]+?:|\s*$)/g
  let match: RegExpExecArray | null
  while (desc && (match = regex.exec(desc)) !== null) {
    const label = match[1]?.trim() || ''
    const value = match[2]?.trim().replace(/[.,;]+$/, '') || ''
    if (label && value && !seenLabels.has(label.toLowerCase())) specs.push({ label, value })
  }

  return [...attributeSpecs, ...specs]
})

const productDetailRows = computed<Array<{ label: string; value: string }>>(() => {
  // The specification sheet a buyer expects: how this piece is actually made.
  // Unset attributes are omitted entirely — a wall of "None" rows reads as
  // missing data, not as a considered spec sheet.
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Metal', value: metalLabel.value },
    { label: 'Metal Purity', value: productSpec('metalPurities') },
    { label: 'Diamond Quality', value: productSpec('diamondQualities') },
    { label: 'Stone Type', value: productSpec('stoneTypes') },
    { label: 'Center Shape', value: productSpec('centerShapes') },
    { label: 'Center Stone Size', value: productSpec('centerStoneSizes') },
    ...technicalDetailRows.value,
    { label: 'Ring Size', value: productSpec('ringSizes') },
    { label: 'Bangle Size', value: productSpec('bangleSizes') },
    { label: 'Necklace Size', value: productSpec('necklaceSizes') },
  ]

  // Descriptions sometimes repeat a catalogue spec in prose; keep the first
  // occurrence of each label so the sheet never lists the same thing twice.
  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = row.label.trim().toLowerCase()
    if (!row.value || seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const hasMeaningfulValue = (value?: string) => Boolean(value) && value !== '—'

const breakupRows = computed(() => {
  const b = product.value?.breakup
  if (!b) return []
  return [
    { label: `Gold (${b.goldWeight})`, value: b.goldValue, show: hasMeaningfulValue(b.goldWeight) || hasMeaningfulValue(b.goldValue) },
    { label: `Stone (${b.stoneWeight})`, value: b.stoneValue, show: hasMeaningfulValue(b.stoneWeight) || hasMeaningfulValue(b.stoneValue) },
    { label: 'Making & Labour', value: b.labour, show: hasMeaningfulValue(b.labour) },
  ].filter((row) => row.show)
})

const showBreakup = computed(() => {
  const rows = breakupRows.value
  if (!rows.length) return false
  const firstRow = rows[0]
  const onlyLabourEqualsTotal =
    rows.length === 1 && firstRow?.label === 'Making & Labour' && firstRow?.value === product.value?.breakup.total
  return !onlyLabourEqualsTotal
})

const WEIGHT_DETAIL_LABELS = new Set(['gross weight', 'diamond carats', 'gold weight', 'stone weight'])

function shouldShowWeightDisclaimer(label: string) {
  return WEIGHT_DETAIL_LABELS.has(label.trim().toLowerCase())
}

// Catalogue values are stored as lists (the admin tools still record every
// variant a piece has been made in); the storefront states the first one as
// this piece's spec.
function productSpec(key: keyof ProductCustomizationOptions): string {
  const values = product.value?.customizationOptions?.[key]
  if (Array.isArray(values) && values.length) return String(values[0]).trim()
  return ''
}

function setActiveImage(index: number) {
  if (!galleryImages.value.length) {
    activeImage.value = 0
    return
  }
  const lastIndex = galleryImages.value.length - 1
  activeImage.value = Math.min(Math.max(index, 0), lastIndex)
}

function showPreviousImage() {
  if (!galleryImages.value.length) return
  const lastIndex = galleryImages.value.length - 1
  activeImage.value = activeImage.value <= 0 ? lastIndex : activeImage.value - 1
}

function showNextImage() {
  if (!galleryImages.value.length) return
  const lastIndex = galleryImages.value.length - 1
  activeImage.value = activeImage.value >= lastIndex ? 0 : activeImage.value + 1
}

function scrollThumbs(direction: 'prev' | 'next') {
  if (!thumbsRef.value) return
  const delta = Math.max(thumbsRef.value.clientWidth * 0.75, 180)
  thumbsRef.value.scrollBy({
    left: direction === 'next' ? delta : -delta,
    behavior: 'smooth',
  })
}

onMounted(async () => {
  await ensureProductsLoaded()
})

watch(product, (item) => {
  activeImage.value = 0
  addedImages.value = []
  if (item) {
    setPageMeta({ title: item.title, description: item.description })
    setProductJsonLd(item)
  }
}, { immediate: true })

watch(galleryImages, (images) => {
  if (!images.length) {
    activeImage.value = 0
    return
  }
  if (activeImage.value >= images.length) activeImage.value = images.length - 1
})

watch(activeImage, async (index) => {
  await nextTick()
  const container = thumbsRef.value
  const activeThumb = container?.querySelector<HTMLElement>(`[data-thumb-index="${index}"]`)
  activeThumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
})

// Whether this piece is already sitting in the cart, so returning to the page
// says so instead of offering it as if it were never added.
const added = computed(() =>
  product.value ? cartItems.some((item) => item.product.slug === product.value!.slug) : false,
)

async function handleAddToCart() {
  if (!product.value || addingToCart.value) return

  addingToCart.value = true
  try {
    await addToCart(product.value, 1)
  } catch (err) {
    console.error('Add to cart failed:', err)
  } finally {
    addingToCart.value = false
  }
}

// --- Video consultation shortlist ---
const showVideoCallOption = computed(() => (product.value ? videoCallEligible(product.value) : false))
const addedToVideoCall = computed(() => (product.value ? inVideoCallList(product.value.slug) : false))
const videoCallMessage = ref('')

function handleAddToVideoCall() {
  if (!product.value) return
  const result = addToVideoCall(product.value)
  videoCallMessage.value = result.ok || result.reason === 'duplicate'
    ? ''
    : result.reason === 'full'
      ? `You can bring up to ${videoCallMaxItems.value} pieces to one call. Remove one to add this.`
      : 'This piece isn’t available for a video consultation.'
}
</script>

<template>
  <section v-if="product" class="ect-pt-28 sm:ect-pt-36 ect-pb-28 ect-px-4 sm:ect-px-6 ect-bg-cream ect-min-h-screen">
    <article class="ect-max-w-6xl ect-mx-auto">
      <button
        type="button"
        class="ect-inline-flex ect-items-center ect-gap-1.5 ect-font-body ect-text-xs ect-uppercase ect-tracking-[0.15em] ect-text-charcoal/45 hover:ect-text-gold-700 ect-transition-colors ect-mb-8"
        @click="goBack"
      >
        <svg class="ect-w-3.5 ect-h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back
      </button>

      <section class="product-detail-hero">
        <section class="product-detail-gallery">
          <figure
            ref="stageRef"
            class="product-detail-stage ect-relative ect-w-full ect-aspect-square ect-rounded-2xl ect-overflow-hidden ect-bg-champagne ect-shadow-luxe-sm ect-border ect-border-sand"
            :class="{ 'product-detail-stage--zooming': zoomActive }"
            @mouseenter="startZoom"
            @mouseleave="stopZoom"
            @mousemove="moveZoom"
          >
            <img
              v-if="galleryImages[activeImage]"
              :src="galleryImages[activeImage]"
              :alt="product.title"
              decoding="async"
              class="ect-w-full ect-h-full ect-object-cover"
            />
            <ImageWatermark v-if="galleryImages[activeImage]" :opacity="0.5" :scale="0.1" />
            <div
              v-if="zoomActive && galleryImages[activeImage]"
              class="product-detail-lens"
              :style="lensStyle"
              aria-hidden="true"
            />
            <span
              v-if="galleryImages[activeImage]"
              class="product-detail-zoom-hint ect-pointer-events-none ect-absolute ect-bottom-4 ect-right-4 ect-inline-flex ect-items-center ect-gap-1.5 ect-rounded-full ect-bg-white/88 ect-px-3 ect-py-1 ect-font-body ect-text-[11px] ect-font-semibold ect-text-charcoal ect-shadow-sm"
            >
              <svg class="ect-h-3.5 ect-w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
              </svg>
              Hover to zoom
            </span>
            <div v-if="galleryImages.length > 1" class="ect-pointer-events-none ect-absolute ect-inset-x-0 ect-top-0 ect-z-10 ect-flex ect-items-start ect-justify-between ect-p-4">
              <span class="ect-pointer-events-auto ect-inline-flex ect-items-center ect-rounded-full ect-bg-white/88 ect-px-3 ect-py-1 ect-font-body ect-text-[11px] ect-font-semibold ect-text-charcoal ect-shadow-sm">
                {{ activeImage + 1 }} / {{ galleryImages.length }}
              </span>
            </div>
            <div v-if="galleryImages.length > 1" class="ect-absolute ect-inset-x-0 ect-top-1/2 ect-z-10 ect-flex ect--translate-y-1/2 ect-items-center ect-justify-between ect-px-3">
              <button
                type="button"
                aria-label="Show previous image"
                class="ect-inline-flex ect-h-10 ect-w-10 ect-items-center ect-justify-center ect-rounded-full ect-bg-white/88 ect-text-charcoal ect-shadow-md ect-transition hover:ect-bg-white"
                @click="showPreviousImage"
              >
                <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Show next image"
                class="ect-inline-flex ect-h-10 ect-w-10 ect-items-center ect-justify-center ect-rounded-full ect-bg-white/88 ect-text-charcoal ect-shadow-md ect-transition hover:ect-bg-white"
                @click="showNextImage"
              >
                <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
            <span v-else class="ect-w-full ect-h-full ect-flex ect-items-center ect-justify-center">
              <svg class="ect-w-16 ect-h-16 ect-text-gold-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </span>
          </figure>

          <div v-if="galleryImages.length > 1" class="ect-mt-4 ect-flex ect-items-center ect-gap-2 sm:ect-gap-3">
            <button
              v-if="showThumbRailControls"
              type="button"
              aria-label="Scroll image thumbnails left"
              class="ect-inline-flex ect-h-8 ect-w-8 sm:ect-h-10 sm:ect-w-10 ect-shrink-0 ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-sand ect-bg-white/90 ect-text-charcoal ect-shadow-sm ect-transition hover:ect-border-gold-300 hover:ect-bg-white"
              @click="scrollThumbs('prev')"
            >
              <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            <ul
              ref="thumbsRef"
              class="product-detail-thumbs ect-flex ect-gap-2 sm:ect-gap-3 ect-list-none ect-m-0 ect-p-0 ect-overflow-x-auto"
            >
              <li v-for="(img, idx) in galleryImages" :key="`${img}-${idx}`" class="ect-shrink-0">
                <button
                  type="button"
                  :data-thumb-index="idx"
                  @click="setActiveImage(idx)"
                  class="ect-w-14 ect-h-14 sm:ect-w-20 sm:ect-h-20 ect-rounded-xl ect-overflow-hidden ect-border-2 ect-transition-all focus:ect-outline-none focus-visible:ect-ring-2 focus-visible:ect-ring-gold-300 focus-visible:ect-ring-offset-2"
                  :class="activeImage === idx ? 'ect-border-gold-400 ect-shadow-sm' : 'ect-border-sand ect-opacity-75 hover:ect-border-gold-300 hover:ect-opacity-100'"
                  :aria-current="activeImage === idx ? 'true' : undefined"
                >
                  <img :src="img" :alt="`${product.title} view ${idx + 1}`" loading="lazy" decoding="async" class="ect-w-full ect-h-full ect-object-cover" />
                </button>
              </li>
            </ul>

            <button
              v-if="showThumbRailControls"
              type="button"
              aria-label="Scroll image thumbnails right"
              class="ect-inline-flex ect-h-8 ect-w-8 sm:ect-h-10 sm:ect-w-10 ect-shrink-0 ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-sand ect-bg-white/90 ect-text-charcoal ect-shadow-sm ect-transition hover:ect-border-gold-300 hover:ect-bg-white"
              @click="scrollThumbs('next')"
            >
              <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </section>

        <section class="product-detail-content">
          <p class="ect-inline-flex ect-items-center ect-gap-2 ect-font-body ect-text-[11px] ect-uppercase ect-tracking-[0.2em] ect-text-gold-700 ect-mb-2">
            <span class="ect-w-6 ect-h-px ect-bg-gold-400" />
            {{ product.category }} · {{ product.material }}
          </p>
          <h1 class="ect-font-display ect-text-3xl sm:ect-text-4xl ect-font-light ect-text-charcoal ect-leading-[1.1] ect-mb-3">
            {{ product.title }}
          </h1>

          <div class="ect-flex ect-flex-wrap ect-items-center ect-gap-x-4 ect-gap-y-2 ect-mb-5">
            <p v-if="hasRetailPrice" class="ect-font-display ect-text-2xl ect-text-charcoal">{{ product.price }}</p>
            <p v-else class="ect-font-body ect-text-sm ect-text-gold-700 ect-font-medium">Price on request</p>
            <div v-if="reviewSummary" class="ect-inline-flex ect-items-center ect-gap-2 ect-text-charcoal/55">
              <StarRating :rating="product.rating || 0" size="sm" />
              <span class="ect-font-body ect-text-sm">{{ reviewSummary }}</span>
            </div>
          </div>

          <div v-if="productBadges.length" class="ect-flex ect-flex-wrap ect-gap-2 ect-mb-5">
            <span
              v-for="badge in productBadges"
              :key="badge"
              class="ect-inline-flex ect-items-center ect-rounded-full ect-bg-champagne ect-px-3 ect-py-1 ect-font-body ect-text-[10px] ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-gold-700 ect-border ect-border-gold-200"
            >
              {{ badge }}
            </span>
          </div>

          <p
            v-if="product.description"
            class="ect-font-body ect-text-[15px] ect-leading-7 ect-text-charcoal/65 ect-mb-8"
          >
            {{ product.description }}
          </p>

          <section
            v-if="productDetailRows.length"
            class="ect-mb-8 ect-bg-white ect-rounded-2xl ect-border ect-border-sand ect-shadow-card ect-p-5 sm:ect-p-6"
          >
            <header class="ect-mb-5">
              <h2 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-widest ect-text-charcoal/50">Specifications</h2>
            </header>

            <dl class="ect-grid ect-grid-cols-1 sm:ect-grid-cols-2 ect-gap-x-6 ect-gap-y-3">
              <div v-for="row in productDetailRows" :key="row.label" class="ect-flex ect-flex-col ect-gap-0.5">
                <dt class="ect-font-body ect-text-[10px] ect-font-semibold ect-uppercase ect-tracking-[0.14em] ect-text-charcoal/45">
                  <span class="ect-inline-flex ect-items-center ect-gap-1">
                    <span>{{ row.label }}</span>
                    <span
                      v-if="shouldShowWeightDisclaimer(row.label)"
                      class="ect-relative ect-inline-flex ect-items-center ect-justify-center ect-group/disclaimer"
                    >
                      <span
                        class="ect-inline-flex ect-h-4 ect-w-4 ect-items-center ect-justify-center ect-text-gold-500/90"
                        aria-label="Weight disclaimer"
                      >
                        <svg class="ect-h-4 ect-w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M11 17h2v-6h-2v6zm1-8.75a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z" />
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                        </svg>
                      </span>
                      <span class="ect-pointer-events-none ect-absolute ect-bottom-full ect-left-1/2 ect-z-10 ect-mb-2 ect-w-52 -ect-translate-x-1/2 ect-rounded-xl ect-bg-charcoal ect-px-3 ect-py-2 ect-text-center ect-font-body ect-text-[11px] ect-font-normal ect-normal-case ect-leading-4 ect-tracking-normal ect-text-white ect-opacity-0 ect-shadow-lg ect-transition-opacity group-hover/disclaimer:ect-opacity-100">
                        Weights and stone measurements may vary slightly. Photos are for representation purposes only.
                      </span>
                    </span>
                  </span>
                </dt>
                <dd class="ect-font-body ect-text-sm ect-text-charcoal ect-tabular-nums">{{ row.value }}</dd>
              </div>
            </dl>

          </section>

          <VolumeDiscountInfo class="ect-mt-5" label="Volume discount available" />

          <div class="ect-mt-3 ect-flex ect-flex-col sm:ect-flex-row ect-items-stretch sm:ect-items-center ect-gap-3">
            <button
              type="button"
              @click="handleAddToCart"
              :disabled="addingToCart"
              class="ect-flex-1 ect-inline-flex ect-items-center ect-justify-center ect-gap-2 ect-px-7 ect-py-3.5 ect-rounded-full ect-text-white ect-font-body ect-text-sm ect-font-semibold ect-shadow-sm ect-transition-colors"
              :class="addingToCart ? 'ect-bg-rose-300 ect-cursor-wait' : added ? 'ect-bg-rose-700' : 'ect-bg-rose-600 hover:ect-bg-rose-700'"
            >
              <svg v-if="addingToCart" class="ect-w-4 ect-h-4 ect-animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="ect-opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3.5" />
                <path class="ect-opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
              </svg>
              <svg v-else-if="added" class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <svg v-else class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272" />
              </svg>
              <span v-if="addingToCart">Adding…</span>
              <span v-else>{{ added ? 'Added to Cart' : 'Add to Cart' }}</span>
            </button>
            <RouterLink
              v-if="added"
              to="/cart"
              class="ect-inline-flex ect-items-center ect-justify-center ect-px-6 ect-py-3.5 ect-rounded-full ect-border ect-border-rose-200 ect-bg-white ect-font-body ect-text-sm ect-font-semibold ect-text-rose-700 hover:ect-bg-rose-50 ect-transition-colors"
            >
              View Cart
            </RouterLink>
          </div>

          <!-- Video consultation: shortlist this piece for a call with an expert -->
          <div v-if="showVideoCallOption" class="ect-mt-3">
            <div class="ect-flex ect-flex-col sm:ect-flex-row ect-items-stretch sm:ect-items-center ect-gap-3">
              <button
                type="button"
                @click="handleAddToVideoCall"
                :disabled="addedToVideoCall || (videoCallListFull && !addedToVideoCall)"
                class="ect-flex-1 ect-inline-flex ect-items-center ect-justify-center ect-gap-2 ect-px-7 ect-py-3.5 ect-rounded-full ect-border ect-font-body ect-text-sm ect-font-semibold ect-transition-colors disabled:ect-cursor-default"
                :class="addedToVideoCall
                  ? 'ect-border-emerald-600 ect-bg-emerald-600 ect-text-white ect-shadow-sm'
                  : videoCallListFull
                  ? 'ect-border-sand ect-bg-white ect-text-charcoal/35'
                  : 'ect-border-charcoal/15 ect-bg-white ect-text-charcoal hover:ect-border-gold-400 hover:ect-text-gold-700'"
              >
                <svg v-if="addedToVideoCall" class="ect-w-[18px] ect-h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                </svg>
                <svg v-else class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h8.25a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span>{{ addedToVideoCall ? 'Added to video call' : 'Add to Video Call' }}</span>
              </button>
              <RouterLink
                v-if="addedToVideoCall"
                to="/video-consultation"
                class="ect-inline-flex ect-items-center ect-justify-center ect-px-6 ect-py-3.5 ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal hover:ect-border-gold-400 hover:ect-text-gold-700 ect-transition-colors"
              >
                Book the call
              </RouterLink>
            </div>
            <p v-if="videoCallMessage" class="ect-mt-2 ect-font-body ect-text-xs ect-text-red-600">{{ videoCallMessage }}</p>
            <p v-else class="ect-mt-2 ect-font-body ect-text-xs ect-text-charcoal/45">See this piece live on a private video call — shortlist up to {{ videoCallMaxItems }} pieces.</p>
          </div>

          <p class="ect-mt-3 ect-font-body ect-text-xs ect-leading-5 ect-text-charcoal/45">
            Product details may vary slightly. Photos are for representation purposes only.
          </p>

          <p class="ect-mt-3 ect-mb-8 ect-font-body ect-text-xs ect-text-charcoal/45 ect-flex ect-items-center ect-gap-1.5">
            <svg class="ect-w-3.5 ect-h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Free shipping · Insured delivery · Made to order
          </p>
        </section>
      </section>

      <section
        v-if="product.details?.length || showBreakup"
        class="ect-mt-16 ect-pt-12 ect-border-t ect-border-sand ect-grid ect-grid-cols-1 ect-gap-5"
        :class="product.details?.length && showBreakup ? 'md:ect-grid-cols-2' : ''"
      >
        <section v-if="product.details?.length" class="ect-bg-white ect-rounded-2xl ect-border ect-border-sand ect-shadow-card ect-p-5 sm:ect-p-6">
          <h2 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-widest ect-text-charcoal/50 ect-mb-4">Product Details</h2>
          <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-2.5">
            <li v-for="detail in product.details" :key="detail" class="ect-flex ect-gap-2.5">
              <span class="ect-mt-2 ect-w-1 ect-h-1 ect-rounded-full ect-bg-gold-400 ect-shrink-0" />
              <span class="ect-font-body ect-text-sm ect-leading-6 ect-text-charcoal/70">{{ detail }}</span>
            </li>
          </ul>
        </section>

        <section v-if="showBreakup" class="ect-bg-white ect-rounded-2xl ect-border ect-border-sand ect-shadow-card ect-p-5 sm:ect-p-6">
          <h2 class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-widest ect-text-charcoal/50 ect-mb-4">Price Breakup</h2>
          <dl class="ect-space-y-2.5">
            <div v-for="row in breakupRows" :key="row.label" class="ect-flex ect-items-center ect-justify-between ect-gap-4">
              <dt class="ect-font-body ect-text-sm ect-text-charcoal/60">{{ row.label }}</dt>
              <dd class="ect-font-body ect-text-sm ect-text-charcoal ect-tabular-nums">{{ row.value }}</dd>
            </div>
            <div class="ect-flex ect-items-center ect-justify-between ect-gap-4 ect-pt-3 ect-border-t ect-border-sand">
              <dt class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Total</dt>
              <dd class="ect-font-display ect-text-lg ect-text-charcoal ect-tabular-nums">{{ product.breakup.total }}</dd>
            </div>
          </dl>
        </section>
      </section>

      <section v-if="SITE_SETTINGS.enableReviews" class="ect-mt-16 ect-pt-12 ect-border-t ect-border-sand">
        <header class="ect-mb-6">
          <p class="ect-inline-flex ect-items-center ect-gap-2 ect-font-body ect-text-[11px] ect-uppercase ect-tracking-[0.2em] ect-text-gold-700 ect-mb-2">
            <span class="ect-w-6 ect-h-px ect-bg-gold-400" />
            Customer voices
          </p>
          <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-font-light ect-text-charcoal">Reviews</h2>
        </header>
        <ul v-if="reviews.length" class="ect-list-none ect-m-0 ect-p-0 ect-space-y-3">
          <li
            v-for="review in reviews"
            :key="review.id"
            class="ect-bg-white ect-rounded-2xl ect-border ect-border-sand ect-shadow-card ect-p-5"
          >
            <div class="ect-flex ect-flex-wrap ect-items-center ect-gap-2 ect-mb-2">
              <StarRating :rating="review.rating" size="sm" />
              <span class="ect-font-body ect-text-sm ect-font-medium ect-text-charcoal">{{ review.author }}</span>
              <span class="ect-font-body ect-text-xs ect-text-charcoal/45">· {{ review.date }}</span>
            </div>
            <p class="ect-font-body ect-text-sm ect-leading-6 ect-text-charcoal/70 ect-m-0">{{ review.text }}</p>
          </li>
        </ul>
        <p v-else class="ect-bg-white ect-rounded-2xl ect-border ect-border-sand ect-shadow-card ect-px-6 ect-py-8 ect-font-body ect-text-sm ect-text-charcoal/50 ect-text-center">
          No reviews yet. Be the first to review this piece.
        </p>
      </section>

      <section v-if="relatedProducts.length" class="ect-mt-16 ect-pt-12 ect-border-t ect-border-sand">
        <header class="ect-mb-6 sm:ect-mb-8">
          <p class="ect-inline-flex ect-items-center ect-gap-2 ect-font-body ect-text-[11px] ect-uppercase ect-tracking-[0.2em] ect-text-gold-700 ect-mb-2">
            <span class="ect-w-6 ect-h-px ect-bg-gold-400" />
            Discover more
          </p>
          <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-font-light ect-text-charcoal">You may also like</h2>
        </header>
        <ul class="ect-list-none ect-m-0 ect-p-0 ect-grid ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-4 sm:ect-gap-6">
          <li v-for="related in relatedProducts" :key="related.slug" class="ect-h-full">
            <ProductCard
              :slug="related.slug"
              :title="related.title"
              :category="related.category"
              :material="related.material"
              :price="related.price"
              :images="related.images"
              :product="related"
            />
          </li>
        </ul>
      </section>
    </article>
  </section>

  <section v-else-if="loading" class="ect-pt-28 sm:ect-pt-36 ect-pb-28 ect-px-6 ect-bg-cream ect-min-h-screen ect-flex ect-flex-col ect-items-center ect-justify-center ect-text-center">
    <span class="ect-inline-block ect-w-10 ect-h-10 ect-rounded-full ect-border-2 ect-border-sand ect-border-t-charcoal ect-animate-spin ect-mb-5" aria-hidden="true" />
    <p class="ect-font-body ect-text-sm ect-uppercase ect-tracking-[0.15em] ect-text-charcoal/55">Loading product</p>
  </section>

  <section v-else class="ect-pt-28 sm:ect-pt-36 ect-pb-28 ect-px-6 ect-bg-cream ect-min-h-screen ect-flex ect-flex-col ect-items-center ect-justify-center ect-text-center">
    <span class="ect-w-20 ect-h-20 ect-rounded-full ect-bg-champagne ect-flex ect-items-center ect-justify-center ect-mb-6">
      <svg class="ect-w-9 ect-h-9 ect-text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    </span>
    <h1 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal ect-mb-2">Product not found</h1>
    <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mb-7 ect-max-w-xs">The piece you're looking for doesn't exist or may have been removed.</p>
    <RouterLink
      to="/"
      class="ect-inline-flex ect-items-center ect-gap-2 ect-px-7 ect-py-3.5 ect-bg-charcoal ect-text-white ect-font-body ect-text-sm ect-font-semibold ect-rounded-full hover:ect-bg-noir ect-transition-colors"
    >
      <svg class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
      Browse Collections
    </RouterLink>
  </section>
</template>

<style scoped>
.product-detail-stage--zooming {
  cursor: crosshair;
}

.product-detail-stage--zooming .product-detail-zoom-hint {
  opacity: 0;
}

.product-detail-zoom-hint {
  transition: opacity 0.2s ease;
}

@media (hover: none), (pointer: coarse) {
  .product-detail-zoom-hint {
    display: none;
  }
}

.product-detail-lens {
  position: absolute;
  width: 170px;
  height: 170px;
  border-radius: 9999px;
  pointer-events: none;
  background-repeat: no-repeat;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow:
    0 0 0 1px rgba(201, 162, 39, 0.45),
    0 12px 30px rgba(28, 25, 23, 0.28);
  z-index: 5;
}

.product-detail-thumbs {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.product-detail-thumbs::-webkit-scrollbar {
  display: none;
}

.product-detail-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2rem;
  align-items: start;
}

.product-detail-gallery {
  position: relative;
}

@media (min-width: 900px) {
  .product-detail-hero {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 3rem;
  }

  .product-detail-gallery {
    position: sticky;
    top: 8rem;
  }
}

@media (min-width: 1280px) {
  .product-detail-hero {
    gap: 4rem;
  }
}

.ect-line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
