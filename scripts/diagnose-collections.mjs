/**
 * Explains why /collections shows no products.
 *
 * The storefront grid loads from /api/products-filter, which — unlike
 * /api/products — only returns products that have at least one ACTIVE VARIANT
 * (see the default `where` branch in api/products-filter.js). A product saved
 * without a price gets no variant row at all (api/internal.js), so it is
 * returned by /api/products yet silently excluded from /collections.
 *
 * This is read-only. Run it against the same database the deployment uses:
 *   node --env-file=.env scripts/diagnose-collections.mjs
 */
import { prisma } from '../server/api/db.js'

async function run() {
  if (!String(process.env.DATABASE_URL || '').trim()) {
    console.error('DATABASE_URL is not set — /api/products would return 500 here.')
    console.error('On Vercel, confirm DATABASE_URL is enabled for the Preview environment, not just Production.')
    process.exit(1)
  }

  const [total, active, withActiveVariant, withPricedVariant, withB2CPrice] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
    // Exactly the condition /api/products-filter requires.
    prisma.product.count({ where: { active: true, variants: { some: { active: true } } } }),
    prisma.product.count({
      where: { active: true, variants: { some: { active: true, listPricePaise: { gt: 0 } } } },
    }),
    prisma.product.count({
      where: {
        active: true,
        priceBookMap: { some: { minQty: { lte: 1 }, priceBook: { active: true, channel: 'B2C' } } },
      },
    }),
  ])

  const hidden = active - withActiveVariant

  console.log('\nCatalogue')
  console.table([
    { metric: 'products (all)', count: total },
    { metric: 'products active:true', count: active },
    { metric: '  ...with an active variant  → visible on /collections', count: withActiveVariant },
    { metric: '  ...with a priced variant (> $0)', count: withPricedVariant },
    { metric: '  ...with a B2C price-book entry', count: withB2CPrice },
    { metric: 'active products HIDDEN from /collections', count: hidden },
  ])

  if (total === 0) {
    console.log('\nVERDICT: the database has no products at all. This deployment is likely')
    console.log('pointed at an empty database — check DATABASE_URL for this environment.')
  } else if (active === 0) {
    console.log('\nVERDICT: products exist but none are active:true, so nothing can render.')
  } else if (withActiveVariant === 0) {
    console.log('\nVERDICT: no active product has an active variant, so /api/products-filter')
    console.log('returns [] and /collections renders empty — even though /api/products')
    console.log('returns all ' + active + ' of them. This is the variant gap.')
    console.log('\nFix: give these products a variant. Products already carrying a $0 variant')
    console.log('can be priced with scripts/price-unpriced-products.mjs; products with NO')
    console.log('variant row need one created (that script will not find them).')
  } else if (hidden > 0) {
    console.log(`\nVERDICT: ${withActiveVariant} product(s) should be showing on /collections.`)
    console.log(`${hidden} active product(s) are hidden for lack of an active variant.`)
    console.log('If the page is still empty, the catalogue is reaching the browser but')
    console.log('failing in the frontend — check the browser console.')
  } else {
    console.log(`\nVERDICT: all ${active} active product(s) qualify for /collections.`)
    console.log('The data is fine, so an empty page points at the request layer')
    console.log('(env vars, CORS, or a 500 from the function) rather than the catalogue.')
  }

  const samples = await prisma.product.findMany({
    where: { active: true, variants: { none: { active: true } } },
    select: { slug: true, title: true, category: true },
    take: 10,
    orderBy: { createdAt: 'desc' },
  })
  if (samples.length) {
    console.log('\nSample of hidden products:')
    console.table(samples)
  }
}

run()
  .catch((err) => {
    console.error('Diagnosis failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
