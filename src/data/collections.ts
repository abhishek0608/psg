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
]

interface HomepageCollectionLink {
  /** Stable key for the tile's configurable image. */
  slug: string
  title: string
  to: RouteLocationRaw
  fallbackImage: string
}

const collectionFallbackImages: Record<string, string> = {
  rings: '/ring-1.jpg',
  earrings: '/earring-1.jpg',
  pendants: '/pendant-1.jpg',
  bracelets: '/bracelet-1.jpg',
  necklaces: '/necklace-1.jpg',
  mangalsutras: '/raaga-mangalsutra-1.png',
}

// Shared with the image editor so every homepage tile can be customized.
// Style tiles use existing catalogue filters and keep the main navigation compact.
export const HOMEPAGE_COLLECTION_LINKS: HomepageCollectionLink[] = [
  ...COLLECTION_LINKS.map(({ slug, title }) => ({
    slug,
    title,
    to: `/collections/${slug}`,
    fallbackImage: collectionFallbackImages[slug] || '',
  })),
  { slug: 'solitaire-rings', title: 'Solitaire Rings', to: { path: '/collections/rings', query: { type: 'solitaire' } }, fallbackImage: '/celeste-solitaire-ring-1.webp' },
  { slug: 'open-rings', title: 'Open Rings', to: { path: '/collections/rings', query: { type: 'open-ring' } }, fallbackImage: '/verde-duet-ring-1.png' },
  { slug: 'drop-earrings', title: 'Drop Earrings', to: { path: '/collections/earrings', query: { type: 'drop' } }, fallbackImage: '/isha-chandelier-1.png' },
  { slug: 'emerald-jewellery', title: 'Emerald Jewellery', to: { path: '/collections', query: { stone: 'emerald' } }, fallbackImage: '/editorial-emerald-edit.webp' },
  { slug: 'chain-bracelets', title: 'Chain Bracelets', to: { path: '/collections/bracelets', query: { type: 'chain-bracelet' } }, fallbackImage: '/indra-link-bracelet-1.jpg' },
  { slug: 'diamond-jewellery', title: 'Diamond Jewellery', to: { path: '/collections', query: { stone: 'diamond' } }, fallbackImage: '/editorial-everyday-diamonds.webp' },
]

export function findCollectionBySlug(slug: string): CollectionLink | null {
  return COLLECTION_LINKS.find((c) => c.slug === slug) ?? null
}
