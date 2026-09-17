<script setup lang="ts">
import { ref } from 'vue'
import { useSiteConfig } from '../composables/useSiteConfig'

const year = new Date().getFullYear()
const email = ref('')
const subscribed = ref(false)
const { logoSrc } = useSiteConfig()
const brandName = 'Jewelet'

function handleSubscribe() {
  if (!email.value.trim()) return
  subscribed.value = true
  email.value = ''
  setTimeout(() => { subscribed.value = false }, 4000)
}
</script>

<template>
  <footer class="ect-bg-[#1a1613] ect-text-[#d9d2c5]">
    <div class="ect-max-w-7xl ect-mx-auto ect-px-4 sm:ect-px-6 lg:ect-px-8">

      <!-- Newsletter -->
      <section class="ect-py-10 ect-border-b ect-border-white/10 ect-grid ect-grid-cols-1 lg:ect-grid-cols-2 ect-gap-6 lg:ect-items-center">
        <div>
          <h2 class="ect-font-display ect-text-2xl ect-text-white">Sign up for updates</h2>
          <p class="ect-mt-1.5 ect-font-body ect-text-sm ect-text-[#a89f90]">New designs and offers, once or twice a month.</p>
        </div>
        <form @submit.prevent="handleSubscribe" class="ect-w-full lg:ect-max-w-md lg:ect-justify-self-end">
          <div class="ect-flex ect-flex-col sm:ect-flex-row ect-gap-2">
            <input
              v-model="email"
              type="email"
              required
              placeholder="Email address"
              aria-label="Email address"
              class="ect-flex-1 ect-rounded-sm ect-bg-white ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-[#1a1613] placeholder:ect-text-[#8a8172] focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-[#c9a227]/60"
            />
            <button
              type="submit"
              class="ect-shrink-0 ect-rounded-sm ect-bg-[#c9a227] ect-px-6 ect-py-3 ect-font-body ect-text-sm ect-font-medium ect-text-[#1a1613] hover:ect-bg-[#dcbf72]"
            >
              Subscribe
            </button>
          </div>
          <p v-if="subscribed" class="ect-mt-2 ect-font-body ect-text-xs ect-text-[#dcbf72]">Thanks, you're on the list.</p>
        </form>
      </section>

      <!-- Links -->
      <section class="ect-py-10 ect-grid ect-grid-cols-2 sm:ect-grid-cols-4 ect-gap-8">
        <div class="ect-col-span-2 sm:ect-col-span-1">
          <img :src="logoSrc" :alt="`${brandName} logo`" class="ect-h-9 ect-w-auto ect-max-w-[140px] ect-object-contain ect-bg-white ect-rounded-sm ect-px-2 ect-py-1.5" />
          <p class="ect-mt-4 ect-font-body ect-text-sm ect-leading-relaxed ect-text-[#a89f90] ect-max-w-xs">
            Certified gold and diamond jewellery, shipped anywhere in India.
          </p>
        </div>

        <nav aria-label="Shop">
          <h3 class="ect-font-body ect-text-sm ect-font-medium ect-text-white ect-mb-3">Shop</h3>
          <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-2">
            <li><RouterLink to="/collections/rings" class="ect-font-body ect-text-sm hover:ect-text-white">Rings</RouterLink></li>
            <li><RouterLink to="/collections/earrings" class="ect-font-body ect-text-sm hover:ect-text-white">Earrings</RouterLink></li>
            <li><RouterLink to="/collections/pendants" class="ect-font-body ect-text-sm hover:ect-text-white">Pendants</RouterLink></li>
            <li><RouterLink to="/collections/necklaces" class="ect-font-body ect-text-sm hover:ect-text-white">Necklaces</RouterLink></li>
            <li><RouterLink to="/collections" class="ect-font-body ect-text-sm hover:ect-text-white">All jewellery</RouterLink></li>
          </ul>
        </nav>

        <nav aria-label="Help">
          <h3 class="ect-font-body ect-text-sm ect-font-medium ect-text-white ect-mb-3">Help</h3>
          <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-2">
            <li><RouterLink to="/contact" class="ect-font-body ect-text-sm hover:ect-text-white">Customer support</RouterLink></li>
            <li><RouterLink to="/video-consultation" class="ect-font-body ect-text-sm hover:ect-text-white">Book a video call</RouterLink></li>
            <li><RouterLink to="/orders" class="ect-font-body ect-text-sm hover:ect-text-white">My orders</RouterLink></li>
            <li><RouterLink to="/wishlist" class="ect-font-body ect-text-sm hover:ect-text-white">Wishlist</RouterLink></li>
          </ul>
        </nav>

        <nav aria-label="Company">
          <h3 class="ect-font-body ect-text-sm ect-font-medium ect-text-white ect-mb-3">Company</h3>
          <ul class="ect-list-none ect-m-0 ect-p-0 ect-space-y-2">
            <li><RouterLink to="/about" class="ect-font-body ect-text-sm hover:ect-text-white">About us</RouterLink></li>
            <li><RouterLink to="/careers" class="ect-font-body ect-text-sm hover:ect-text-white">Careers</RouterLink></li>
            <li><a href="tel:+919216399116" class="ect-font-body ect-text-sm hover:ect-text-white">+91 92163 99116</a></li>
            <li><a href="mailto:sales@jewelet.example" class="ect-font-body ect-text-sm hover:ect-text-white">sales@jewelet.example</a></li>
          </ul>
        </nav>
      </section>

      <div class="ect-border-t ect-border-white/10 ect-py-5">
        <p class="ect-font-body ect-text-xs ect-text-[#8a8172]">© {{ year }} Jewelet. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>
