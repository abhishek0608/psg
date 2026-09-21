import type { CollectionPreset } from '../composables/useCollectionPreset'
import type { RouteLocationRaw } from 'vue-router'

export interface CollectionLink {
  /** URL slug, e.g. /collections/rings */
  slug: string
  /** Short label used in nav menus */
  label: string
  /** Heading shown on the collection page */
  title: string
  /** One-line description shown under the page title */
  description: string
  /** Icon key consumed by AppHeader */
  icon: string
  /** Filter preset applied to the product grid */
  preset: CollectionPreset
}

export const COLLECTION_LINKS: CollectionLink[] = [
  { slug: 'rings', label: 'Ring', title: 'Rings', description: 'Solitaires, clusters and everyday bands.', icon: 'ring', preset: { category: 'Rings' } },
  { slug: 'earrings', label: 'Earring', title: 'Earrings', description: 'Studs, drops and statement jhumkas.', icon: 'earrings', preset: { category: 'Earrings' } },
  { slug: 'pendants', label: 'Pendant', title: 'Pendants', description: 'Delicate pendants to layer or wear solo.', icon: 'pendant', preset: { subtypes: ['pendant'] } },
  { slug: 'bracelets', label: 'Bracelet / Bangle', title: 'Bracelets & Bangles', description: 'Cuffs, chains and classic bangles.', icon: 'bracelet', preset: { category: 'Bracelets' } },
  { slug: 'necklaces', label: 'Necklace', title: 'Necklaces', description: 'Statement necklaces and timeless chains.', icon: 'necklace', preset: { category: 'Necklaces' } },
  { slug: 'mangalsutras', label: 'Mangalsutra', title: 'Mangalsutras', description: 'Traditional meaning, reimagined for today.', icon: 'necklace', preset: { category: 'Mangal Sutra' } },
  { slug: 'gold-coins', label: 'Gold Coin', title: 'Gold Coins', description: 'Hallmarked investment coins in assorted weights.', icon: 'coin', preset: { category: 'Gold Coins' } },
]

interface HomepageCollectionLink {
  /** Stable key, also the key an internal-workspace upload is stored under. */
  slug: string
  title: string
  to: RouteLocationRaw
  /** Curated tile artwork. Takes precedence over an uploaded image. */
  image: string
}

// Curated campaign photography. Audience and gifting entries use catalogue
// search until dedicated filters exist.
export const HOMEPAGE_COLLECTION_LINKS: HomepageCollectionLink[] = [
  { slug: 'rings', title: 'Rings', to: '/collections/rings', image: '/categories/rings.webp' },
  { slug: 'earrings', title: 'Earrings', to: '/collections/earrings', image: '/categories/earrings.webp' },
  { slug: 'necklaces', title: 'Necklaces', to: '/collections/necklaces', image: '/categories/necklaces.webp' },
  { slug: 'pendants', title: 'Pendants', to: '/collections/pendants', image: '/categories/pendants.webp' },
  { slug: 'bracelets', title: 'Bracelets', to: '/collections/bracelets', image: '/categories/bracelets.webp' },
  { slug: 'mangalsutras', title: 'Mangalsutra', to: '/collections/mangalsutras', image: '/categories/mangalsutra.webp' },
  { slug: 'solitaire-rings', title: 'Solitaire', to: { path: '/collections/rings', query: { type: 'solitaire' } }, image: '/celeste-solitaire-ring-1.webp' },
  { slug: 'men', title: 'Men', to: { path: '/search', query: { q: 'men' } }, image: '/categories/men.webp' },
  { slug: 'kids', title: 'Kids', to: { path: '/search', query: { q: 'kids' } }, image: '/categories/kids.webp' },
  { slug: 'gifts', title: 'Gifts', to: { path: '/search', query: { q: 'gift' } }, image: '/categories/gifts.webp' },
  { slug: 'gold-coins', title: 'Gold Coins', to: '/collections/gold-coins', image: '/categories/gold-coins.webp' },
  { slug: 'collections', title: 'Collections', to: '/collections', image: '/categories/collections.webp' },
]

export function findCollectionBySlug(slug: string): CollectionLink | null {
  return COLLECTION_LINKS.find((c) => c.slug === slug) ?? null
}
