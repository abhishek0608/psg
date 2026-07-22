export interface PriceBreakup {
  goldWeight: string
  goldValue: string
  stoneWeight: string
  stoneValue: string
  labour: string
  total: string
}

export interface ProductCustomizationOptions {
  diamondQualities?: string[]
  metalPurities?: string[]
  centerShapes?: string[]
  centerStoneSizes?: string[]
  allowCustomCenterStoneSize?: boolean
  stoneTypes?: string[]
  allowCustomStoneType?: boolean
  ringSizes?: string[]
  bangleSizes?: string[]
  necklaceSizes?: string[]
}

export interface ProductAttributes {
  grossWeight?: string
  diamondCarats?: string
  diamondQuantity?: string
}

export type Material = 'gold' | 'silver'
export type Color = 'yellow' | 'white' | 'rose' | 'oxidised'
export type ProductSubtype =
  | 'solitaire'
  | 'cluster'
  | 'multi-stone'
  | 'open-ring'
  | 'pendant'
  | 'statement-necklace'
  | 'cuff'
  | 'chain-bracelet'
  | 'drop'
  | 'stud'
  | 'mangal-sutra'
  | 'jhumka'

export const CATEGORIES = ['Rings', 'Earrings', 'Mangal Sutra', 'Necklaces', 'Bracelets'] as const
export type Category = (typeof CATEGORIES)[number]

export const COLORS: { id: Color; label: string; hex: string }[] = [
  { id: 'yellow', label: 'Yellow Gold', hex: '#D4AF37' },
  { id: 'white', label: 'White Gold', hex: '#E8E8E8' },
  { id: 'rose', label: 'Rose Gold', hex: '#B76E79' },
  { id: 'oxidised', label: 'Oxidised Silver', hex: '#808080' },
]

export const DIAMOND_QUALITY_OPTIONS = [
  'VVS-VS / GH',
  'VS / GH',
  'VS-SI / GH',
  'SI-I / GH',
  'I2-I3 / GH',
] as const

export const METAL_PURITY_OPTIONS = [
  '9k Gold',
  '10k Gold',
  '14k Gold',
  '18k Gold',
  '22k Gold',
  'Platinum',
  'Sterling Silver',
] as const

// Stone-type filter options. The `id` must match the backend stone tag values
// (see server/api/product-filter.js STONE_KEYWORDS).
export const STONE_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: 'diamond', label: 'Diamond' },
  { id: 'kundan', label: 'Kundan' },
  { id: 'polki', label: 'Polki' },
  { id: 'pearl', label: 'Pearl' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'ruby', label: 'Ruby' },
]

export const CENTER_SHAPE_OPTIONS = ['Cushion', 'Emerald', 'Heart', 'Marquise', 'Oval', 'Pear', 'Princess', 'Rectangle', 'Round', 'Trillion'] as const

// Stone size is a physical dimension (not carat). These are only fallback
// defaults — the live set of sizes in use comes from the stone-size registry
// (see useSiteConfig().stoneSizes).
export const CENTER_STONE_SIZE_OPTIONS = ['3 mm', '4 mm', '5 mm', '6 mm', '7 mm', '8 mm'] as const

// Stone type (the kind of center stone) for product customization. Fallback
// defaults for the picker; each product can offer its own subset via
// customizationOptions.stoneTypes. (Distinct from STONE_TYPE_OPTIONS above,
// which drives the catalog stone-tag filter.)
export const CENTER_STONE_TYPE_OPTIONS = ['Natural Diamond', 'Lab-Grown Diamond', 'Moissanite', 'Ruby', 'Sapphire', 'Emerald'] as const

export const RING_SIZE_OPTIONS = ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'] as const

export const BANGLE_SIZE_OPTIONS = ['2.2', '2.4', '2.6', '2.8', '2.10'] as const

export const NECKLACE_SIZE_OPTIONS = ['14"', '16"', '18"', '20"', '22"', '24"'] as const

