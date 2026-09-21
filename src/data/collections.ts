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
  /** Stable key, also the key an internal-workspace upload is stored under. */
  slug: string
  title: string
  to: RouteLocationRaw
  /** Curated tile artwork. Takes precedence over an uploaded image. */
  image: string
}

const collectionTileImages: Record<string, string> = {
  rings: '/showcase/ring-ruby-bloom.webp',
  earrings: '/showcase/earrings-butterfly-studs.webp',
  pendants: '/showcase/pendant-emerald-clover.webp',
  bracelets: '/showcase/bracelet-emerald-tennis.webp',
  necklaces: '/showcase/necklace-ruby-cascade.webp',
  mangalsutras: '/showcase/mangalsutra-emerald.webp',
}

// The homepage "Shop by category" row. Style tiles use existing catalogue
// filters and keep the main navigation compact. Slugs are shared with the
// internal image editor, whose uploads still drive the mega menu and the
// mobile drawer — the homepage row uses the curated artwork below.
export const HOMEPAGE_COLLECTION_LINKS: HomepageCollectionLink[] = [
  ...COLLECTION_LINKS.map(({ slug, title }) => ({
    slug,
    title,
    to: `/collections/${slug}`,
    image: collectionTileImages[slug] || '',
  })),
  { slug: 'solitaire-rings', title: 'Solitaire Rings', to: { path: '/collections/rings', query: { type: 'solitaire' } }, image: '/celeste-solitaire-ring-1.webp' },
  { slug: 'open-rings', title: 'Open Rings', to: { path: '/collections/rings', query: { type: 'open-ring' } }, image: '/verde-duet-ring-1.png' },
  { slug: 'drop-earrings', title: 'Drop Earrings', to: { path: '/collections/earrings', query: { type: 'drop' } }, image: '/showcase/earrings-sapphire-drops.webp' },
  { slug: 'emerald-jewellery', title: 'Emerald Jewellery', to: { path: '/collections', query: { stone: 'emerald' } }, image: '/showcase/ring-emerald-cocktail.webp' },
  { slug: 'chain-bracelets', title: 'Chain Bracelets', to: { path: '/collections/bracelets', query: { type: 'chain-bracelet' } }, image: '/indra-link-bracelet-1.jpg' },
  { slug: 'diamond-jewellery', title: 'Diamond Jewellery', to: { path: '/collections', query: { stone: 'diamond' } }, image: '/editorial-everyday-diamonds.webp' },
]

export function findCollectionBySlug(slug: string): CollectionLink | null {
  return COLLECTION_LINKS.find((c) => c.slug === slug) ?? null
}
