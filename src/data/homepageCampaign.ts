import type { HomepageSlide } from '../composables/useHomepageSlides'

// Original customer artwork is served by S3. CSS frames each panel on mobile,
// so all three slides reuse one cached image without altering the artwork.
const artworkUrl = 'https://psg-images-855663231212.s3.us-east-1.amazonaws.com/homepage/timeless-gold-v2.png'
export const defaultHomepageSlides: HomepageSlide[] = [
  { id: 'psg-campaign-desktop', imageUrl: artworkUrl, device: 'desktop', headline: 'Emerald necklace, diamond ring and bracelet, and gemstone earrings.', ctaHref: '/collections' },
  ...[
    { headline: 'Emerald and diamond necklace', imagePosition: 'left center' },
    { headline: 'Diamond ring and bracelet', imagePosition: 'center' },
    { headline: 'Colourful gemstone earrings', imagePosition: 'right center' },
  ].map((panel, index): HomepageSlide => ({
    id: `psg-campaign-mobile-${index}`, imageUrl: artworkUrl, device: 'mobile',
    ctaHref: '/collections', sortOrder: index, ...panel,
  })),
]
