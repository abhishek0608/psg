<script setup lang="ts">
const edits = [
  {
    title: 'Solitaire rings',
    image: '/editorial-solitaire-spotlight.webp',
    to: { path: '/collections/rings', query: { type: 'solitaire' } },
    className: 'lg:ect-row-span-2',
  },
  {
    title: 'Emerald jewellery',
    image: '/editorial-emerald-edit.webp',
    to: { path: '/collections', query: { stone: 'emerald' } },
    className: '',
  },
  {
    title: 'Everyday diamonds',
    image: '/editorial-everyday-diamonds.webp',
    to: { path: '/collections', query: { stone: 'diamond' } },
    className: '',
  },
]
</script>

<template>
  <section class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-12 sm:ect-pt-16">
    <div class="ect-grid ect-grid-cols-1 lg:ect-grid-cols-2 lg:ect-grid-rows-2 ect-gap-3 sm:ect-gap-4 lg:ect-h-[560px]">
      <RouterLink
        v-for="edit in edits"
        :key="edit.title"
        :to="edit.to"
        class="ect-group ect-relative ect-min-h-[300px] lg:ect-min-h-0 ect-overflow-hidden ect-bg-[#e9dfce]"
        :class="edit.className"
      >
        <img
          :src="edit.image"
          :alt="edit.title"
          loading="lazy"
          decoding="async"
          class="ect-absolute ect-inset-0 ect-h-full ect-w-full ect-object-cover"
        />
        <span class="ect-absolute ect-inset-x-0 ect-bottom-0 ect-bg-gradient-to-t ect-from-[#1a1613]/60 ect-to-transparent ect-pt-16 ect-p-5 sm:ect-p-6 ect-text-white">
          <span class="ect-block ect-font-display ect-text-2xl sm:ect-text-3xl">{{ edit.title }}</span>
          <span class="ect-mt-1.5 ect-inline-block ect-font-body ect-text-sm ect-underline ect-underline-offset-4 ect-decoration-white/60 group-hover:ect-decoration-white">Shop now</span>
        </span>
      </RouterLink>
    </div>
  </section>
</template>
