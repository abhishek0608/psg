<script setup lang="ts">
import { HOMEPAGE_COLLECTION_LINKS } from '../data/collections'

const collections = HOMEPAGE_COLLECTION_LINKS
</script>

<template>
  <section class="category-section" aria-labelledby="category-heading">
    <div class="category-inner">
      <header class="category-header">
        <h2 id="category-heading" class="ect-font-display">Shop by Category</h2>
        <RouterLink to="/collections" class="category-view-all">
          View All <span aria-hidden="true">→</span>
        </RouterLink>
      </header>
      <nav class="category-row" aria-label="Shop by category">
        <RouterLink v-for="item in collections" :key="item.slug" class="category-link" :to="item.to">
          <span class="category-image">
            <img :src="item.image" alt="" width="190" height="190" loading="lazy" decoding="async" />
          </span>
          <span>{{ item.title }}</span>
        </RouterLink>
      </nav>
    </div>
  </section>
</template>

<style scoped>
.category-section {
  background: #fff;
  color: #182d49;
  padding: 24px 0 28px;
}
.category-inner { max-width: 1536px; margin: 0 auto; padding: 0 32px; }
.category-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.category-header h2 { font-size: 24px; line-height: 1.3; }
.category-view-all {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  font-size: 14px;
}
.category-view-all:hover { text-decoration: underline; text-underline-offset: 4px; }
.category-row {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 28px 20px;
  max-width: 1320px;
  margin: 0 auto;
}
.category-link {
  grid-column: span 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 15px;
  line-height: 1.4;
  text-align: center;
  white-space: nowrap;
}
.category-image {
  display: block;
  width: 100%;
  max-width: 190px;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 50%;
  background: #f5f0e9;
  transition: box-shadow 200ms ease;
}
.category-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 60%;
  transition: transform 300ms ease;
}
.category-link:hover .category-image { box-shadow: 0 0 0 2px #cfb582; }
.category-link:hover img { transform: scale(1.05); }
.category-section :focus-visible { outline: 2px solid #9c783e; outline-offset: 4px; }
@media (max-width: 1023px) {
  .category-section { padding: 18px 0 16px; }
  .category-inner { padding: 0 24px; }
  .category-row {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: 116px;
    justify-content: space-between;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    margin: 0 -24px;
    padding: 4px 24px 10px;
    scrollbar-width: thin;
    scrollbar-color: #d4c8b6 transparent;
  }
  .category-link { grid-column: auto; scroll-snap-align: start; }
}
@media (max-width: 639px) {
  .category-inner { padding: 0 16px; }
  .category-header h2 { font-size: 22px; }
  .category-header { margin-bottom: 10px; }
  .category-row { grid-auto-columns: 96px; gap: 14px; margin: 0 -16px; padding: 4px 16px 10px; }
  .category-link { font-size: 14px; }
}
</style>
