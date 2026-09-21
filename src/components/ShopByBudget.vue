<script setup lang="ts">
const budgets = [
  { label: 'Under ₹25,000', to: { path: '/collections', query: { priceMax: '25000' } }, image: '/showcase/earrings-butterfly-studs.webp' },
  { label: '₹25,000 – ₹50,000', to: { path: '/collections', query: { priceMin: '25000', priceMax: '50000' } }, image: '/showcase/pendant-emerald-clover.webp' },
  { label: '₹50,000 – ₹1,00,000', to: { path: '/collections', query: { priceMin: '50000', priceMax: '100000' } }, image: '/showcase/men-sapphire-signet.webp' },
  { label: 'Above ₹1,00,000', to: { path: '/collections', query: { priceMin: '100000' } }, image: '/showcase/ring-ruby-bloom.webp' },
]
</script>

<template>
  <section class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-12 sm:ect-pt-16">
    <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-text-[#2b2723] ect-mb-5 sm:ect-mb-6">Shop by budget</h2>

    <div class="ect-grid ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-3 sm:ect-gap-4">
      <RouterLink
        v-for="budget in budgets"
        :key="budget.label"
        :to="budget.to"
        class="ect-group ect-block ect-border ect-border-[#e6ddce] ect-bg-white hover:ect-border-[#b6a68d]"
      >
        <span class="ect-block ect-aspect-[4/3] ect-overflow-hidden ect-bg-[#f3ece0]">
          <img :src="budget.image" alt="" loading="lazy" class="ect-h-full ect-w-full ect-object-cover" />
        </span>
        <span class="ect-block ect-px-3.5 ect-py-3 ect-font-body ect-text-sm sm:ect-text-base ect-text-[#2b2723]">{{ budget.label }}</span>
      </RouterLink>
    </div>
  </section>
</template>
