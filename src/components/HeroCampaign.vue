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
const activeSlideIndex = ref(0)
const failedImages = ref(new Set<string>())
let mobileQuery: MediaQueryList | null = null
let motionQuery: MediaQueryList | null = null
let autoRotateHandle: number | null = null

function syncMobile(event: MediaQueryList | MediaQueryListEvent) { isMobile.value = event.matches }
function syncMotion(event: MediaQueryList | MediaQueryListEvent) { prefersReducedMotion.value = event.matches }
function resolveImageUrl(slide: HomepageSlide) {
  if (!isMobile.value) return slide.imageUrl || ''
  return slide.mobileImageUrl || (slide.device === 'mobile' ? slide.imageUrl : '')
}
// Editorial slides compose their own copy, so one photograph serves both
// breakpoints — there is no mobile-only crop to fall back to.
function resolveSlideImage(slide: HomepageSlide) {
  if (slide.layout === 'editorial') return (isMobile.value && slide.mobileImageUrl) || slide.imageUrl || ''
  return resolveImageUrl(slide)
}
function usableSlides(items: HomepageSlide[]) {
  return items.filter((slide) => {
    const device = slide.device || 'all'
    const image = resolveSlideImage(slide)
    return slide.active !== false &&
      (device === 'all' || device === (isMobile.value ? 'mobile' : 'desktop')) &&
      Boolean(image.trim()) && !failedImages.value.has(image)
  }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
}
// Slides configured in the internal editor take precedence per device; the
// bundled editorial campaign is the fallback.
const activeSlides = computed(() => {
  const configured = usableSlides(slides.value)
  return configured.length ? configured : usableSlides(defaultHomepageSlides)
})
const currentSlide = computed(() => activeSlides.value[activeSlideIndex.value] || null)
const showSkeleton = computed(() => !loaded.value)
// Campaign artwork carries its own headline, CTA and counter, so the frame
// takes the image's proportions instead of a fixed height that would crop
// them. Editorial slides keep the fixed height — their copy sets the height.
const artworkOnly = computed(
  () => activeSlides.value.length > 0 && activeSlides.value.every((slide) => slide.layout !== 'editorial'),
)
function stopAutoRotate() {
  if (autoRotateHandle !== null) window.clearInterval(autoRotateHandle)
  autoRotateHandle = null
}
function startAutoRotate() {
  stopAutoRotate()
  if (!loaded.value || activeSlides.value.length <= 1 || prefersReducedMotion.value || paused.value) return
  autoRotateHandle = window.setInterval(showNextSlide, 6000)
}
function goToSlide(index: number) {
  const total = activeSlides.value.length
  activeSlideIndex.value = total ? ((index % total) + total) % total : 0
  startAutoRotate()
}
function showNextSlide() { goToSlide(activeSlideIndex.value + 1) }
function showPreviousSlide() { goToSlide(activeSlideIndex.value - 1) }
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
watch([prefersReducedMotion, paused, loaded], startAutoRotate)
onMounted(async () => {
  mobileQuery = window.matchMedia('(max-width: 767px)')
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncMobile(mobileQuery)
  syncMotion(motionQuery)
  mobileQuery.addEventListener('change', syncMobile)
  motionQuery.addEventListener('change', syncMotion)
  await ensureHomepageSlidesLoaded()
  startAutoRotate()
})
onUnmounted(() => {
  stopAutoRotate()
  mobileQuery?.removeEventListener('change', syncMobile)
  motionQuery?.removeEventListener('change', syncMotion)
})
</script>

<template>
  <section
    class="ect-relative ect-w-full ect-overflow-hidden ect-bg-navy-800"
    :style="{ marginTop: headerOffset + 'px' }"
    aria-label="Featured jewellery collections"
    aria-roledescription="carousel"
    @keydown.left.prevent="showPreviousSlide"
    @keydown.right.prevent="showNextSlide"
  >
    <!-- Warm gold wash off the top-right, so the navy never reads flat. -->
    <div class="campaign-glow" aria-hidden="true" />

    <div class="campaign-frame" :class="{ 'is-artwork': artworkOnly }">
      <div
        v-if="showSkeleton"
        class="campaign-skeleton ect-animate-pulse ect-bg-[linear-gradient(110deg,#15263f_0%,#1f3a61_45%,#15263f_90%)]"
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
          <!-- Editorial: live copy on the navy ground, photograph beside it -->
          <div v-if="slide.layout === 'editorial'" class="editorial">
            <div class="editorial-copy">
              <p v-if="slide.eyebrow" class="ect-font-body ect-text-micro sm:ect-text-ui ect-uppercase ect-tracking-eyebrow ect-text-gold-300">
                {{ slide.eyebrow }}
              </p>
              <h2 class="ect-font-display ect-text-[2.1rem] sm:ect-text-5xl xl:ect-text-6xl ect-leading-display ect-tracking-display ect-text-white ect-mt-3 sm:ect-mt-4">
                {{ slide.headline }}
              </h2>
              <p v-if="slide.subheadline" class="ect-font-body ect-text-ui-lg ect-leading-body-relaxed ect-text-cream/70 ect-mt-3 sm:ect-mt-5 ect-max-w-md">
                {{ slide.subheadline }}
              </p>
              <button
                v-if="slide.ctaHref"
                type="button"
                class="ect-mt-6 sm:ect-mt-8 ect-inline-flex ect-items-center ect-gap-2.5 ect-bg-champagne hover:ect-bg-white ect-text-navy-900 ect-px-7 ect-py-3.5 ect-font-body ect-text-ui ect-font-semibold ect-uppercase ect-tracking-label ect-transition-colors"
                @click="navigateTo(slide.ctaHref)"
              >
                {{ slide.ctaLabel || 'Explore collection' }}
                <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 12h15m0 0l-5.5-5.5M19 12l-5.5 5.5" />
                </svg>
              </button>
            </div>

            <div class="editorial-art">
              <img
                :src="resolveSlideImage(slide)"
                :alt="slide.headline || 'Featured jewellery'"
                :style="{ objectPosition: slide.imagePosition || 'center' }"
                :fetchpriority="index === 0 ? 'high' : 'auto'"
                decoding="async"
                @error="failedImages.add(resolveSlideImage(slide))"
              />
            </div>
          </div>

          <!-- Artwork: a campaign image with its own baked-in headline -->
          <template v-else>
            <img
              :src="resolveImageUrl(slide)"
              :alt="slide.headline || 'Homepage jewellery campaign'"
              :style="{
                objectPosition: isMobile && slide.panelIndex !== undefined ? 'center bottom' : slide.imagePosition || 'center',
                objectFit: slide.imageFit || 'cover',
                width: isMobile && slide.panelIndex !== undefined ? '300%' : undefined,
                maxWidth: isMobile && slide.panelIndex !== undefined ? 'none' : undefined,
                transform: isMobile && slide.panelIndex !== undefined ? `translateX(-${slide.panelIndex * 100 / 3}%)` : undefined,
              }"
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
          </template>
        </div>

        <!-- Artwork slides carry their CTA as a floating button; editorial
             slides place it inside the copy block. -->
        <button
          v-if="currentSlide.layout !== 'editorial' && currentSlide.ctaLabel && currentSlide.ctaHref"
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

      <!-- Fallback when no campaign is configured. -->
      <div v-else class="campaign-fallback">
        <div class="campaign-fallback-copy">
          <p class="campaign-fallback-title">Jewelet</p>
          <p>Certified gold and diamond jewellery, with the full price breakdown on every piece.</p>
        </div>
        <img src="/showcase/necklace-ruby-cascade.webp" alt="A ruby and diamond necklace in 18k gold" fetchpriority="high" />
      </div>

      <!-- Numbered slide indicator + arrows -->
      <div v-if="!showSkeleton && activeSlides.length > 1" class="campaign-controls">
        <div class="ect-flex ect-items-center ect-gap-4">
          <button
            v-for="(slide, index) in activeSlides"
            :key="slide.id || `${slide.imageUrl}-${index}`"
            type="button"
            class="ect-font-body ect-text-ui ect-tracking-label ect-transition-colors"
            :class="activeSlideIndex === index ? 'ect-text-white' : 'ect-text-cream/40 hover:ect-text-cream/80'"
            :aria-label="`Show slide ${index + 1}`"
            :aria-current="activeSlideIndex === index ? 'true' : undefined"
            @click="goToSlide(index)"
          >{{ String(index + 1).padStart(2, '0') }}</button>
          <span class="ect-h-px ect-w-10 ect-bg-cream/30" aria-hidden="true" />
        </div>

        <div class="ect-flex ect-items-center ect-gap-2.5">
          <button
            v-if="!prefersReducedMotion"
            type="button"
            class="ect-mr-1 ect-font-body ect-text-micro ect-uppercase ect-tracking-label ect-text-cream/50 hover:ect-text-white ect-transition-colors"
            :aria-label="paused ? 'Play slideshow' : 'Pause slideshow'"
            :aria-pressed="paused"
            @click="paused = !paused"
          >{{ paused ? 'Play' : 'Pause' }}</button>
          <button
            type="button"
            aria-label="Show previous slide"
            class="campaign-arrow"
            @click="showPreviousSlide"
          >
            <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Show next slide"
            class="campaign-arrow"
            @click="showNextSlide"
          >
            <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Slides stack in one grid cell rather than being absolutely positioned, so
   the frame is as tall as its tallest slide and still cross-fades. Absolute
   slides collapsed the frame to nothing wherever no fixed height was set. */
