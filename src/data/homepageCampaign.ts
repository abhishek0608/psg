import type { HomepageSlide } from '../composables/useHomepageSlides'

// One slide per device.
//
// Desktop runs the campaign artwork as-is: the headline, the CTA and the slide
// counter are painted into the image, so nothing is overlaid on top of it and
// the whole banner is the link.
//
// The artwork is 4.4:1, which is an unreadable sliver on a phone and crops to
// nothing useful, so mobile gets an `editorial` slide instead — same campaign
// copy, set live over the navy ground, with one product shot above it.
export const defaultHomepageSlides: HomepageSlide[] = [
  {
    id: 'fine-jewellery-edit-desktop',
    device: 'desktop',
    imageUrl: '/homepage/fine-jewellery-edit-banner.jpg',
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
]
