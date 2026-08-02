/**
 * Compute INR prices for catalog products that were uploaded without a price
 * (listPricePaise = 0) but have spec attributes (gross gold weight, diamond
 * carats). Price = gold + diamonds + making charge.
 *
 * Rates are Indian retail and easy to tweak; they match the rate card used by
 * the 20260801120000_price_catalog_in_inr migration. Safe to re-run: it only
 * targets products whose variant price is still 0.
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

async function run() {
  const products = await prisma.product.findMany({
    where: { variants: { some: { listPricePaise: 0 } } },
    select: { id: true, slug: true, productAttributes: true },
    orderBy: { slug: 'asc' },
  })

  const b2c =
    (await prisma.priceBook.findFirst({ where: { channel: 'B2C', name: 'B2C Default' } })) ||
    (await prisma.priceBook.create({ data: { name: 'B2C Default', channel: 'B2C', currency: 'INR', active: true } }))

  const rows = []
  for (const p of products) {
    const attrs = p.productAttributes
    if (!attrs || !attrs.grossWeight) {
      rows.push({ slug: p.slug, status: 'no attrs — skipped' })
      continue
    }
    const calc = priceFromAttrs(attrs)
    await prisma.productVariant.updateMany({
      where: { productId: p.id, listPricePaise: 0 },
      data: { listPricePaise: calc.price, currency: 'INR' },
    })
    await prisma.priceBookItem.upsert({
      where: { priceBookId_productId_minQty: { priceBookId: b2c.id, productId: p.id, minQty: 1 } },
      update: { pricePaise: calc.price },
      create: { priceBookId: b2c.id, productId: p.id, pricePaise: calc.price, minQty: 1 },
    })
    rows.push({
      slug: p.slug,
      g: Number(attrs.grossWeight),
      ct: Number(attrs.diamondCarats) || 0,
      gold: Math.round(calc.gold),
      diamonds: Math.round(calc.diamonds),
      making: calc.making,
      price: `₹${calc.price.toLocaleString('en-IN')}`,
    })
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
