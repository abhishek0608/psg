<script setup lang="ts">
// Deep-green service banner (Aurelle design), adapted to Jewelet's assisted
// buying flow: video consultation + services booking.
</script>

<template>
  <section class="ect-max-w-7xl ect-mx-auto ect-mt-16 sm:ect-mt-[72px] ect-px-4 sm:ect-px-6 lg:ect-px-8">
    <div class="ect-rounded-[10px] ect-overflow-hidden ect-bg-[#1f3f37] ect-text-[#f4ecd9] ect-grid ect-grid-cols-1 lg:ect-grid-cols-2">
      <div class="ect-px-7 ect-py-12 sm:ect-px-[52px] sm:ect-py-14 ect-flex ect-flex-col ect-justify-center">
        <p class="ect-font-body ect-text-xs ect-uppercase ect-tracking-[0.24em] ect-text-[#c7b688] ect-mb-4">
          Guided shopping · Free
        </p>
        <h2 class="ect-font-display ect-text-3xl sm:ect-text-[2.6rem] ect-font-medium ect-leading-[1.08] ect-mb-4">
          Try before you buy — from wherever you are.
        </h2>
        <p class="ect-font-body ect-text-[15px] ect-leading-relaxed ect-text-[#cfd8cf] ect-max-w-[420px] ect-mb-7">
          Book a free video consultation and our stylist walks you through the pieces you love — fit, finish and
          pricing, live on call. No obligation, no charges.
        </p>
        <div class="ect-flex ect-flex-wrap ect-gap-3.5">
          <RouterLink
            to="/services"
            class="ect-inline-flex ect-items-center ect-rounded-full ect-bg-[#f4ecd9] ect-text-[#1f3f37] ect-px-7 ect-py-3.5 ect-font-body ect-text-[13.5px] ect-tracking-[0.05em] hover:ect-bg-white ect-transition-colors"
          >
            Book a video consultation
          </RouterLink>
          <RouterLink
            to="/services"
            class="ect-inline-flex ect-items-center ect-rounded-full ect-border ect-border-[#f4ecd9]/40 ect-px-6 ect-py-3.5 ect-font-body ect-text-[13.5px] ect-tracking-[0.05em] hover:ect-bg-[#f4ecd9]/10 ect-transition-colors"
          >
            Explore all services
          </RouterLink>
        </div>
      </div>

      <!-- Decorative panel: concentric rings on deep green -->
      <div class="ect-relative ect-min-h-[240px] lg:ect-min-h-[400px] ect-bg-[#26493f] ect-overflow-hidden">
        <svg class="ect-absolute ect-inset-0 ect-w-full ect-h-full" viewBox="0 0 640 400" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <circle cx="440" cy="200" r="70" stroke="#c7b688" stroke-opacity="0.55" stroke-width="1.5" />
          <circle cx="440" cy="200" r="120" stroke="#c7b688" stroke-opacity="0.35" stroke-width="1.2" />
          <circle cx="440" cy="200" r="175" stroke="#c7b688" stroke-opacity="0.22" stroke-width="1" />
          <circle cx="440" cy="200" r="235" stroke="#c7b688" stroke-opacity="0.12" stroke-width="1" />
          <circle cx="440" cy="130" r="5" fill="#c7b688" fill-opacity="0.9" />
          <circle cx="376" cy="304" r="3.5" fill="#c7b688" fill-opacity="0.6" />
          <circle cx="560" cy="248" r="2.5" fill="#c7b688" fill-opacity="0.5" />
        </svg>
        <div class="ect-absolute ect-inset-0 ect-flex ect-items-center ect-justify-center">
          <span class="ect-font-display ect-italic ect-text-2xl sm:ect-text-3xl ect-text-[#f4ecd9]/85 ect-text-center ect-px-8">
            “Seen live, loved forever.”
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
