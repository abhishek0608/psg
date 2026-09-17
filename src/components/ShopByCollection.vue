<script setup lang="ts">
import { onMounted } from 'vue'
import { HOMEPAGE_COLLECTION_LINKS } from '../data/collections'
import { useSiteConfig } from '../composables/useSiteConfig'

const collections = HOMEPAGE_COLLECTION_LINKS
const { collectionImages, ensureSiteConfigLoaded } = useSiteConfig()

onMounted(() => {
  void ensureSiteConfigLoaded()
})

// Rendered as <img> rather than background-image: mobile Safari drops large
// background images silently.
const collectionImage = (item: (typeof collections)[number]) => collectionImages.value[item.slug] || item.fallbackImage
</script>

<template>
  <section class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-10 sm:ect-pt-14">
    <header class="ect-flex ect-items-baseline ect-justify-between ect-gap-4 ect-mb-5 sm:ect-mb-6">
      <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-text-[#2b2723]">Shop by category</h2>
      <RouterLink to="/collections" class="ect-shrink-0 ect-font-body ect-text-sm ect-text-[#5c5648] hover:ect-text-[#1f3f37] ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6]">
        View all
      </RouterLink>
    </header>

    <div class="ect-grid ect-grid-cols-3 lg:ect-grid-cols-6 ect-gap-x-3 sm:ect-gap-x-4 ect-gap-y-5 sm:ect-gap-y-7">
      <RouterLink
        v-for="item in collections"
        :key="item.slug"
        class="ect-group ect-flex ect-flex-col ect-text-center ect-min-w-0"
        :to="item.to"
      >
        <span class="ect-relative ect-block ect-w-full ect-aspect-[4/5] ect-overflow-hidden ect-bg-[#f3ece0] ect-mb-2.5">
          <img
            v-if="collectionImage(item)"
            :src="collectionImage(item)"
            alt=""
            loading="lazy"
            decoding="async"
            class="ect-pointer-events-none ect-absolute ect-inset-0 ect-w-full ect-h-full ect-object-cover"
          />
        </span>
        <span class="ect-font-body ect-text-xs sm:ect-text-sm ect-text-[#2b2723] group-hover:ect-text-[#1f3f37] ect-leading-snug">
          {{ item.title }}
        </span>
      </RouterLink>
    </div>
  </section>
</template>
