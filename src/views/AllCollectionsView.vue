<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import CollectionGrid from '../components/CollectionGrid.vue'
import { useCollectionPreset, type CollectionPreset } from '../composables/useCollectionPreset'
import type { Color, Material, ProductSubtype } from '../data/products'

const route = useRoute()
const { setPreset } = useCollectionPreset()

const MATERIALS: Material[] = ['gold', 'silver']
const COLOR_IDS: Color[] = ['yellow', 'white', 'rose', 'oxidised']

// No category lock — show the full catalogue across every collection, refined
// by the same query params CollectionView supports
// (?metal=gold&color=rose&stone=diamond&type=solitaire&priceMin=500&priceMax=1000).
function presetFromQuery(): CollectionPreset {
  const q = route.query
  const p: CollectionPreset = { tab: 'all' }
  const metal = String(q.metal || '')
  if ((MATERIALS as string[]).includes(metal)) p.material = metal as Material
  const color = String(q.color || '')
  if ((COLOR_IDS as string[]).includes(color)) p.color = color as Color
  const stone = String(q.stone || '')
  if (stone) p.stoneTags = stone.split(',').filter(Boolean)
  const type = String(q.type || '')
  if (type) p.subtypes = type.split(',').filter(Boolean) as ProductSubtype[]
  const priceMin = Number(q.priceMin)
  if (Number.isFinite(priceMin) && priceMin > 0) p.priceMin = priceMin
  const priceMax = Number(q.priceMax)
  if (Number.isFinite(priceMax) && priceMax > 0) p.priceMax = priceMax
  return p
}

function apply() {
  // Ignore watcher calls fired while navigating away from this page.
  if (route.name !== 'collections') return
  setPreset(presetFromQuery())
}

// Set synchronously so the preset is in place before CollectionGrid mounts.
apply()
watch(() => route.fullPath, apply)
</script>

<template>
  <section class="ect-pt-32">
    <!-- Compact page header (no banner) -->
    <header class="ect-px-6 ect-max-w-7xl ect-mx-auto">
      <nav class="ect-font-body ect-text-xs ect-text-charcoal/40 ect-mb-1.5" aria-label="Breadcrumb">
        <RouterLink to="/" class="hover:ect-text-charcoal ect-transition-colors">Home</RouterLink>
        <span class="ect-mx-1.5">/</span>
        <span class="ect-text-charcoal/70">All Jewellery</span>
      </nav>
      <h1 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-font-light ect-leading-tight ect-text-charcoal">
        All Jewellery
      </h1>
    </header>

    <!-- Full product grid (header suppressed; this page provides its own) -->
    <CollectionGrid hide-header sidebar />
  </section>
</template>
