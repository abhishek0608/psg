<script setup lang="ts">
// Each tile maps to a filter the catalogue actually supports: `metal` for the
// two materials we stock, `stone` for the gemstone edit. Stone filters are
// ANDed server-side, so a tile only ever names one stone.
const materials = [
  { title: 'Gold', caption: 'Timeless & elegant', to: { path: '/collections', query: { metal: 'gold' } }, image: '/showcase/men-sapphire-signet.webp' },
  { title: 'Diamond', caption: 'For every occasion', to: { path: '/collections', query: { stone: 'diamond' } }, image: '/celeste-solitaire-ring-1.webp' },
  { title: 'Silver', caption: 'Light & everyday', to: { path: '/collections', query: { metal: 'silver' } }, image: '/ziya-silver-collar-1.png' },
  { title: 'Emerald', caption: 'A splash of colour', to: { path: '/collections', query: { stone: 'emerald' } }, image: '/showcase/bracelet-emerald-tennis.webp' },
]
</script>

<template>
  <section class="ect-bg-champagne/60 ect-py-10 sm:ect-py-14">
    <div class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8">
      <header class="ect-flex ect-items-baseline ect-justify-between ect-gap-4 ect-mb-5 sm:ect-mb-6">
        <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-text-[#2b2723]">Explore by material</h2>
        <RouterLink to="/collections" class="ect-shrink-0 ect-font-body ect-text-sm ect-text-[#5c5648] hover:ect-text-navy-600 ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6]">
          View all
        </RouterLink>
      </header>

      <div class="ect-grid ect-grid-cols-1 sm:ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-3 sm:ect-gap-4">
        <RouterLink
          v-for="material in materials"
          :key="material.title"
          :to="material.to"
          class="ect-group ect-relative ect-block ect-h-28 sm:ect-h-32 ect-overflow-hidden ect-bg-white ect-ring-1 ect-ring-sand hover:ect-ring-gold-300 ect-transition-all"
        >
          <img
            :src="material.image"
            alt=""
            loading="lazy"
            decoding="async"
            class="ect-absolute ect-inset-y-0 ect-right-0 ect-h-full ect-w-3/5 ect-object-cover group-hover:ect-scale-105 ect-transition-transform ect-duration-500"
          />
          <!-- Fade the photograph out under the copy; the studio shots are
               near-white, so plain text over them would lose contrast. -->
          <span class="ect-absolute ect-inset-0 ect-bg-[linear-gradient(90deg,#ffffff_38%,rgba(255,255,255,0.86)_54%,rgba(255,255,255,0)_82%)]" aria-hidden="true" />
          <span class="ect-relative ect-z-[1] ect-flex ect-h-full ect-flex-col ect-justify-center ect-px-5">
            <span class="ect-font-display ect-text-2xl sm:ect-text-[26px] ect-text-[#2b2723]">{{ material.title }}</span>
            <span class="ect-mt-1 ect-inline-flex ect-items-center ect-gap-1.5 ect-font-body ect-text-ui ect-text-[#5c5648] group-hover:ect-text-navy-600 ect-transition-colors">
              {{ material.caption }}
              <svg class="ect-h-3.5 ect-w-3.5 group-hover:ect-translate-x-1 ect-transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 12h15m0 0l-5.5-5.5M19 12l-5.5 5.5" />
              </svg>
            </span>
          </span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
