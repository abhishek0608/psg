<script setup lang="ts">
const points = [
  { title: 'BIS hallmarked gold', text: 'Every piece is hallmarked and stones come with certification.' },
  { title: 'Transparent pricing', text: 'Metal rate, making charges and taxes are shown on each product page.' },
  { title: 'Lifetime exchange', text: 'Exchange or upgrade at the prevailing rate, whenever you like.' },
  { title: 'Free insured shipping', text: 'Delivered anywhere in India, with easy returns inside the return window.' },
]
</script>

<template>
  <section id="about" class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-14 sm:ect-pt-20">
    <div class="ect-border-y ect-border-[#e6ddce] ect-py-8 sm:ect-py-10">
      <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-text-[#2b2723] ect-mb-6 sm:ect-mb-8">Why shop with Jewelet</h2>
      <dl class="ect-grid ect-grid-cols-1 sm:ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-x-8 ect-gap-y-6 ect-m-0">
        <div v-for="p in points" :key="p.title" class="lg:ect-border-l lg:ect-border-[#e6ddce] lg:ect-pl-5 first:lg:ect-border-l-0 first:lg:ect-pl-0">
          <dt class="ect-font-body ect-text-base ect-font-medium ect-text-[#2b2723]">{{ p.title }}</dt>
          <dd class="ect-mt-1.5 ect-m-0 ect-font-body ect-text-sm ect-leading-relaxed ect-text-[#6b6357]">{{ p.text }}</dd>
        </div>
      </dl>
      <p class="ect-mt-6 ect-font-body ect-text-sm ect-text-[#6b6357]">
        <RouterLink to="/about" class="ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6] hover:ect-text-[#1f3f37]">More about us</RouterLink>
      </p>
    </div>
  </section>
</template>
