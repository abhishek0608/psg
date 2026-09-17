<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHeaderOffset } from '../composables/useHeaderOffset'
import { useHomepageSlides, type HomepageSlide } from '../composables/useHomepageSlides'
import { defaultHomepageSlides } from '../data/homepageCampaign'

const router = useRouter()
const { headerOffset } = useHeaderOffset()
const { slides, loaded, ensureHomepageSlidesLoaded } = useHomepageSlides()
const isMobile = ref(false)
const prefersReducedMotion = ref(false)
const paused = ref(false)
const hovering = ref(false)
const focusWithin = ref(false)
const pageHidden = ref(false)
const activeSlideIndex = ref(0)
const failedImages = ref(new Set<string>())
let mobileQuery: MediaQueryList | null = null
let motionQuery: MediaQueryList | null = null
let autoRotateHandle: number | null = null

function syncMobile(event: MediaQueryList | MediaQueryListEvent) { isMobile.value = event.matches }
function syncMotion(event: MediaQueryList | MediaQueryListEvent) { prefersReducedMotion.value = event.matches }
function syncVisibility() { pageHidden.value = document.hidden }
function resolveImageUrl(slide: HomepageSlide) {
  if (!isMobile.value) return slide.imageUrl || ''
  return slide.mobileImageUrl || (slide.device === 'mobile' ? slide.imageUrl : '')
}
function usableSlides(items: HomepageSlide[]) {
  return items.filter((slide) => {
    const device = slide.device || 'all'
    const image = resolveImageUrl(slide)
    return slide.active !== false &&
      (device === 'all' || device === (isMobile.value ? 'mobile' : 'desktop')) &&
      Boolean(image.trim()) && !failedImages.value.has(image)
  }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
}
// Legacy video-only records do not suppress the new S3 image campaign.
// Images configured in the internal editor take precedence per device.
const activeSlides = computed(() => {
  const configured = usableSlides(slides.value)
  return configured.length ? configured : usableSlides(defaultHomepageSlides)
})
const currentSlide = computed(() => activeSlides.value[activeSlideIndex.value] || null)
const showSkeleton = computed(() => !loaded.value)
function stopAutoRotate() {
  if (autoRotateHandle !== null) window.clearInterval(autoRotateHandle)
  autoRotateHandle = null
}
function startAutoRotate() {
  stopAutoRotate()
  if (!loaded.value || activeSlides.value.length <= 1 || prefersReducedMotion.value ||
      paused.value || hovering.value || focusWithin.value || pageHidden.value) return
  autoRotateHandle = window.setInterval(showNextSlide, 6000)
}
function goToSlide(index: number) {
  const total = activeSlides.value.length
  activeSlideIndex.value = total ? ((index % total) + total) % total : 0
  startAutoRotate()
}
function showNextSlide() { goToSlide(activeSlideIndex.value + 1) }
function showPreviousSlide() { goToSlide(activeSlideIndex.value - 1) }
function onFocusOut(event: FocusEvent) {
  focusWithin.value = (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)
}
function navigateTo(href: string) {
  const target = href.trim()
  if (!target) return
  if (target.startsWith('#')) {
    document.getElementById(target.slice(1))?.scrollIntoView({ behavior: prefersReducedMotion.value ? 'auto' : 'smooth' })
  } else if (/^https?:\/\//i.test(target)) {
    window.location.href = target
  } else {
    void router.push(target)
  }
}
watch(activeSlides, () => { activeSlideIndex.value = 0; startAutoRotate() })
watch([prefersReducedMotion, paused, hovering, focusWithin, pageHidden, loaded], startAutoRotate)
onMounted(async () => {
  mobileQuery = window.matchMedia('(max-width: 767px)')
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncMobile(mobileQuery)
  syncMotion(motionQuery)
  mobileQuery.addEventListener('change', syncMobile)
  motionQuery.addEventListener('change', syncMotion)
  document.addEventListener('visibilitychange', syncVisibility)
  syncVisibility()
  await ensureHomepageSlidesLoaded()
  startAutoRotate()
})
onUnmounted(() => {
  stopAutoRotate()
  mobileQuery?.removeEventListener('change', syncMobile)
  motionQuery?.removeEventListener('change', syncMotion)
  document.removeEventListener('visibilitychange', syncVisibility)
})
</script>

<template>
  <!-- Campaign artwork stays unobstructed. -->
  <section
    class="ect-relative ect-w-full ect-overflow-hidden ect-bg-[#efe7d6]"
    :style="{ marginTop: headerOffset + 'px' }"
    aria-label="Featured jewellery collections"
    aria-roledescription="carousel"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="focusWithin = true"
    @focusout="onFocusOut"
    @keydown.left.prevent="showPreviousSlide"
    @keydown.right.prevent="showNextSlide"
  >
    <div class="campaign-frame">
      <!-- Loading frame: same height as the banner, deliberately wordless. -->
      <div
        v-if="showSkeleton"
        class="ect-absolute ect-inset-0 ect-animate-pulse ect-bg-[linear-gradient(110deg,#efe7d6_0%,#faf7f2_45%,#efe7d6_90%)]"
        aria-busy="true"
        aria-label="Loading homepage banner"
      />

      <template v-else-if="activeSlides.length && currentSlide">
        <div
          v-for="(slide, index) in activeSlides"
          :key="slide.id || `${slide.imageUrl}-${index}`"
          class="campaign-slide"
          :class="{ 'is-active': index === activeSlideIndex }"
          :aria-hidden="index !== activeSlideIndex"
          :inert="index !== activeSlideIndex"
          role="group"
          aria-roledescription="slide"
          :aria-label="`${index + 1} of ${activeSlides.length}`"
        >
          <img
            :src="resolveImageUrl(slide)"
            :alt="slide.headline || 'Homepage jewellery campaign'"
            :style="{ objectPosition: slide.imagePosition || 'center' }"
            :fetchpriority="index === 0 ? 'high' : 'auto'"
            decoding="async"
            class="ect-h-full ect-w-full ect-object-cover"
            @error="failedImages.add(resolveImageUrl(slide))"
          />
          <a
            v-if="slide.ctaHref && !slide.ctaLabel"
            :href="slide.ctaHref"
            class="campaign-artwork-link"
            :aria-label="`${slide.headline || 'Explore jewellery'} — shop collection`"
            @click.prevent="navigateTo(slide.ctaHref)"
          />
        </div>
        <!-- Uploaded artwork carries its own typography. -->
        <button
          v-if="currentSlide.ctaLabel && currentSlide.ctaHref"
          type="button"
          class="ect-absolute ect-bottom-7 ect-left-1/2 -ect-translate-x-1/2 ect-z-[3] ect-inline-flex ect-items-center ect-gap-2 ect-rounded-full ect-bg-[#1f3f37] ect-px-6 ect-py-3 sm:ect-bottom-9 sm:ect-px-8 sm:ect-py-3.5 ect-font-body ect-text-ui ect-font-semibold ect-uppercase ect-tracking-label ect-text-[#f4ecd9] ect-shadow-[0_12px_30px_rgba(26,22,19,0.22)] hover:ect-bg-[#17342d] ect-transition-colors"
          @click="navigateTo(currentSlide.ctaHref)"
        >
          {{ currentSlide.ctaLabel }}
          <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </template>

      <!-- A complete editorial hero when no campaign is configured. -->
      <div v-else class="campaign-fallback">
        <div class="campaign-fallback-copy">
          <p class="ect-eyebrow">THE JEWELET COLLECTION</p>
          <p>For the moments you celebrate, and the ones you make your own. Discover jewellery that feels like you.</p>
        </div>
        <img src="/editorial-everyday-diamonds.webp" alt="A considered selection of everyday diamond jewellery" fetchpriority="high" />
      </div>

      <!-- Prev / next arrows -->
      <template v-if="!showSkeleton && activeSlides.length > 1">
        <button
          type="button"
          aria-label="Show previous slide"
          data-carousel-arrow="previous"
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
          data-carousel-arrow="next"
          class="ect-absolute ect-right-4 ect-top-1/2 -ect-translate-y-1/2 ect-z-[2] ect-inline-flex ect-h-10 ect-w-10 ect-items-center ect-justify-center ect-rounded-full ect-bg-[#faf7f2]/85 ect-text-[#2b2723] ect-backdrop-blur-md ect-shadow-card ect-transition-all hover:ect-bg-white"
          @click="showNextSlide"
        >
          <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        <button
          v-if="!prefersReducedMotion"
          type="button"
          class="campaign-pause"
          :aria-label="paused ? 'Play slideshow' : 'Pause slideshow'"
          :aria-pressed="paused"
          @click="paused = !paused"
        >{{ paused ? 'Play' : 'Pause' }}</button>

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
            :aria-current="activeSlideIndex === index ? 'true' : undefined"
            @click="goToSlide(index)"
          />
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.campaign-frame { position: relative; aspect-ratio: 1983 / 793; }
.campaign-slide { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity .5s ease; }
.campaign-slide.is-active { opacity: 1; pointer-events: auto; }
.campaign-artwork-link { position: absolute; inset: 0; }
.campaign-artwork-link:focus-visible { outline: 3px solid #fff8df; outline-offset: -6px; }
.campaign-pause { position: absolute; right: 16px; bottom: 16px; z-index: 2; padding: 7px 12px; border-radius: 20px; color: #fff8df; background: #2b272399; font-size: 11px; }
@media (prefers-reduced-motion: reduce) { .campaign-slide { transition: none; } }

.campaign-fallback .ect-eyebrow { color: #796343; font-size: 10px; line-height: 1.5; }
.campaign-fallback { display: grid; grid-template-columns: 1fr 1fr; height: 100%; background: #eee7db; }
.campaign-fallback-copy { align-self: center; padding: 40px 10%; }
.campaign-fallback-copy > p:not(.ect-eyebrow) { max-width: 380px; font-size: 15px; line-height: 1.7; color: #6b655a; margin-bottom: 24px; }
.campaign-fallback > img { width: 100%; height: 100%; object-fit: cover; min-height: 0; }
@media (max-width: 767px) {
  .campaign-frame { aspect-ratio: 660 / 793; }
  [data-carousel-arrow] { top: auto; bottom: 14px; transform: none; width: 32px; height: 32px; }
  [data-carousel-arrow="next"] { left: 56px; right: auto; }
  .campaign-fallback { grid-template-columns: 1fr; position: relative; }
  .campaign-fallback-copy { position: relative; z-index: 1; padding: 28px 24px; background: linear-gradient(90deg, #eee7db 30%, #eee7dbdd 70%, #eee7db88); height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
  .campaign-fallback > img { position: absolute; inset: 0; }
}
</style>
