<script setup lang="ts">
const edits = [
  {
    title: 'Solitaire spotlight',
    eyebrow: 'The engagement edit',
    copy: 'Modern settings made for a forever kind of yes.',
    image: '/editorial-solitaire-spotlight.webp',
    to: { path: '/collections/rings', query: { type: 'solitaire' } },
    className: 'lg:ect-row-span-2',
  },
  {
    title: 'The emerald edit',
    eyebrow: 'Colour, considered',
    copy: 'Vivid green stones paired with warm, polished gold.',
    image: '/editorial-emerald-edit.webp',
    to: { path: '/collections', query: { stone: 'emerald' } },
    className: '',
  },
  {
    title: 'Everyday diamonds',
    eyebrow: 'Quiet brilliance',
    copy: 'Lightweight designs that move effortlessly from day to night.',
    image: '/editorial-everyday-diamonds.webp',
    to: { path: '/collections', query: { stone: 'diamond' } },
    className: '',
  },
]
</script>

<template>
  <section class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-16 sm:ect-pt-20">
    <header class="ect-flex ect-items-end ect-justify-between ect-gap-4 ect-mb-7">
      <div>
        <p class="ect-eyebrow ect-text-gold-600">Handpicked for you</p>
        <h2 class="ect-mt-2 ect-font-display ect-text-3xl sm:ect-text-[2.5rem] ect-font-medium ect-leading-tight ect-text-[#2b2723]">
          For every version of you
        </h2>
      </div>
      <RouterLink
        to="/collections"
        class="ect-hidden sm:ect-inline ect-shrink-0 ect-font-body ect-text-ui ect-tracking-wide ect-text-[#2b2723] ect-border-b ect-border-[#cdbfa6] ect-pb-0.5 hover:ect-text-[#1f5c4d] ect-transition-colors"
      >
        Explore all edits
      </RouterLink>
    </header>

    <div class="ect-grid ect-grid-cols-1 lg:ect-grid-cols-2 lg:ect-grid-rows-2 ect-gap-4 lg:ect-h-[580px]">
      <RouterLink
        v-for="edit in edits"
        :key="edit.title"
        :to="edit.to"
        class="ect-group ect-relative ect-min-h-[360px] lg:ect-min-h-0 ect-overflow-hidden ect-rounded-sm ect-bg-[#e9dfce]"
        :class="edit.className"
      >
        <img
          :src="edit.image"
          :alt="edit.title"
          loading="lazy"
          decoding="async"
          class="ect-absolute ect-inset-0 ect-h-full ect-w-full ect-object-cover ect-transition-transform ect-duration-[900ms] ect-ease-out group-hover:ect-scale-[1.035]"
        />
        <span class="ect-absolute ect-inset-0 ect-bg-gradient-to-t ect-from-[#1a1613]/70 ect-via-[#1a1613]/10 ect-to-transparent" />
        <span class="ect-absolute ect-inset-x-0 ect-bottom-0 ect-p-6 sm:ect-p-8 ect-text-white">
          <span class="ect-font-body ect-text-micro ect-font-semibold ect-uppercase ect-tracking-eyebrow ect-text-[#f0db9d]">
            {{ edit.eyebrow }}
          </span>
          <span class="ect-mt-2 ect-block ect-font-display ect-text-3xl sm:ect-text-4xl ect-leading-tight">
            {{ edit.title }}
          </span>
          <span class="ect-mt-2 ect-block ect-max-w-md ect-font-body ect-text-sm ect-leading-relaxed ect-text-white/80">
            {{ edit.copy }}
          </span>
          <span class="ect-mt-4 ect-inline-flex ect-items-center ect-gap-2 ect-font-body ect-text-ui ect-font-semibold ect-uppercase ect-tracking-label">
            Shop the edit
            <svg class="ect-h-4 ect-w-4 ect-transition-transform group-hover:ect-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </span>
        </span>
      </RouterLink>
    </div>
  </section>
</template>
