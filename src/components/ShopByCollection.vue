<script setup lang="ts">
import { onMounted } from 'vue'
import { HOMEPAGE_COLLECTION_LINKS } from '../data/collections'
import { useSiteConfig } from '../composables/useSiteConfig'

const collections = HOMEPAGE_COLLECTION_LINKS

const { collectionImages, ensureSiteConfigLoaded } = useSiteConfig()

onMounted(() => {
  void ensureSiteConfigLoaded()
})

// Placeholders shown behind tiles that have no configured image, cycled per
// tile. These are a tonal warm-neutral ramp rather than the pink/mint/lavender
// pastels they replace: an unphotographed category should read as an empty
// frame waiting for its image, not as a colour the brand chose.
const tileBgs = [
  'linear-gradient(150deg,#f3ece0,#ded2be)',
  'linear-gradient(150deg,#efe7d6,#d5c6ac)',
  'linear-gradient(150deg,#f5f0e7,#e0d6c4)',
  'linear-gradient(150deg,#eee6d8,#d8c9ae)',
  'linear-gradient(150deg,#f2ebdd,#dbcfb8)',
  'linear-gradient(150deg,#f0e9dc,#d3c5ab)',
]

// The configured image for a collection (if any). Rendered via an <img> element
// rather than a CSS background-image: iOS/mobile Safari silently refuses to
// paint background-images whose decoded area exceeds a memory threshold (large
// uploaded photos easily hit it), leaving only the gradient on mobile while
// desktop renders fine. <img> decodes progressively and has no such limit.
const collectionImage = (item: (typeof collections)[number]) => collectionImages.value[item.slug] || item.fallbackImage
</script>

<template>
  <section class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-14 sm:ect-pt-16">
    <header class="ect-flex ect-flex-col ect-items-start sm:ect-flex-row sm:ect-items-end sm:ect-justify-between ect-gap-3 sm:ect-gap-4 ect-mb-7">
      <div>
        <p class="ect-eyebrow ect-text-gold-600">Shop by category</p>
        <h2 class="ect-mt-2 ect-font-display ect-text-3xl sm:ect-text-[2.5rem] ect-font-medium ect-leading-tight ect-text-[#2b2723]">
          What speaks to you?
        </h2>
      </div>
      <RouterLink
        to="/collections"
        class="ect-shrink-0 ect-font-body ect-text-ui ect-tracking-wide ect-text-[#2b2723] ect-border-b ect-border-[#cdbfa6] ect-pb-0.5 hover:ect-text-[#1f5c4d] ect-transition-colors"
      >
        View all categories
      </RouterLink>
    </header>

    <div class="ect-grid ect-grid-cols-3 lg:ect-grid-cols-6 ect-gap-x-3 sm:ect-gap-x-4 ect-gap-y-6 sm:ect-gap-y-8">
      <!-- Keep image and label aligned when a category name wraps. -->
      <RouterLink
        v-for="(item, index) in collections"
        :key="item.slug"
        class="category-link ect-group ect-flex ect-flex-col ect-text-center"
        :to="item.to"
      >
        <span
          class="category-image ect-relative ect-block ect-w-full ect-shrink-0 ect-aspect-[4/5] ect-overflow-hidden ect-mb-3 ect-ring-1 ect-ring-inset ect-ring-sand group-hover:ect-ring-gold-300 ect-transition-all"
          :style="{ background: tileBgs[index % tileBgs.length] }"
        >
          <img
            v-if="collectionImage(item)"
            :src="collectionImage(item)"
            alt=""
            loading="lazy"
            decoding="async"
            class="ect-pointer-events-none ect-absolute ect-inset-0 ect-w-full ect-h-full ect-object-cover ect-transition-transform ect-duration-500 group-hover:ect-scale-[1.04]"
          />
          <!-- Un-photographed category: a quiet brand mark inside a ruled frame,
               so the tile reads as a slot awaiting its image rather than as a
               blank swatch the brand picked on purpose. -->
          <span v-else class="ect-absolute ect-inset-0 ect-flex ect-items-center ect-justify-center">
            <svg class="ect-w-7 ect-h-7 ect-text-gold-600/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.1">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M12 21L2.25 8.25 6 3.75h12l3.75 4.5L12 21zM8.25 8.25L12 3.75l3.75 4.5M12 21L8.25 8.25M12 21l3.75-12.75" />
            </svg>
          </span>
        </span>
        <span class="ect-font-body ect-text-sm ect-tracking-wide ect-text-[#2b2723] group-hover:ect-text-[#1f5c4d] ect-transition-colors">
          {{ item.title }}
        </span>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.category-image { border-radius: 0; margin-bottom: 18px; }
.category-link { min-width: 0; }
.category-link > span:last-child { width: 100%; font-size: 14px; }
@media (max-width: 639px) {
  .category-image { margin-bottom: 10px; }
  .category-link > span:last-child { font-size: 12px; line-height: 1.4; }
}
</style>
