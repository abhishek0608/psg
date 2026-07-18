<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHeaderOffset } from '../composables/useHeaderOffset'
import { useHomepageSlides } from '../composables/useHomepageSlides'

const router = useRouter()
// The header is fixed; offset the hero by its live height so the image is
// never clipped behind it.
const { headerOffset } = useHeaderOffset()
const { slides, ensureHomepageSlidesLoaded } = useHomepageSlides()

const MOBILE_QUERY = '(max-width: 767px)'
const isMobile = ref(false)
let mobileQuery: MediaQueryList | null = null
function syncIsMobile(event: MediaQueryList | MediaQueryListEvent) {
  isMobile.value = event.matches
}

// Resolve the image a slide should show on the current device. On mobile we use
// the dedicated mobile asset (a mobile-only slide stores it in `imageUrl`); we
// never fall back to the desktop image there.
function resolveImageUrl(slide: { imageUrl?: string; mobileImageUrl?: string; device?: string } | null) {
  if (!slide) return ''
  if (isMobile.value) {
    if (String(slide.mobileImageUrl || '').trim()) return String(slide.mobileImageUrl)
    if ((slide.device || 'all') === 'mobile') return String(slide.imageUrl || '')
    return ''
  }
  return String(slide.imageUrl || '')
}

// Every active slide that has a usable image for the current device, in order.
const activeSlides = computed(() =>
  slides.value
    .filter((slide) => {
      if (slide?.active === false) return false
      const device = slide?.device || 'all'
      if (device !== 'all' && (isMobile.value ? device !== 'mobile' : device !== 'desktop')) {
        return false
      }
      return Boolean(resolveImageUrl(slide).trim())
    })
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)),
)

const activeSlideIndex = ref(0)
let autoRotateHandle: number | null = null

const currentSlide = computed(() => activeSlides.value[activeSlideIndex.value] || null)

// Overlay copy per slide. A slide with no copy shows its image clean (so banners
// with text baked in aren't doubled up); the editorial placeholder copy is only
// used when there are no slides at all.
const hasOverlayContent = computed(() => {
  const s = currentSlide.value
  if (!s) return false
  return Boolean(
    String(s.headline || '').trim() ||
      String(s.subheadline || '').trim() ||
      (String(s.ctaLabel || '').trim() && String(s.ctaHref || '').trim()),
  )
})

function goToSlide(index: number) {
  const total = activeSlides.value.length
  if (!total) {
    activeSlideIndex.value = 0
    return
  }
  activeSlideIndex.value = ((index % total) + total) % total
}
function showNextSlide() {
  goToSlide(activeSlideIndex.value + 1)
}
function showPreviousSlide() {
  goToSlide(activeSlideIndex.value - 1)
}

function stopAutoRotate() {
  if (autoRotateHandle != null) {
    window.clearInterval(autoRotateHandle)
    autoRotateHandle = null
  }
}
function startAutoRotate() {
  stopAutoRotate()
  if (activeSlides.value.length <= 1) return
  autoRotateHandle = window.setInterval(showNextSlide, 5000)
}

function navigateTo(href: string) {
  const target = href.trim()
  if (!target) return
  if (target.startsWith('#')) {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' })
    return
  }
  if (/^https?:\/\//i.test(target)) {
    window.location.href = target
    return
  }
  void router.push(target)
}

function handleSlideCta() {
  navigateTo(String(currentSlide.value?.ctaHref || ''))
}

watch(activeSlides, (next) => {
  if (!next.length) {
    activeSlideIndex.value = 0
    stopAutoRotate()
    return
  }
  if (activeSlideIndex.value >= next.length) activeSlideIndex.value = 0
  startAutoRotate()
})

onMounted(async () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    mobileQuery = window.matchMedia(MOBILE_QUERY)
    syncIsMobile(mobileQuery)
    mobileQuery.addEventListener('change', syncIsMobile)
  }
  await ensureHomepageSlidesLoaded()
  startAutoRotate()
})

onUnmounted(() => {
  stopAutoRotate()
  mobileQuery?.removeEventListener('change', syncIsMobile)
})
</script>

