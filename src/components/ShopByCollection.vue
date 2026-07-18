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

// Soft pastel placeholders (Aurelle design) shown behind tiles that have no
// configured image, cycled per tile.
const tileBgs = [
  'linear-gradient(150deg,#f6d9d3,#eab7ac)',
  'linear-gradient(150deg,#d9e6e0,#a9cabc)',
  'linear-gradient(150deg,#e2ddef,#bfb3dd)',
  'linear-gradient(150deg,#f3e6c9,#e3c98a)',
  'linear-gradient(150deg,#d7e3ef,#a8c3de)',
  'linear-gradient(150deg,#f5e0d0,#edbf9a)',
]

// The configured image for a collection (if any). Rendered via an <img> element
// rather than a CSS background-image: iOS/mobile Safari silently refuses to
// paint background-images whose decoded area exceeds a memory threshold (large
// uploaded photos easily hit it), leaving only the gradient on mobile while
// desktop renders fine. <img> decodes progressively and has no such limit.
const collectionImage = (slug: string) => collectionImages.value[slug] || ''

function goToCollection(slug: string) {
  void router.push(`/collections/${slug}`)
}
</script>

<template>
  <section class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-14 sm:ect-pt-16">
    <header class="ect-flex ect-items-end ect-justify-between ect-gap-4 ect-mb-7">
      <div>
        <p class="ect-font-body ect-text-xs ect-uppercase ect-tracking-[0.24em] ect-text-[#b79a56]">Shop by category</p>
        <h2 class="ect-mt-2 ect-font-display ect-text-3xl sm:ect-text-[2.5rem] ect-font-medium ect-leading-tight ect-text-[#2b2723]">
          Find your everyday favorite
        </h2>
      </div>
      <RouterLink
        to="/collections"
        class="ect-shrink-0 ect-font-body ect-text-[13.5px] ect-tracking-[0.05em] ect-text-[#2b2723] ect-border-b ect-border-[#cdbfa6] ect-pb-0.5 hover:ect-text-[#1f5c4d] ect-transition-colors"
      >
        View all categories
      </RouterLink>
    </header>

    <div class="ect-grid ect-grid-cols-3 lg:ect-grid-cols-5 ect-gap-3 sm:ect-gap-4">
      <button
        v-for="(item, index) in collections"
        :key="item.slug"
        type="button"
        class="ect-group ect-block ect-text-center"
        @click="goToCollection(item.slug)"
      >
        <span
          class="ect-relative ect-block ect-aspect-square ect-rounded-md ect-overflow-hidden ect-mb-3 ect-shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] ect-transition-opacity group-hover:ect-opacity-85"
          :style="{ background: tileBgs[index % tileBgs.length] }"
        >
          <img
            v-if="collectionImage(item.slug)"
            :src="collectionImage(item.slug)"
            :alt="item.title"
            loading="lazy"
            decoding="async"
            class="ect-pointer-events-none ect-absolute ect-inset-0 ect-w-full ect-h-full ect-object-cover"
          />
        </span>
        <span class="ect-font-body ect-text-sm ect-tracking-[0.02em] ect-text-[#2b2723] group-hover:ect-text-[#1f5c4d] ect-transition-colors">
          {{ item.title }}
        </span>
      </button>
    </div>
  </section>
</template>
