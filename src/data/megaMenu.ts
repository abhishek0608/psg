/**
 * Data for the Bluestone-style desktop mega menu in AppHeader.
 *
 * Every link resolves to /collections/:slug with query params that
 * CollectionView parses into a CollectionPreset (see presetFromQuery there):
 *   metal    → material ('gold' | 'silver')
 *   color    → color ('yellow' | 'white' | 'rose' | 'oxidised')
 *   stone    → stoneTags (comma-separated)
 *   type     → subtypes (comma-separated)
 *   priceMin / priceMax → price range in whole currency units
 *
 * Entries are curated against the live catalog so links don't land on empty
 * grids — revisit when new materials/stones/subtypes are added to the catalog.
 */

export interface MegaQueryLink {
  label: string
  query?: Record<string, string>
}

export interface MegaCollectionMenu {
  /** Column heading, e.g. "Popular Ring Types" */
  typesHeading: string
  types: MegaQueryLink[]
  /** Rendered as "<label> <collection title>", e.g. "Rose Gold Rings". */
  metals: MegaQueryLink[]
  /** Tile image used when no per-collection image is configured */
  fallbackImage: string
}

export const MEGA_PRICE_RANGES: MegaQueryLink[] = [
  { label: 'Below ₹25,000', query: { priceMax: '25000' } },
  { label: '₹25,000 – ₹50,000', query: { priceMin: '25000', priceMax: '50000' } },
  { label: '₹50,000 – ₹1,00,000', query: { priceMin: '50000', priceMax: '100000' } },
  { label: '₹1,00,000 – ₹2,00,000', query: { priceMin: '100000', priceMax: '200000' } },
  { label: '₹2,00,000 & above', query: { priceMin: '200000' } },
]

export const MEGA_MENUS: Record<string, MegaCollectionMenu> = {
  rings: {
    typesHeading: 'Popular Ring Types',
    fallbackImage: '/ring-1.jpg',
    types: [
      { label: 'Solitaire', query: { type: 'solitaire' } },
      { label: 'Cluster', query: { type: 'cluster' } },
      { label: 'Multi-stone', query: { type: 'multi-stone' } },
      { label: 'All Rings' },
    ],
    metals: [
      { label: 'Gold', query: { metal: 'gold' } },
      { label: 'Yellow Gold', query: { metal: 'gold', color: 'yellow' } },
      { label: 'White Gold', query: { metal: 'gold', color: 'white' } },
      { label: 'Rose Gold', query: { metal: 'gold', color: 'rose' } },
    ],
  },
  earrings: {
    typesHeading: 'Popular Earring Types',
    fallbackImage: '/earring-1.jpg',
    types: [
      { label: 'Studs', query: { type: 'stud' } },
      { label: 'Drops', query: { type: 'drop' } },
      { label: 'Clusters', query: { type: 'cluster' } },
      { label: 'All Earrings' },
    ],
    metals: [
      { label: 'Gold', query: { metal: 'gold' } },
      { label: 'Rose Gold', query: { metal: 'gold', color: 'rose' } },
      { label: 'White Gold', query: { metal: 'gold', color: 'white' } },
    ],
  },
  pendants: {
    typesHeading: 'Popular Pendant Styles',
    fallbackImage: '/pendant-1.jpg',
    types: [
      { label: 'Diamond', query: { stone: 'diamond' } },
      { label: 'Garnet', query: { stone: 'garnet' } },
      { label: 'Rhodolite', query: { stone: 'rhodolite' } },
      { label: 'All Pendants' },
    ],
    metals: [
      { label: 'Gold', query: { metal: 'gold' } },
      { label: 'Yellow Gold', query: { metal: 'gold', color: 'yellow' } },
      { label: 'White Gold', query: { metal: 'gold', color: 'white' } },
      { label: 'Rose Gold', query: { metal: 'gold', color: 'rose' } },
    ],
  },
  bracelets: {
    typesHeading: 'Popular Bracelet Types',
    fallbackImage: '/bracelet-1.jpg',
    types: [
      { label: 'Cuffs & Kadas', query: { type: 'cuff' } },
      { label: 'Chain Bracelets', query: { type: 'chain-bracelet' } },
      { label: 'All Bracelets' },
    ],
    metals: [
      { label: 'Gold', query: { metal: 'gold' } },
      { label: 'Rose Gold', query: { metal: 'gold', color: 'rose' } },
    ],
  },
  necklaces: {
    typesHeading: 'Popular Necklace Styles',
    fallbackImage: '/necklace-1.jpg',
    types: [
      { label: 'Diamond', query: { stone: 'diamond' } },
      { label: 'Garnet', query: { stone: 'garnet' } },
      { label: 'Rhodolite', query: { stone: 'rhodolite' } },
      { label: 'All Necklaces' },
    ],
    metals: [
      { label: 'Gold', query: { metal: 'gold' } },
      { label: 'Yellow Gold', query: { metal: 'gold', color: 'yellow' } },
      { label: 'White Gold', query: { metal: 'gold', color: 'white' } },
      { label: 'Rose Gold', query: { metal: 'gold', color: 'rose' } },
    ],
  },
}
