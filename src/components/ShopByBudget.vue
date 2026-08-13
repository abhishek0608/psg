<script setup lang="ts">
const budgets = [
  { label: 'Under ₹25,000', caption: 'Thoughtful gifts and everyday shine', to: { path: '/collections', query: { priceMax: '25000' } }, image: '/amara-hoop-earrings-1.png' },
  { label: '₹25,000 – ₹50,000', caption: 'Small luxuries, beautifully made', to: { path: '/collections', query: { priceMin: '25000', priceMax: '50000' } }, image: '/pendant-1.jpg' },
  { label: '₹50,000 – ₹1,00,000', caption: 'Signature pieces for every occasion', to: { path: '/collections', query: { priceMin: '50000', priceMax: '100000' } }, image: '/celeste-solitaire-ring-1.webp' },
  { label: 'Above ₹1,00,000', caption: 'Exceptional designs, made to treasure', to: { path: '/collections', query: { priceMin: '100000' } }, image: '/verde-duet-ring-1.png' },
]
</script>

<template>
  <section class="ect-mt-16 sm:ect-mt-20 ect-bg-[#1f3f37] ect-py-14 sm:ect-py-16">
    <div class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8">
      <header class="ect-text-center ect-mb-8">
        <p class="ect-font-body ect-text-micro ect-font-semibold ect-uppercase ect-tracking-eyebrow ect-text-[#dcbf72]">Something for every celebration</p>
        <h2 class="ect-mt-2 ect-font-display ect-text-3xl sm:ect-text-[2.5rem] ect-font-medium ect-leading-tight ect-text-white">Shop by budget</h2>
      </header>

      <div class="ect-grid ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-3 sm:ect-gap-4">
        <RouterLink
          v-for="budget in budgets"
          :key="budget.label"
          :to="budget.to"
          class="ect-group ect-overflow-hidden ect-rounded-lg ect-bg-white"
        >
          <span class="ect-relative ect-block ect-aspect-[4/3] ect-overflow-hidden ect-bg-[#f3ece0]">
            <img :src="budget.image" :alt="budget.label" loading="lazy" class="ect-h-full ect-w-full ect-object-cover ect-transition-transform ect-duration-700 group-hover:ect-scale-[1.05]" />
          </span>
          <span class="ect-block ect-p-4 sm:ect-p-5">
            <span class="ect-block ect-font-body ect-text-sm sm:ect-text-base ect-font-semibold ect-text-[#2b2723]">{{ budget.label }}</span>
            <span class="ect-mt-1 ect-hidden sm:ect-block ect-font-body ect-text-xs ect-leading-relaxed ect-text-[#7a7264]">{{ budget.caption }}</span>
            <span class="ect-mt-3 ect-inline-flex ect-items-center ect-gap-1.5 ect-font-body ect-text-micro ect-font-semibold ect-uppercase ect-tracking-label ect-text-[#1f5c4d]">
              Shop now <span aria-hidden="true">→</span>
            </span>
          </span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
