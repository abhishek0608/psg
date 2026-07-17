import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

// S3-backed product image source.
//
// Bucket layout (one folder per product). The folder name is the Product.slug,
// optionally followed by an "_<suffix>" that encodes a size/dimension:
//   <BASE_PREFIX>/<slug>[_<suffix>]/<SKU>_<n>.<ext>
// e.g. Kiana-product-images/ruby-ring/500067FYAAA12_1.webp
//      Kiana-product-images/pd0448_6/pd0448_1.webp      (slug "pd0448", size 6)
//      Kiana-product-images/pd0448_6*7/pd0448_1.webp    (slug "pd0448", size 6*7)
// Slugs never contain "_", so the first "_" cleanly separates slug from suffix.
//
// Images are served publicly (bucket policy grants anonymous s3:GetObject),
// so we only need credentials to LIST a folder, not to read the files.

const REGION = process.env.AWS_REGION || 'us-east-1'
const BUCKET = process.env.AWS_S3_BUCKET || ''
// Top-level prefix that contains the per-slug folders. Trailing slash optional.
const BASE_PREFIX = (process.env.AWS_S3_BASE_PREFIX || 'Kiana-product-images').replace(/\/+$/, '')

const IMAGE_EXTENSIONS = /\.(webp|jpe?g|png|avif|gif)$/i

let cachedClient = null

function getClient() {
  if (cachedClient) return cachedClient
  if (!BUCKET || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('S3 not configured: set AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY')
  }
  cachedClient = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })
  return cachedClient
}

export function isS3Configured() {
  return Boolean(BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
}

// Public URL for an object key. Keys may contain spaces or other chars, so
// encode each path segment individually (encodeURI keeps the slashes).
function publicUrlForKey(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURI(key)}`
}

// Parse "500067FYAAA12_3.webp" -> { sku: "500067FYAAA12", order: 3 }.
// Falls back gracefully when the convention isn't followed.
function parseImageFilename(filename) {
  const base = filename.replace(IMAGE_EXTENSIONS, '')
  const match = base.match(/^(.*?)[_-](\d+)$/)
  if (match) return { sku: match[1] || null, order: Number(match[2]) }
  return { sku: base || null, order: null }
}

// A folder belongs to `slug` when its name equals the slug (older uploads) or
// starts with "slug_" — the "_" separates the slug from a size/dimension
// suffix, e.g. slug "pd0448" -> folder "PD0448_8" or "PD0220_9X7". Matching is
// case-insensitive: DB slugs are lowercase but S3 folders are usually
// uppercased. The "_" guard stops sibling slug "pd0448" matching "pd04480".
export function folderMatchesSlug(folder, slug) {
  const f = String(folder).toLowerCase()
  const s = String(slug).toLowerCase()
  return f === s || f.startsWith(`${s}_`)
}

// Enumerate the actual (case-preserved) folder names under the base prefix that
// belong to `slug`. S3 prefixes are case-sensitive, so we can't narrow the
// listing by the lowercase slug; instead we list folder names (one per product
// via Delimiter, so this is cheap) and match them case-insensitively.
async function resolveProductFolders(client, slug) {
  const prefix = `${BASE_PREFIX}/`
  const folders = []
  let token
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        Delimiter: '/',
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    )
    for (const cp of res.CommonPrefixes || []) {
      const folder = cp.Prefix.slice(prefix.length).replace(/\/$/, '')
      if (folder && folderMatchesSlug(folder, slug)) folders.push(folder)
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (token)
  return folders
}

/**
 * List all images for a product, resolving the S3 folder by slug. The folder
 * may be uppercased and/or carry a size suffix (slug "pd0448" -> "PD0448_8").
 * @param {string} slug - product slug.
 * @returns {Promise<Array<{ url, key, sku, sortOrder, size }>>} ordered images.
 */
export async function listProductImagesBySlug(slug) {
  const clean = String(slug || '').trim()
  if (!clean) return []

  const client = getClient()
  const folders = await resolveProductFolders(client, clean)
  if (!folders.length) return []

  // Gather objects from every matching folder (normally just one), each listed
  // with its exact, case-correct prefix.
  const collected = []
  for (const folder of folders) {
    const prefix = `${BASE_PREFIX}/${folder}/`
    let token
    do {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: prefix,
          ContinuationToken: token,
          MaxKeys: 1000,
        }),
      )
      for (const obj of res.Contents || []) {
        const filename = obj.Key.slice(prefix.length)
        // Skip "folder marker" keys and non-image junk like .DS_Store.
        if (!filename || filename.endsWith('/') || !IMAGE_EXTENSIONS.test(filename)) continue
        const { sku, order } = parseImageFilename(filename)
        collected.push({ url: publicUrlForKey(obj.Key), key: obj.Key, sku, order, size: obj.Size })
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined
    } while (token)
  }

  // Sort by the numeric suffix when present, otherwise by filename.
  collected.sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order
    if (a.order != null) return -1
    if (b.order != null) return 1
    return a.key.localeCompare(b.key)
  })

  return collected.map((img, index) => ({
    url: img.url,
    key: img.key,
    sku: img.sku,
    sortOrder: index,
    size: img.size,
  }))
}

/**
 * Sweep the entire base prefix once and return a map of slug -> ordered image URLs.
 * Uses a handful of paginated ListObjectsV2 calls total (1000 keys each),
 * independent of how many product folders exist. Intended to be called from the
 * cached catalog build, not per-request.
 * @returns {Promise<Map<string, string[]>>}
 */
export async function listAllProductImagesBySlug() {
  const client = getClient()
  const prefix = `${BASE_PREFIX}/`

  // slug -> array of { url, order, key }
  const bySlug = new Map()
  let token
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    )
    for (const obj of res.Contents || []) {
      const rest = obj.Key.slice(prefix.length) // "<slug>/<file>"
      const slash = rest.indexOf('/')
      if (slash <= 0) continue // skip base-level files like .DS_Store
      const slug = rest.slice(0, slash)
      const filename = rest.slice(slash + 1)
      if (!filename || filename.endsWith('/') || !IMAGE_EXTENSIONS.test(filename)) continue
      const { order } = parseImageFilename(filename)
      if (!bySlug.has(slug)) bySlug.set(slug, [])
      bySlug.get(slug).push({ url: publicUrlForKey(obj.Key), order, key: obj.Key })
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (token)

  const out = new Map()
  for (const [slug, imgs] of bySlug) {
    imgs.sort((a, b) => {
      if (a.order != null && b.order != null) return a.order - b.order
      if (a.order != null) return -1
      if (b.order != null) return 1
      return a.key.localeCompare(b.key)
    })
    out.set(slug, imgs.map((i) => i.url))
  }
  return out
}

/**
 * List every product folder under the base prefix.
 * @returns {Promise<string[]>} slugs (folder names).
 */
export async function listProductFolders() {
  const client = getClient()
  const prefix = `${BASE_PREFIX}/`
  const folders = []
  let token
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        Delimiter: '/',
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    )
    for (const cp of res.CommonPrefixes || []) {
      const folder = cp.Prefix.slice(prefix.length).replace(/\/$/, '')
      if (folder) folders.push(folder)
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (token)
  return folders
}
