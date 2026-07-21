<script setup lang="ts">
import HeroCampaign from '../components/HeroCampaign.vue'
import ShopByCollection from '../components/ShopByCollection.vue'
import ShopByStone from '../components/ShopByStone.vue'
import FeaturedProducts from '../components/FeaturedProducts.vue'
import AboutSection from '../components/AboutSection.vue'
import TestimonialsSection from '../components/TestimonialsSection.vue'
import { SITE_SETTINGS } from '../config/site-settings'
</script>

<template>
  <!-- Warm ivory canvas for the Aurelle homepage design -->
  <div class="ect-bg-[#faf7f2] ect-pb-16 sm:ect-pb-20">
    <HeroCampaign />
    <ShopByCollection />
    <ShopByStone />
    <FeaturedProducts />
    <AboutSection />
    <TestimonialsSection v-if="SITE_SETTINGS.enableReviews" />
  </div>
</template>
