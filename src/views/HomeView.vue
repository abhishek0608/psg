<script setup lang="ts">
import HeroCampaign from '../components/HeroCampaign.vue'
import AssuranceStrip from '../components/AssuranceStrip.vue'
import ShopByCollection from '../components/ShopByCollection.vue'
import FeaturedProducts from '../components/FeaturedProducts.vue'
import EditorialCollections from '../components/EditorialCollections.vue'
import ProductShelf from '../components/ProductShelf.vue'
import ShopByBudget from '../components/ShopByBudget.vue'
import AboutSection from '../components/AboutSection.vue'
import TestimonialsSection from '../components/TestimonialsSection.vue'
import { SITE_SETTINGS } from '../config/site-settings'
</script>

<template>
  <!-- Warm ivory canvas for the Aurelle homepage design -->
  <div class="ect-bg-[#faf7f2] ect-pb-16 sm:ect-pb-20">
    <HeroCampaign />
    <AssuranceStrip />
    <ShopByCollection />
    <FeaturedProducts />
    <EditorialCollections />
    <ProductShelf eyebrow="Just in" title="New arrivals" mode="new" />
    <ShopByBudget />
    <ProductShelf eyebrow="Beautifully within reach" title="Jewellery under ₹50,000" mode="under-price" :price-max="50000" />
    <AboutSection />
    <TestimonialsSection v-if="SITE_SETTINGS.enableReviews" />
  </div>
</template>
