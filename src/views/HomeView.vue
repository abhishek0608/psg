<script setup lang="ts">
import HeroCampaign from '../components/HeroCampaign.vue'
import ShopByCollection from '../components/ShopByCollection.vue'
import FeaturedProducts from '../components/FeaturedProducts.vue'
import AboutSection from '../components/AboutSection.vue'
import TestimonialsSection from '../components/TestimonialsSection.vue'
import { SITE_SETTINGS } from '../config/site-settings'
</script>

<template>
  <HeroCampaign />
  <ShopByCollection />
  <FeaturedProducts />
  <AboutSection />
  <TestimonialsSection v-if="SITE_SETTINGS.enableReviews" />
</template>
