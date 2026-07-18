<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CollectionGrid from '../components/CollectionGrid.vue'
import { findCollectionBySlug } from '../data/collections'
import { useCollectionPreset, type CollectionPreset } from '../composables/useCollectionPreset'
import { setPageMeta } from '../composables/useSeo'
import type { Color, Material, ProductSubtype } from '../data/products'

const route = useRoute()
const router = useRouter()
const { setPreset } = useCollectionPreset()

const collection = computed(() => findCollectionBySlug(String(route.params.slug || '')))

const MATERIALS: Material[] = ['gold', 'silver']
const COLOR_IDS: Color[] = ['yellow', 'white', 'rose', 'oxidised']

// Mega-menu links refine a collection via query params
// (?metal=gold&color=rose&stone=diamond&type=solitaire&priceMin=500&priceMax=1000).
function presetFromQuery(base: CollectionPreset): CollectionPreset {
  const q = route.query
  const p: CollectionPreset = { ...base }
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

function applyForSlug() {
  // Ignore watcher calls fired while navigating away from this page.
  if (route.name !== 'collection') return
  const c = collection.value
  if (!c) {
    // Unknown collection slug → fall back to the homepage.
    router.replace('/')
    return
  }
  setPreset(presetFromQuery(c.preset))
  setPageMeta({ title: c.title, description: c.description })
}

// Set synchronously so the preset is in place before CollectionGrid mounts,
// and re-apply whenever the user switches between collection pages or picks
// a different mega-menu refinement (query change on the same slug).
applyForSlug()
watch(() => route.fullPath, applyForSlug)
</script>

<template>
  <section v-if="collection" class="ect-pt-28">
    <!-- Compact page header (no banner) -->
    <header class="ect-px-6 ect-max-w-7xl ect-mx-auto">
      <nav class="ect-font-body ect-text-xs ect-text-charcoal/40 ect-mb-1.5" aria-label="Breadcrumb">
        <RouterLink to="/" class="hover:ect-text-charcoal ect-transition-colors">Home</RouterLink>
        <span class="ect-mx-1.5">/</span>
        <span class="ect-text-charcoal/70">{{ collection.title }}</span>
      </nav>
      <h1 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-font-light ect-leading-tight ect-text-charcoal">{{ collection.title }}</h1>
    </header>

    <!-- Product grid (header suppressed; this page provides its own) -->
    <CollectionGrid hide-header sidebar />
  </section>
</template>
