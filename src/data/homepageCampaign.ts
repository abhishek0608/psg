import type { HomepageSlide } from '../composables/useHomepageSlides'

// Clean campaign artwork has no embedded CTA buttons. CSS frames each panel
// on mobile, so all three slides reuse one cached image.
const artworkUrl = '/homepage/timeless-gold-clean.png'
const goldenArtworkUrl = '/homepage/golden-jewellery-clean.png'
export const defaultHomepageSlides: HomepageSlide[] = [
  { id: 'psg-campaign-desktop', imageUrl: artworkUrl, device: 'desktop', headline: 'Emerald necklace, diamond ring and bracelet, and gemstone earrings.', ctaHref: '/collections' },
  ...[
    { headline: 'Emerald and diamond necklace', imagePosition: 'left center' },
    { headline: 'Diamond ring and bracelet', imagePosition: 'center' },
    { headline: 'Colourful gemstone earrings', imagePosition: 'right center' },
  ].map((panel, index): HomepageSlide => ({
    id: `psg-campaign-mobile-${index}`, imageUrl: artworkUrl, device: 'mobile',
    ctaHref: '/collections', panelIndex: index, sortOrder: index, ...panel,
  })),
]

// Feature the new campaign before either the editor's slides or the default campaign.
export const additionalHomepageSlides: HomepageSlide[] = [
  { id: 'psg-golden-campaign-desktop', imageUrl: goldenArtworkUrl, device: 'desktop', headline: 'Layered gold necklaces, sculptural rings and bracelets, and diamond drop earrings.', imagePosition: 'center bottom', ctaHref: '/collections' },
  ...[
    { headline: 'Layered gold and diamond necklaces', imagePosition: 'left center' },
    { headline: 'Sculptural gold rings and diamond bracelets', imagePosition: 'center' },
    { headline: 'Gold and diamond drop earrings', imagePosition: 'right center' },
  ].map((panel, index): HomepageSlide => ({
    id: `psg-golden-campaign-mobile-${index}`, imageUrl: goldenArtworkUrl, device: 'mobile',
    ctaHref: '/collections', panelIndex: index, sortOrder: index, ...panel,
  })),
]
