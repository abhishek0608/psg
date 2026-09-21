import type { HomepageSlide } from '../composables/useHomepageSlides'

// One slide per device.
//
// Desktop runs the campaign artwork as-is: the headline, the CTA and the slide
// counter are painted into the image, so nothing is overlaid on top of it and
// the whole banner is the link.
//
// The desktop artwork is approximately 2.7:1, which is too wide on a phone and crops to
// nothing useful, so mobile gets an `editorial` slide instead — same campaign
// copy, set live over the navy ground, with one product shot above it.
export const defaultHomepageSlides: HomepageSlide[] = [
  {
    id: 'fine-jewellery-edit-desktop',
    device: 'desktop',
    imageUrl: '/homepage/fine-jewellery-edit-tall-v4.webp',
    headline: 'The fine jewellery edit — moments made brighter',
    ctaHref: '/collections',
    sortOrder: 0,
  },
  {
    id: 'fine-jewellery-edit-mobile',
    layout: 'editorial',
    device: 'mobile',
    imageUrl: '/showcase/gifting-navy-box.webp',
    eyebrow: 'The fine jewellery edit',
    headline: 'Moments Made Brighter',
    subheadline: 'Hand-set gemstones, certified gold, and a price breakdown on every piece — wrapped and ready to give.',
    ctaLabel: 'Explore collection',
    ctaHref: '/collections',
    sortOrder: 0,
  },
  // Ganpati locket campaign. The desktop artwork is cropped to the same
  // 2.69:1 as the first slide so both share one frame height; the mobile
  // slide reuses the centre pendant shot as an editorial photograph.
  {
    id: 'ganpati-locket-desktop',
    device: 'desktop',
    imageUrl: '/homepage/ganpati-locket-banner.webp',
    headline: 'Ganpati locket jewellery — divine blessings in every piece',
    ctaHref: '/collections/pendants',
    sortOrder: 1,
  },
  {
    id: 'ganpati-locket-mobile',
    layout: 'editorial',
    device: 'mobile',
    imageUrl: '/homepage/ganpati-locket-mobile.webp',
    eyebrow: 'Ganpati locket jewellery',
    headline: 'Divine Blessings in Every Piece',
    subheadline: 'Hand-finished Ganesha lockets in certified gold and silver, set with gemstones for the festive season.',
    ctaLabel: 'Shop collection',
    ctaHref: '/collections/pendants',
    sortOrder: 1,
  },
]
