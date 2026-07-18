<script setup lang="ts">
// "Shop by stone & metal" gallery (Aurelle design). Entries are curated against
// the live catalog (stoneTags: diamond/garnet/rhodolite; gold colors) so every
// card lands on a non-empty grid at /collections.
const stones: {
  name: string
  sub: string
  bg: string
  dot: string
  query: Record<string, string>
}[] = [
  { name: 'Diamond', sub: 'Timeless white', bg: 'linear-gradient(155deg,#e9eef4,#c4d3e4)', dot: '#8fa8c6', query: { stone: 'diamond' } },
  { name: 'Garnet', sub: 'Bold & warm', bg: 'linear-gradient(155deg,#e9b7bb,#b23a4d)', dot: '#9c2c3e', query: { stone: 'garnet' } },
  { name: 'Rhodolite', sub: 'Berry pink', bg: 'linear-gradient(155deg,#e8c3d6,#a04a71)', dot: '#8e3a62', query: { stone: 'rhodolite' } },
  { name: 'Rose Gold', sub: 'Soft blush', bg: 'linear-gradient(155deg,#f3d3c6,#d99177)', dot: '#c9765a', query: { metal: 'gold', color: 'rose' } },
  { name: 'White Gold', sub: 'Cool & modern', bg: 'linear-gradient(155deg,#e9ecf0,#b3bcc9)', dot: '#98a2b3', query: { metal: 'gold', color: 'white' } },
]
</script>

<template>
  <section class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-14 sm:ect-pt-16">
    <header class="ect-flex ect-items-end ect-justify-between ect-gap-4 ect-mb-7">
      <div>
        <p class="ect-font-body ect-text-xs ect-uppercase ect-tracking-[0.24em] ect-text-[#b79a56]">Shop by stone & metal</p>
        <h2 class="ect-mt-2 ect-font-display ect-text-3xl sm:ect-text-[2.5rem] ect-font-medium ect-leading-tight ect-text-[#2b2723]">
          A little color for every mood
        </h2>
      </div>
      <RouterLink
        to="/collections"
        class="ect-shrink-0 ect-font-body ect-text-[13.5px] ect-tracking-[0.05em] ect-text-[#2b2723] ect-border-b ect-border-[#cdbfa6] ect-pb-0.5 hover:ect-text-[#1f5c4d] ect-transition-colors"
      >
        Explore all stones
      </RouterLink>
    </header>

    <div class="ect-grid ect-grid-cols-2 sm:ect-grid-cols-3 lg:ect-grid-cols-5 ect-gap-3 sm:ect-gap-4">
      <RouterLink
        v-for="g in stones"
        :key="g.name"
        :to="{ path: '/collections', query: g.query }"
        class="ect-relative ect-block ect-rounded-[10px] ect-overflow-hidden ect-aspect-[3/4] ect-transition-opacity hover:ect-opacity-85"
        :style="{ background: g.bg }"
      >
        <span
          class="ect-absolute ect-inset-x-0 ect-bottom-0 ect-p-4 ect-bg-[linear-gradient(to_top,rgba(20,18,15,0.55),transparent)]"
        >
          <span class="ect-flex ect-items-center ect-gap-2">
            <span
              class="ect-w-2.5 ect-h-2.5 ect-rounded-full ect-shadow-[0_0_0_2px_rgba(255,255,255,0.6)]"
              :style="{ background: g.dot }"
            />
            <span class="ect-font-body ect-text-base ect-tracking-[0.02em] ect-text-white">{{ g.name }}</span>
          </span>
          <span class="ect-block ect-pl-[18px] ect-mt-0.5 ect-font-body ect-text-xs ect-text-white/80">{{ g.sub }}</span>
        </span>
      </RouterLink>
    </div>
  </section>
</template>