export interface Product {
  id?: string
  slug: string
  title: string
  category: Category
  subtype?: ProductSubtype
  material: Material
  color: Color
  price: string
  priceValue: number
  description: string
  aiDescription?: string
  details: string[]
  styleTags?: string[]
  stoneTags?: string[]
  breakup: PriceBreakup
  images?: string[]
  isNewArrival?: boolean
  isBestSeller?: boolean
  rating?: number
  reviewCount?: number
  customizationOptions?: ProductCustomizationOptions
  productAttributes?: ProductAttributes
}

export interface Review {
  id: string
  author: string
  rating: number
  date: string
  text: string
}

const reviewsBySlug: Record<string, Review[]> = {
  'etoile-ring': [
    { id: '1', author: 'Priya M.', rating: 5, date: '2 weeks ago', text: 'Stunning ring! The craftsmanship is exceptional. Got so many compliments on my engagement.' },
    { id: '2', author: 'Rahul K.', rating: 5, date: '1 month ago', text: 'Perfect solitaire. BIS hallmarked and exactly as described. Delivery was secure and on time.' },
    { id: '3', author: 'Anita S.', rating: 4, date: '2 months ago', text: 'Beautiful piece. Slightly smaller than I expected but quality is top-notch. Very happy.' },
  ],
  'lune-pendant': [
    { id: '4', author: 'Neha R.', rating: 5, date: '3 weeks ago', text: 'Elegant and timeless. The chain is delicate but sturdy. Love it for everyday wear.' },
    { id: '5', author: 'Vikram D.', rating: 4, date: '1 month ago', text: 'Gifted to my wife. She adores it. Packaging was luxurious. Worth every rupee.' },
  ],
  'nuit-earrings': [
    { id: '6', author: 'Kavita P.', rating: 5, date: '1 week ago', text: 'Love the sculptural shape and the diamonds catch light beautifully. So light I forget I am wearing them.' },
    { id: '7', author: 'Sneha L.', rating: 5, date: '3 weeks ago', text: 'Minimal but striking — goes with western and ethnic. Backs are comfortable.' },
  ],
  'padma-mangalsutra': [
    { id: '14', author: 'Sunita P.', rating: 5, date: '1 week ago', text: 'Absolutely gorgeous! The lotus pendant is so intricately crafted. Got endless compliments at my wedding.' },
    { id: '15', author: 'Reema K.', rating: 5, date: '3 weeks ago', text: 'The enamel work is stunning and the gold quality is excellent. Perfect bridal piece.' },
  ],
  'knot-mangalsutra': [
    { id: '8', author: 'Divya N.', rating: 5, date: '2 weeks ago', text: 'Modern design, traditional meaning. Perfect for the contemporary bride. Highly recommend.' },
    { id: '9', author: 'Meera T.', rating: 4, date: '1 month ago', text: 'Lovely mangal sutra. Adjustable length is a plus. Gold quality is as promised.' },
  ],
  'soleil-bracelet': [
    { id: '10', author: 'Pooja G.', rating: 5, date: '3 weeks ago', text: 'Love my initials on the chain — delicate and modern. Clasp feels secure. Beautiful packaging.' },
  ],
  'luna-silver-ring': [
    { id: '11', author: 'Riya M.', rating: 4, date: '1 month ago', text: 'Minimal and elegant. Wearing it daily. Good for the price.' },
  ],
  'meera-silver-earrings': [
    { id: '12', author: 'Anjali V.', rating: 5, date: '2 weeks ago', text: 'Light jhumkas, perfect for office and occasions. Love the filigree.' },
  ],
  'sita-silver-necklace': [
    { id: '13', author: 'Kriti S.', rating: 4, date: '3 weeks ago', text: 'Simple and elegant. Goes with both ethnic and western wear. Happy with purchase.' },
  ],
  'verde-duet-bypass-ring': [
    { id: '16', author: 'Isha R.', rating: 5, date: '2 weeks ago', text: 'The emeralds are incredibly vivid and the bypass shape is so flattering on the hand. Pavé sparkles without feeling heavy.' },
    { id: '17', author: 'Arjun M.', rating: 5, date: '1 month ago', text: 'Gifted for our anniversary — she has not taken it off. Craftsmanship feels premium.' },
  ],
}

export function getProductReviews(slug: string): Review[] {
  return reviewsBySlug[slug] ?? []
}