.campaign-frame { position: relative; display: grid; min-height: 520px; }
/* Artwork campaigns are sized by the image itself, so the baked-in headline,
   CTA and counter are never cropped by a frame height we picked. */
.campaign-frame.is-artwork { min-height: 0; }
.campaign-frame.is-artwork .campaign-slide img { height: auto; }
.campaign-skeleton { grid-area: 1 / 1; min-height: 320px; }
.campaign-glow {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(120% 90% at 82% 8%, rgba(201,162,39,.28) 0%, rgba(201,162,39,0) 55%),
    linear-gradient(115deg, #101c2e 0%, #15263f 45%, #1f3a61 100%);
}
.campaign-slide { grid-area: 1 / 1; min-width: 0; z-index: 1; opacity: 0; pointer-events: none; transition: opacity .5s ease; }
.campaign-slide.is-active { opacity: 1; pointer-events: auto; }
.campaign-artwork-link { position: absolute; inset: 0; }
.campaign-artwork-link:focus-visible { outline: 3px solid #fff8df; outline-offset: -6px; }

/* Editorial composition: copy left, photograph right. The photograph is inset
   rather than full-bleed — these are studio shots on cream, and butting cream
   straight against the navy reads as a pasted rectangle. */
.editorial {
  display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 48px;
  height: 100%; max-width: 80rem; margin: 0 auto; padding: 56px 20px 92px;
}
.editorial-copy { max-width: 34rem; }
.editorial-art { position: relative; height: 100%; max-height: 420px; }
.editorial-art img {
  width: 100%; height: 100%; object-fit: cover;
  box-shadow: 0 30px 70px -30px rgba(0,0,0,.65);
  outline: 1px solid rgba(220,191,114,.35); outline-offset: -1px;
}

.campaign-controls {
  position: absolute; z-index: 3; left: 0; right: 0; bottom: 26px;
  max-width: 80rem; margin: 0 auto; padding: 0 20px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.campaign-arrow {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 999px;
  color: #faf7f2; border: 1px solid rgba(250,247,242,.35);
  transition: background-color .2s ease, border-color .2s ease;
}
.campaign-arrow:hover { background: rgba(250,247,242,.14); border-color: rgba(250,247,242,.7); }

@media (prefers-reduced-motion: reduce) { .campaign-slide { transition: none; } }

.campaign-fallback-title { font-family: "Playfair Display", Georgia, serif; font-size: 28px; color: #faf7f2; margin-bottom: 12px; }
.campaign-fallback { position: relative; grid-area: 1 / 1; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; height: 100%; }
.campaign-fallback-copy { align-self: center; padding: 40px 10%; }
.campaign-fallback-copy > p:not(.campaign-fallback-title) { max-width: 380px; font-size: 15px; line-height: 1.7; color: rgba(250,247,242,.7); }
.campaign-fallback > img { width: 100%; height: 100%; object-fit: cover; min-height: 0; }

@media (max-width: 1023px) {
  .editorial { gap: 32px; padding: 44px 20px 88px; }
  .editorial-art { max-height: 340px; }
}
@media (max-width: 767px) {
  .campaign-frame { min-height: 0; }
  /* Photograph first, then the copy: the piece is the hook on a phone. */
  .editorial { grid-template-columns: 1fr; gap: 24px; padding: 24px 20px 84px; }
  .editorial-art { order: -1; height: 240px; max-height: none; }
  .editorial-copy { max-width: none; }
  .campaign-controls { bottom: 22px; }
  .campaign-fallback { grid-template-columns: 1fr; }
  .campaign-fallback-copy { padding: 28px 24px; }
  .campaign-fallback > img { height: 260px; }
}
</style>
