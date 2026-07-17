<script setup lang="ts">
import { ref } from 'vue'

const year = new Date().getFullYear()
const email = ref('')
const subscribed = ref(false)

function handleSubscribe() {
  if (!email.value.trim()) return
  subscribed.value = true
  email.value = ''
  setTimeout(() => { subscribed.value = false }, 4000)
}
</script>

<template>
  <footer class="ect-relative ect-overflow-hidden ect-text-white">
    <span class="ect-absolute ect-inset-0 ect-bg-gradient-to-br ect-from-bluestone-900 ect-via-bluestone-800 ect-to-noir" />
    <span class="ect-absolute ect-inset-0 ect-bg-[radial-gradient(ellipse_50%_40%_at_90%_100%,_rgba(201,146,55,0.12),transparent)]" />

    <!-- Newsletter -->
    <section class="ect-relative ect-max-w-7xl ect-mx-auto ect-px-6 ect-pt-16 ect-pb-12 ect-border-b ect-border-white/10">
      <div class="ect-grid ect-grid-cols-1 lg:ect-grid-cols-2 ect-gap-8 lg:ect-gap-16 ect-items-center">
        <div>
          <p class="ect-font-body ect-text-[11px] ect-uppercase ect-tracking-[0.18em] ect-text-gold-400 ect-mb-3">BlueStone updates</p>
          <h2 class="ect-font-display ect-text-3xl sm:ect-text-4xl ect-font-semibold ect-leading-tight ect-text-white">Be the first to see new arrivals</h2>
          <p class="ect-font-body ect-text-sm ect-text-white/55 ect-mt-3 ect-max-w-md">New designs, festive offers, store updates and curated jewellery edits.</p>
        </div>
        <form @submit.prevent="handleSubscribe" class="ect-w-full">
          <div class="ect-flex ect-flex-col sm:ect-flex-row ect-gap-3">
            <input
              v-model="email"
              type="email"
              required
              placeholder="Your email address"
              aria-label="Email address"
              class="ect-flex-1 ect-rounded-full ect-bg-white/[0.08] ect-border ect-border-white/20 ect-px-5 ect-py-3.5 ect-font-body ect-text-sm ect-text-white placeholder:ect-text-white/50 focus:ect-outline-none focus:ect-border-white/50 focus:ect-bg-white/[0.12] ect-transition-all"
            />
            <button
              type="submit"
              class="ect-shrink-0 ect-inline-flex ect-items-center ect-justify-center ect-rounded-md ect-bg-white ect-px-7 ect-py-3.5 ect-font-body ect-text-[13px] ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-bluestone-800 hover:ect-bg-champagne ect-transition-colors"
            >
              Subscribe
            </button>
          </div>
          <p v-if="subscribed" class="ect-font-body ect-text-xs ect-text-gold-400 ect-mt-3">Thank you — you are on the list.</p>
        </form>
      </div>
    </section>

    <section class="ect-relative ect-max-w-7xl ect-mx-auto ect-px-6 ect-pt-14 ect-grid ect-grid-cols-2 sm:ect-grid-cols-4 ect-gap-10 ect-items-start ect-mb-12">
      <section class="ect-col-span-2 sm:ect-col-span-1">
        <span class="ect-flex ect-items-center ect-gap-3 ect-mb-4">
          <span class="ect-flex ect-h-10 ect-w-10 ect-items-center ect-justify-center ect-rounded-full ect-bg-white ect-font-display ect-text-xl ect-font-semibold ect-text-bluestone-800">B</span>
          <span class="ect-font-body ect-text-xl ect-font-bold">BlueStone</span>
        </span>
        <p class="ect-font-body ect-text-sm ect-text-white/55 ect-leading-relaxed ect-max-w-xs">Certified fine jewellery for modern India, with gold and diamond designs for everyday wear, gifting and celebrations.</p>
      </section>

      <nav>
        <h3 class="ect-font-body ect-text-[11px] ect-font-semibold ect-uppercase ect-tracking-[0.18em] ect-text-gold-400 ect-mb-4">Explore</h3>
        <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-2.5">
          <li><RouterLink to="/#collections" class="ect-font-body ect-text-sm ect-text-white/60 hover:ect-text-white ect-transition-colors">Collections</RouterLink></li>
          <li><RouterLink to="/about" class="ect-font-body ect-text-sm ect-text-white/60 hover:ect-text-white ect-transition-colors">Our Promise</RouterLink></li>
          <li><RouterLink to="/contact" class="ect-font-body ect-text-sm ect-text-white/60 hover:ect-text-white ect-transition-colors">Contact</RouterLink></li>
          <li><RouterLink to="/careers" class="ect-font-body ect-text-sm ect-text-white/60 hover:ect-text-white ect-transition-colors">Careers</RouterLink></li>
        </ul>
      </nav>

      <nav>
        <h3 class="ect-font-body ect-text-[11px] ect-font-semibold ect-uppercase ect-tracking-[0.18em] ect-text-gold-400 ect-mb-4">Client Care</h3>
        <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-2.5">
          <li><p class="ect-font-body ect-text-sm ect-text-white/60">BIS Hallmarked Gold</p></li>
          <li><p class="ect-font-body ect-text-sm ect-text-white/60">Lifetime Exchange</p></li>
          <li><p class="ect-font-body ect-text-sm ect-text-white/60">Free Insured Shipping</p></li>
          <li><p class="ect-font-body ect-text-sm ect-text-white/60">30 Day Returns</p></li>
        </ul>
      </nav>

      <nav>
        <h3 class="ect-font-body ect-text-[11px] ect-font-semibold ect-uppercase ect-tracking-[0.18em] ect-text-gold-400 ect-mb-4">Get in Touch</h3>
        <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-2.5">
          <li><a href="mailto:care@bluestone.example" class="ect-font-body ect-text-sm ect-text-white/60 hover:ect-text-white ect-transition-colors">care@bluestone.example</a></li>
          <li><a href="tel:+910000000000" class="ect-font-body ect-text-sm ect-text-white/60 hover:ect-text-white ect-transition-colors">+91 00000 00000</a></li>
          <li><p class="ect-font-body ect-text-sm ect-text-white/40">Online and retail store experience</p></li>
        </ul>
      </nav>
    </section>

    <div class="ect-relative ect-max-w-7xl ect-mx-auto ect-px-6">
      <div class="ect-h-px ect-bg-white/10 ect-mb-6" />
      <div class="ect-flex ect-flex-col sm:ect-flex-row ect-items-start sm:ect-items-center ect-justify-between ect-gap-3 ect-pb-8">
        <p class="ect-font-body ect-text-xs ect-text-white/40">© {{ year }} BlueStone — Fine Jewellery</p>
        <p class="ect-font-body ect-text-xs ect-text-white/40 ect-tracking-[0.04em]">BIS Hallmarked · Certified Stones · Lifetime Exchange</p>
      </div>
    </div>
  </footer>
</template>
