<script setup lang="ts">
// "The Jewelet promise" cards (Aurelle design) — trust content adapted from the
// site's actual policies (see AboutView / footer).
const promise: { icon: 'pricing' | 'buyback' | 'quality' | 'returns'; title: string; text: string; bg: string }[] = [
  {
    icon: 'pricing',
    title: 'Transparent pricing',
    text: 'Metal rate, making charges and taxes shown clearly on every product — no hidden markups.',
    bg: '#1f6b52',
  },
  {
    icon: 'buyback',
    title: 'Lifetime exchange',
    text: 'Exchange or upgrade at prevailing rates, any time. Your investment stays protected.',
    bg: '#26406e',
  },
  {
    icon: 'quality',
    title: 'Certified quality',
    text: 'Every piece BIS hallmarked and stones certified for guaranteed purity.',
    bg: '#9c2c3e',
  },
  {
    icon: 'returns',
    title: 'Easy returns',
    text: 'Changed your mind? Free, hassle-free returns within the return window.',
    bg: '#c9765a',
  },
]
</script>

<template>
  <section id="about" class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8 ect-pt-16 sm:ect-pt-20">
    <header class="ect-text-center ect-mb-9">
      <p class="ect-font-body ect-text-xs ect-uppercase ect-tracking-[0.24em] ect-text-[#b79a56]">The Jewelet promise</p>
      <h2 class="ect-mt-2 ect-font-display ect-text-3xl sm:ect-text-[2.5rem] ect-font-medium ect-leading-tight ect-text-[#2b2723]">
        Shop with total confidence
      </h2>
    </header>

    <div class="ect-grid ect-grid-cols-1 sm:ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-4">
      <article
        v-for="p in promise"
        :key="p.title"
        class="ect-bg-white ect-border ect-border-[#ece4d5] ect-rounded-[10px] ect-p-7"
      >
        <span
          class="ect-inline-flex ect-items-center ect-justify-center ect-w-11 ect-h-11 ect-rounded-xl ect-text-white ect-mb-4"
          :style="{ background: p.bg }"
        >
          <svg v-if="p.icon === 'pricing'" class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <svg v-else-if="p.icon === 'buyback'" class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <svg v-else-if="p.icon === 'quality'" class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M12 21L2.25 8.25 6 3.75h12l3.75 4.5L12 21zM8.25 8.25L12 3.75l3.75 4.5M12 21L8.25 8.25M12 21l3.75-12.75" />
          </svg>
          <svg v-else class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </span>
        <h3 class="ect-font-body ect-text-base ect-font-medium ect-text-[#2b2723]">{{ p.title }}</h3>
        <p class="ect-mt-2 ect-font-body ect-text-[13.5px] ect-leading-relaxed ect-text-[#7a7264]">{{ p.text }}</p>
      </article>
    </div>

    <p class="ect-text-center ect-mt-6 ect-font-body ect-text-[13px] ect-text-[#8a8172]">
      Full price breakup — metal rate, making charges &amp; taxes — shown on every product page.
      <RouterLink to="/about" class="ect-underline hover:ect-text-[#1f5c4d] ect-transition-colors">Read our trust promise</RouterLink>
    </p>
  </section>
</template>
