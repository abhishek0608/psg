<script setup lang="ts">
import HeroCampaign from '../components/HeroCampaign.vue'
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
  <div class="homepage ect-bg-[#faf7f2] ect-pb-16 sm:ect-pb-20">
    <HeroCampaign />
    <ShopByCollection />
    <FeaturedProducts />
    <EditorialCollections />
    <ProductShelf eyebrow="Just in" title="New arrivals" mode="new" :limit="4" />
    <ShopByBudget />
    <ProductShelf eyebrow="Beautifully within reach" title="Jewellery under ₹50,000" mode="under-price" :price-max="50000" :limit="4" />
    <AboutSection />
    <TestimonialsSection v-if="SITE_SETTINGS.enableReviews" />
  </div>
</template>

<style scoped>
.homepage :deep(> section:not(:first-child)) { scroll-margin-top: 150px; }
.homepage :deep(> section.ect-max-w-7xl) { padding-top: 80px; }
.homepage :deep(> section > header h2) { color: #243e35; font-weight: 400; }
.homepage :deep(a:focus-visible), .homepage :deep(button:focus-visible) { outline: 2px solid #9c783e; outline-offset: 5px; }
@media (max-width: 639px) {
  .homepage :deep(> section.ect-max-w-7xl) { padding-top: 48px; }
  .homepage :deep(> section > header) { flex-wrap: wrap; align-items: flex-start; gap: 16px; }
  .homepage :deep(> section > header h2) { font-size: 30px; }
}
@media (prefers-reduced-motion: reduce) {
  .homepage :deep(*), .homepage :deep(*::before), .homepage :deep(*::after) { animation: none !important; transition: none !important; }
}
</style>
