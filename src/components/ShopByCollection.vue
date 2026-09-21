<script setup lang="ts">
import { onMounted } from 'vue'
import { HOMEPAGE_COLLECTION_LINKS } from '../data/collections'
import { useSiteConfig } from '../composables/useSiteConfig'

const collections = HOMEPAGE_COLLECTION_LINKS
const { collectionImages, ensureSiteConfigLoaded } = useSiteConfig()

onMounted(() => {
  void ensureSiteConfigLoaded()
})

// The bundled campaign photography wins here: these twelve tiles are a curated
// set shot on one ground, and a per-tile upload from the internal workspace
// used to break the row apart. An uploaded image still shows for any tile the
// code ships no artwork for — and it still drives the mega menu and the mobile
// drawer, which are not part of this set.
//
// Rendered as <img> rather than background-image: mobile Safari drops large
// background images silently.
const collectionImage = (item: (typeof collections)[number]) => item.image || collectionImages.value[item.slug]
</script>

<template>
  <section class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-10 sm:ect-pt-14">
    <header class="ect-flex ect-items-baseline ect-justify-between ect-gap-4 ect-mb-5 sm:ect-mb-6">
      <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-text-[#2b2723]">Shop by category</h2>
      <RouterLink to="/collections" class="ect-shrink-0 ect-font-body ect-text-sm ect-text-[#5c5648] hover:ect-text-[#1f3f37] ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6]">
        View all
      </RouterLink>
    </header>

    <!-- Circular tiles: the product shots are all on the same warm studio
         ground, so a round crop on a champagne disc reads as one set rather
         than twelve mismatched rectangles. -->
    <div class="ect-grid ect-grid-cols-3 sm:ect-grid-cols-4 lg:ect-grid-cols-6 ect-gap-x-3 sm:ect-gap-x-4 ect-gap-y-6 sm:ect-gap-y-8">
      <RouterLink
        v-for="item in collections"
        :key="item.slug"
        class="ect-group ect-flex ect-flex-col ect-items-center ect-text-center ect-min-w-0"
        :to="item.to"
      >
        <span class="ect-relative ect-block ect-w-full ect-max-w-[124px] ect-aspect-square ect-rounded-full ect-overflow-hidden ect-bg-champagne ect-ring-1 ect-ring-sand group-hover:ect-ring-gold-300 ect-transition-all ect-duration-300 ect-mb-3">
          <img
            v-if="collectionImage(item)"
            :src="collectionImage(item)"
            alt=""
            loading="lazy"
            decoding="async"
            class="ect-pointer-events-none ect-absolute ect-inset-0 ect-w-full ect-h-full ect-object-cover group-hover:ect-scale-105 ect-transition-transform ect-duration-500"
          />
        </span>
        <span class="ect-font-body ect-text-ui sm:ect-text-ui-lg ect-text-[#2b2723] group-hover:ect-text-navy-600 ect-leading-snug">
          {{ item.title }}
        </span>
      </RouterLink>
    </div>
  </section>
</template>
