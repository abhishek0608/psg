import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL
const APPLY = process.argv.includes('--apply')

if (!SOURCE_DATABASE_URL) {
  console.error('Missing SOURCE_DATABASE_URL. Set it to the source Supabase direct Postgres URL.')
  process.exit(1)
}

if (!TARGET_DATABASE_URL) {
  console.error('Missing target database URL. Set TARGET_DATABASE_URL, DIRECT_URL, or DATABASE_URL.')
  process.exit(1)
}

const source = new PrismaClient({ datasources: { db: { url: SOURCE_DATABASE_URL } } })
const target = new PrismaClient({ datasources: { db: { url: TARGET_DATABASE_URL } } })

function logStep(label, count) {
  console.log(`${APPLY ? 'Importing' : 'Would import'} ${count} ${label}`)
}

async function upsertMany(rows, label, upsertRow) {
  logStep(label, rows.length)
  if (!APPLY) return

  let done = 0
  for (const row of rows) {
    await upsertRow(row)
    done += 1
    if (done % 50 === 0 || done === rows.length) {
      console.log(`  ${label}: ${done}/${rows.length}`)
    }
  }
}

async function main() {
  console.log(APPLY ? 'Running product migration...' : 'Dry run only. Re-run with --apply to write changes.')

  const [
    products,
    images,
    variants,
    inventories,
    priceBooks,
    priceBookItems,
    stoneSizes,
  ] = await Promise.all([
    source.product.findMany({ orderBy: { createdAt: 'asc' } }),
    source.productImage.findMany({ orderBy: [{ productId: 'asc' }, { sortOrder: 'asc' }] }),
    source.productVariant.findMany({ orderBy: { createdAt: 'asc' } }),
    source.inventory.findMany({ orderBy: { productId: 'asc' } }),
    source.priceBook.findMany({ orderBy: { createdAt: 'asc' } }),
    source.priceBookItem.findMany(),
    source.stoneSize.findMany({ orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }] }).catch(() => []),
  ])

  await upsertMany(products, 'products', (row) =>
    target.product.upsert({
      where: { slug: row.slug },
      create: {
        id: row.id,
        slug: row.slug,
        title: row.title,
        category: row.category,
        subtype: row.subtype,
        material: row.material,
        color: row.color,
        description: row.description,
        aiDescription: row.aiDescription,
        productAttributes: row.productAttributes,
        styleTags: row.styleTags,
        stoneTags: row.stoneTags,
        customizationOptions: row.customizationOptions,
        isNewArrival: row.isNewArrival,
        isBestSeller: row.isBestSeller,
        rating: row.rating,
        reviewCount: row.reviewCount,
        active: row.active,
        createdById: row.createdById,
        updatedById: row.updatedById,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      update: {
        title: row.title,
        category: row.category,
        subtype: row.subtype,
        material: row.material,
        color: row.color,
        description: row.description,
        aiDescription: row.aiDescription,
        productAttributes: row.productAttributes,
        styleTags: row.styleTags,
        stoneTags: row.stoneTags,
        customizationOptions: row.customizationOptions,
        isNewArrival: row.isNewArrival,
        isBestSeller: row.isBestSeller,
        rating: row.rating,
        reviewCount: row.reviewCount,
        active: row.active,
        createdById: row.createdById,
        updatedById: row.updatedById,
        updatedAt: row.updatedAt,
      },
    })
  )

  await upsertMany(priceBooks, 'price books', (row) =>
    target.priceBook.upsert({
      where: { id: row.id },
      create: row,
      update: {
        name: row.name,
        channel: row.channel,
        currency: row.currency,
        active: row.active,
        updatedAt: row.updatedAt,
      },
    })
  )

  await upsertMany(images, 'product images', (row) =>
    target.productImage.upsert({
      where: { id: row.id },
      create: row,
      update: {
        productId: row.productId,
        url: row.url,
        alt: row.alt,
        sortOrder: row.sortOrder,
        active: row.active,
        updatedAt: row.updatedAt,
      },
    })
  )

  await upsertMany(variants, 'product variants', (row) =>
    target.productVariant.upsert({
      where: { sku: row.sku },
      create: row,
      update: {
        productId: row.productId,
        title: row.title,
        attributes: row.attributes,
        listPricePaise: row.listPricePaise,
        currency: row.currency,
        active: row.active,
        updatedAt: row.updatedAt,
      },
    })
  )

  await upsertMany(inventories, 'inventory rows', (row) =>
    target.inventory.upsert({
      where: { productId_locationCode: { productId: row.productId, locationCode: row.locationCode } },
      create: row,
      update: {
        quantity: row.quantity,
        reserved: row.reserved,
        updatedAt: row.updatedAt,
      },
    })
  )

  await upsertMany(priceBookItems, 'price book items', (row) =>
    target.priceBookItem.upsert({
      where: {
        priceBookId_productId_minQty: {
          priceBookId: row.priceBookId,
          productId: row.productId,
          minQty: row.minQty,
        },
      },
      create: row,
      update: {
        pricePaise: row.pricePaise,
        validFrom: row.validFrom,
        validTo: row.validTo,
      },
    })
  )

  await upsertMany(stoneSizes, 'stone sizes', (row) =>
    target.stoneSize.upsert({
      where: { value: row.value },
      create: row,
      update: {
        label: row.label,
        sortOrder: row.sortOrder,
        active: row.active,
        lastSeenAt: row.lastSeenAt,
        updatedAt: row.updatedAt,
      },
    })
  )

  const targetCount = APPLY ? await target.product.count() : null
  console.log(APPLY ? `Done. Target now has ${targetCount} products.` : 'Dry run complete.')
  console.log('Note: vector embeddings are not migrated. Re-run embedding seed scripts after import if needed.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await source.$disconnect()
    await target.$disconnect()
  })
