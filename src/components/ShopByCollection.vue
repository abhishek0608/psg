<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { COLLECTION_LINKS } from '../data/collections'
import { useSiteConfig } from '../composables/useSiteConfig'

const router = useRouter()
const collections = COLLECTION_LINKS

const { collectionImages, ensureSiteConfigLoaded } = useSiteConfig()

onMounted(() => {
  void ensureSiteConfigLoaded()
})

// Bluestone-inspired placeholder for each collection tile.
const cardBg =
  'radial-gradient(circle at 78% 18%, rgba(201,146,55,0.26), transparent 30%), linear-gradient(135deg, #eaf8fb 0%, #ffffff 52%, #f6eef1 100%)'

// The configured image for a collection (if any). Rendered via an <img> element
// rather than a CSS background-image: iOS/mobile Safari silently refuses to
// paint background-images whose decoded area exceeds a memory threshold (large
// uploaded photos easily hit it), leaving only the gradient on mobile while
// desktop renders fine. <img> decodes progressively and has no such limit.
const collectionImage = (slug: string) => collectionImages.value[slug] || ''

// With an odd number of collections the final tile spans the full row so the
// grid never leaves a lone half-width card.
const isLastSpanning = (index: number) =>
  collections.length % 2 === 1 && index === collections.length - 1

// Desktop grid is 6 units wide: full rows hold three tiles (span 2 each), and
// leftover tiles widen to fill the last row(s) — e.g. 5 tiles render as 3 + 2
// half-width cards instead of leaving an empty slot.
const isWideOnDesktop = (index: number) => {
  const count = collections.length
  const remainder = count % 3
  if (remainder === 2) return index >= count - 2
  if (remainder === 1 && count > 3) return index >= count - 4
  return false
}

// Wide tiles stretch their aspect so both rows keep the same height.
const desktopClasses = (index: number) =>
  isWideOnDesktop(index)
    ? 'lg:ect-col-span-3 lg:ect-aspect-[32/15]'
    : 'lg:ect-col-span-2 lg:ect-aspect-[7/5]'

function goToCollection(slug: string) {
  void router.push(`/collections/${slug}`)
}

function viewAll() {
  void router.push('/collections')
}
</script>

<template>
  <section class="ect-bg-cream ect-pt-10 sm:ect-pt-14">
    <div class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8">
      <header class="ect-flex ect-items-end ect-justify-between ect-gap-4 ect-mb-5">
        <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-font-light ect-text-charcoal">
          Shop by Category
        </h2>
        <button
          type="button"
          class="ect-font-body ect-text-[11px] ect-font-semibold ect-uppercase ect-tracking-[0.18em] ect-text-charcoal/55 hover:ect-text-gold-700 ect-transition-colors ect-shrink-0"
          @click="viewAll"
        >
          View all
        </button>
      </header>

      <div class="ect-grid ect-grid-cols-2 lg:ect-grid-cols-6 ect-gap-3 sm:ect-gap-4">
        <button
          v-for="(item, index) in collections"
          :key="item.slug"
          type="button"
          class="ect-relative ect-overflow-hidden ect-rounded-lg ect-border ect-border-sand ect-shadow-card hover:ect-shadow-luxe-sm hover:-ect-translate-y-0.5 ect-transition-all ect-duration-200 ect-aspect-[7/5] ect-flex ect-items-end ect-p-4 ect-text-left"
          :class="[isLastSpanning(index) ? 'ect-col-span-2' : '', desktopClasses(index)]"
          :style="{ backgroundImage: cardBg }"
          @click="goToCollection(item.slug)"
        >
          <img
            v-if="collectionImage(item.slug)"
            :src="collectionImage(item.slug)"
            :alt="item.title"
            loading="lazy"
            decoding="async"
            class="ect-pointer-events-none ect-absolute ect-inset-0 ect-w-full ect-h-full ect-object-cover"
          />
          <span
            class="ect-pointer-events-none ect-absolute ect-inset-0 ect-bg-[linear-gradient(180deg,transparent_45%,rgba(13,36,54,0.42)_100%)]"
          />
          <span
            class="ect-relative ect-font-display ect-text-xl sm:ect-text-2xl ect-font-semibold ect-leading-tight ect-text-white [text-shadow:0_1px_4px_rgba(13,36,54,0.45)]"
          >
            {{ item.title }}
          </span>
        </button>
      </div>
    </div>
  </section>
</template>
