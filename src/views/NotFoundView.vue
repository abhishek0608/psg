<script setup lang="ts">
// Every unknown path is served index.html by the Vercel rewrite, so without a
// catch-all route the router matched nothing and rendered an empty <main> —
// header and footer collapsed onto a blank page. This is the page a mistyped
// URL, an old campaign link or a delisted collection lands on.
import { onMounted } from 'vue'
import { setPageMeta } from '../composables/useSeo'

const shortcuts = [
  { to: '/collections', label: 'All jewellery' },
  { to: '/collections/rings', label: 'Rings' },
  { to: '/collections/earrings', label: 'Earrings' },
  { to: '/collections/necklaces', label: 'Necklaces' },
]

onMounted(() => {
  // The router's afterEach hook ran before this component resolved the match as
  // a miss, so the title it set was the generic site name. Correct it here, and
  // keep the page out of the index — it is a dead end, not content.
  setPageMeta({ title: 'Page Not Found', noindex: true })
})
</script>

<template>
  <section
    class="ect-pt-28 sm:ect-pt-36 ect-pb-28 ect-px-6 ect-bg-cream ect-min-h-screen ect-flex ect-flex-col ect-items-center ect-justify-center ect-text-center"
  >
    <span class="ect-w-20 ect-h-20 ect-rounded-full ect-bg-champagne ect-flex ect-items-center ect-justify-center ect-mb-6">
      <svg class="ect-w-9 ect-h-9 ect-text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    </span>

    <p class="ect-eyebrow ect-text-charcoal/45 ect-mb-3">Error 404</p>
    <h1 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal ect-mb-2">This page doesn't exist</h1>
    <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mb-7 ect-max-w-xs">
      The link may be out of date, or the page may have moved. The collections below are a good place to pick up.
    </p>

    <RouterLink
      to="/"
      class="ect-inline-flex ect-items-center ect-gap-2 ect-px-7 ect-py-3.5 ect-bg-charcoal ect-text-white ect-font-body ect-text-sm ect-font-semibold ect-rounded-full hover:ect-bg-noir ect-transition-colors"
    >
      <svg class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
      Back to home
    </RouterLink>

    <ul class="ect-mt-10 ect-flex ect-flex-wrap ect-items-center ect-justify-center ect-gap-x-6 ect-gap-y-3 ect-list-none ect-m-0 ect-p-0">
      <li v-for="item in shortcuts" :key="item.to">
        <RouterLink
          :to="item.to"
          class="ect-font-body ect-text-sm ect-text-charcoal/60 hover:ect-text-charcoal ect-underline ect-underline-offset-4 ect-decoration-charcoal/20 hover:ect-decoration-charcoal/50 ect-transition-colors"
        >
          {{ item.label }}
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
