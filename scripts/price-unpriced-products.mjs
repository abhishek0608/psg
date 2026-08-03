/**
 * Compute INR prices for catalog products that were uploaded without a price
 * (listPricePaise = 0).
 *
 * Pass 1: products with spec attributes (gross gold weight, diamond carats)
 * get a formula price = gold + diamonds + making charge. Rates are Indian
 * retail and easy to tweak; they match the rate card used by the
 * 20260801120000_price_catalog_in_inr migration.
 *
 * Pass 2: this is a B2C storefront — every product must show a price, so
 * anything left over (no usable spec attributes) is priced at the median of
 * already-priced products in the same category, falling back to the median
 * across the whole catalog if its category has no priced comps yet.
 *
 * Safe to re-run: it only targets products whose variant price is still 0.
 */
import { prisma } from '../server/api/db.js'

const GOLD_PER_GRAM = 8800 // ₹/g (≈ 18k)
const DIAMOND_PER_CT = 55000 // ₹/ct (small melee)
const MAKING_CHARGE = 15000 // ₹ flat (rings)
const round500 = (n) => Math.round(n / 500) * 500

function priceFromAttrs(attrs) {
  const g = Number(attrs?.grossWeight) || 0
  const ct = Number(attrs?.diamondCarats) || 0
  const gold = g * GOLD_PER_GRAM
  const diamonds = ct * DIAMOND_PER_CT
  const raw = gold + diamonds + MAKING_CHARGE
  return { gold, diamonds, making: MAKING_CHARGE, price: round500(raw) }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

async function priceProduct(b2c, productId, pricePaise) {
  await prisma.productVariant.updateMany({
    where: { productId, listPricePaise: 0 },
    data: { listPricePaise: pricePaise, currency: 'INR' },
  })
  await prisma.priceBookItem.upsert({
    where: { priceBookId_productId_minQty: { priceBookId: b2c.id, productId, minQty: 1 } },
    update: { pricePaise },
    create: { priceBookId: b2c.id, productId, pricePaise, minQty: 1 },
  })
}

async function run() {
  const products = await prisma.product.findMany({
    where: { variants: { some: { listPricePaise: 0 } } },
    select: { id: true, slug: true, category: true, productAttributes: true },
    orderBy: { slug: 'asc' },
  })

  const b2c =
    (await prisma.priceBook.findFirst({ where: { channel: 'B2C', name: 'B2C Default' } })) ||
    (await prisma.priceBook.create({ data: { name: 'B2C Default', channel: 'B2C', currency: 'INR', active: true } }))

  const rows = []
  const stillUnpriced = []
  for (const p of products) {
    const attrs = p.productAttributes
    const g = Number(attrs?.grossWeight) || 0
    if (!attrs || g <= 0) {
      stillUnpriced.push(p)
      continue
    }
    const calc = priceFromAttrs(attrs)
    await priceProduct(b2c, p.id, calc.price)
    rows.push({
      slug: p.slug,
      g,
      ct: Number(attrs.diamondCarats) || 0,
      gold: Math.round(calc.gold),
      diamonds: Math.round(calc.diamonds),
      making: calc.making,
      price: `₹${calc.price.toLocaleString('en-IN')}`,
      source: 'formula',
    })
  }

  // Pass 2: consumers on a B2C storefront always see a price, so anything the
  // formula couldn't touch gets priced from comparable products instead.
  if (stillUnpriced.length) {
    const pricedVariants = await prisma.productVariant.findMany({
      where: { listPricePaise: { gt: 0 }, active: true },
      select: { listPricePaise: true, product: { select: { category: true } } },
    })
    const byCategory = new Map()
    for (const v of pricedVariants) {
      const cat = v.product?.category || 'uncategorized'
      if (!byCategory.has(cat)) byCategory.set(cat, [])
      byCategory.get(cat).push(v.listPricePaise)
    }
    const globalPrices = pricedVariants.map((v) => v.listPricePaise)
    const globalMedian = globalPrices.length ? round500(median(globalPrices)) : null

    for (const p of stillUnpriced) {
      const catPrices = byCategory.get(p.category)
      const price = catPrices?.length ? round500(median(catPrices)) : globalMedian
      if (!price) {
        rows.push({ slug: p.slug, category: p.category, status: 'no priced comps in catalog — skipped' })
        continue
      }
      await priceProduct(b2c, p.id, price)
      rows.push({
        slug: p.slug,
        category: p.category,
        price: `₹${price.toLocaleString('en-IN')}`,
        source: catPrices?.length ? 'category median' : 'catalog median',
      })
    }
  }

  console.table(rows)
  console.log(`Rates: gold ₹${GOLD_PER_GRAM}/g, diamond ₹${DIAMOND_PER_CT}/ct, making ₹${MAKING_CHARGE}.`)
}

run()
  .catch((err) => {
    console.error('Pricing failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