<template>
  <!-- Full-bleed campaign hero (Aurelle design) -->
  <section
    class="ect-relative ect-w-full ect-overflow-hidden ect-bg-[#efe7d6]"
    :style="{ marginTop: headerOffset + 'px' }"
  >
    <div class="ect-relative ect-h-[420px] sm:ect-h-[520px] lg:ect-h-[600px]">
      <template v-if="activeSlides.length && currentSlide">
        <!-- All slides stay mounted; the active one cross-fades in via opacity.
             (A <transition mode="out-in"> here left images stuck at opacity 0
             when auto-rotation interrupted an in-flight fade.) -->
        <img
          v-for="(slide, index) in activeSlides"
          :key="slide.id || `${slide.imageUrl}-${index}`"
          :src="resolveImageUrl(slide)"
          :alt="slide.headline || 'Homepage campaign image'"
          :fetchpriority="index === 0 ? 'high' : undefined"
          decoding="async"
          class="ect-absolute ect-inset-0 ect-h-full ect-w-full ect-object-cover ect-transition-opacity ect-duration-500"
          :class="index === activeSlideIndex ? 'ect-opacity-100' : 'ect-opacity-0'"
        />

        <!-- Legibility scrim + editorial copy, only when the slide has copy -->
        <template v-if="hasOverlayContent">
          <div
            class="ect-pointer-events-none ect-absolute ect-inset-0 ect-bg-[linear-gradient(180deg,rgba(20,18,15,0.02)_0%,rgba(20,18,15,0.08)_45%,rgba(20,18,15,0.55)_100%)]"
          />
          <div class="ect-absolute ect-inset-x-0 ect-bottom-0 ect-p-6 sm:ect-p-10 lg:ect-p-14">
            <div class="ect-max-w-7xl ect-mx-auto">
              <p
                v-if="currentSlide.subheadline"
                class="ect-font-body ect-text-[11px] ect-font-medium ect-uppercase ect-tracking-[0.24em] ect-text-[#f4ecd9]/85"
              >
                {{ currentSlide.subheadline }}
              </p>
              <h1
                v-if="currentSlide.headline"
                class="ect-mt-2 ect-font-display ect-text-4xl sm:ect-text-5xl lg:ect-text-6xl ect-font-medium ect-leading-[1.06] ect-text-[#faf7f2] [text-shadow:0_2px_12px_rgba(20,18,15,0.35)]"
              >
                {{ currentSlide.headline }}
              </h1>
              <button
                v-if="currentSlide.ctaLabel && currentSlide.ctaHref"
                type="button"
                class="ect-mt-5 ect-inline-flex ect-items-center ect-gap-2 ect-rounded-full ect-bg-[#f4ecd9] ect-px-7 ect-py-3.5 ect-font-body ect-text-[13px] ect-tracking-[0.05em] ect-text-[#1f3f37] hover:ect-bg-white ect-transition-colors"
                @click="handleSlideCta"
              >
                {{ currentSlide.ctaLabel }}
                <svg class="ect-w-3.5 ect-h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        </template>
      </template>

      <!-- Editorial placeholder when no campaign slides are configured -->
      <template v-else>
        <div
          class="ect-absolute ect-inset-0"
          style="background: radial-gradient(circle at 74% 28%, rgba(183,154,86,0.30), transparent 44%), linear-gradient(155deg, #f0e8d7 0%, #faf7f2 48%, #efe0d2 100%)"
        />
        <div class="ect-absolute ect-inset-x-0 ect-bottom-0 ect-p-6 sm:ect-p-10 lg:ect-p-14">
          <div class="ect-max-w-7xl ect-mx-auto">
            <p class="ect-font-body ect-text-[11px] ect-font-semibold ect-uppercase ect-tracking-[0.24em] ect-text-[#b79a56]">
              New diamond arrivals
            </p>
            <h1 class="ect-mt-2 ect-font-display ect-text-4xl sm:ect-text-5xl lg:ect-text-6xl ect-font-medium ect-leading-[1.06] ect-text-[#2b2723]">
              Jewellery that makes every day shine
            </h1>
            <p class="ect-mt-4 ect-max-w-xl ect-font-body ect-text-sm sm:ect-text-base ect-leading-7 ect-text-[#7a7264]">
              Shop certified gold and diamond designs with free shipping, lifetime exchange, and effortless returns.
            </p>
            <button
              type="button"
              class="ect-mt-6 ect-inline-flex ect-items-center ect-gap-2 ect-rounded-full ect-bg-[#1f3f37] ect-px-7 ect-py-3.5 ect-font-body ect-text-[13px] ect-tracking-[0.05em] ect-text-[#f4ecd9] hover:ect-bg-[#163029] ect-transition-colors"
              @click="navigateTo('#collections')"
            >
              Shop Now
              <svg class="ect-w-3.5 ect-h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </template>

      <!-- Prev / next arrows -->
      <template v-if="activeSlides.length > 1">
        <button
          type="button"
          aria-label="Show previous slide"
          class="ect-absolute ect-left-4 ect-top-1/2 -ect-translate-y-1/2 ect-z-[2] ect-inline-flex ect-h-10 ect-w-10 ect-items-center ect-justify-center ect-rounded-full ect-bg-[#faf7f2]/85 ect-text-[#2b2723] ect-backdrop-blur-md ect-shadow-card ect-transition-all hover:ect-bg-white"
          @click="showPreviousSlide"
        >
          <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Show next slide"
          class="ect-absolute ect-right-4 ect-top-1/2 -ect-translate-y-1/2 ect-z-[2] ect-inline-flex ect-h-10 ect-w-10 ect-items-center ect-justify-center ect-rounded-full ect-bg-[#faf7f2]/85 ect-text-[#2b2723] ect-backdrop-blur-md ect-shadow-card ect-transition-all hover:ect-bg-white"
          @click="showNextSlide"
        >
          <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        <!-- Slide indicator dots -->
        <div
          class="ect-absolute ect-bottom-4 ect-left-1/2 -ect-translate-x-1/2 ect-z-[2] ect-flex ect-items-center ect-gap-2 ect-rounded-full ect-bg-[#2b2723]/25 ect-px-3 ect-py-2 ect-backdrop-blur-md"
        >
          <button
            v-for="(slide, index) in activeSlides"
            :key="slide.id || `${slide.imageUrl}-${index}`"
            type="button"
            class="ect-h-1.5 ect-rounded-full ect-transition-all"
            :class="activeSlideIndex === index ? 'ect-w-7 ect-bg-[#f4ecd9]' : 'ect-w-2 ect-bg-[#f4ecd9]/45 hover:ect-bg-[#f4ecd9]/75'"
            :aria-label="`Show slide ${index + 1}`"
            @click="goToSlide(index)"
          />
        </div>
      </template>
    </div>
  </section>
</template>

