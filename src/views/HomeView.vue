<script setup lang="ts">
import HeroCampaign from '../components/HeroCampaign.vue'
import ShopByCollection from '../components/ShopByCollection.vue'
import ExploreByMaterial from '../components/ExploreByMaterial.vue'
import FeaturedProducts from '../components/FeaturedProducts.vue'
import EditorialCollections from '../components/EditorialCollections.vue'
import ProductShelf from '../components/ProductShelf.vue'
import ShopByBudget from '../components/ShopByBudget.vue'
import AboutSection from '../components/AboutSection.vue'
</script>

<template>
  <div class="homepage ect-bg-[#faf7f2] ect-pb-16 sm:ect-pb-20">
    <HeroCampaign />
    <ShopByCollection />
    <ExploreByMaterial />
    <FeaturedProducts />
    <EditorialCollections />
    <ProductShelf title="New arrivals" mode="new" :limit="4" />
    <ShopByBudget />
    <ProductShelf title="Under ₹50,000" mode="under-price" :price-max="50000" :limit="4" />
    <AboutSection />
  </div>
</template>

<style scoped>
.homepage :deep(> section:not(:first-child)) { scroll-margin-top: 150px; }
.homepage :deep(a:focus-visible), .homepage :deep(button:focus-visible) { outline: 2px solid #9c783e; outline-offset: 5px; }
@media (prefers-reduced-motion: reduce) {
  .homepage :deep(*), .homepage :deep(*::before), .homepage :deep(*::after) { animation: none !important; transition: none !important; }
}
</style>
