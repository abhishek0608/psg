<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import InternalWorkspaceTabs from '../components/InternalWorkspaceTabs.vue'
import { API_BASE } from '../config-api'
import { useAuth } from '../composables/useAuth'
import { invalidateProductsCache } from '../composables/useProductsApi'
import { BANGLE_SIZE_OPTIONS, CATEGORIES, CENTER_SHAPE_OPTIONS, COLORS, DIAMOND_QUALITY_OPTIONS, METAL_PURITY_OPTIONS, NECKLACE_SIZE_OPTIONS, RING_SIZE_OPTIONS } from '../data/products'

interface EditableImage {
  id?: string
  url: string
  alt: string
  sortOrder: number
  active: boolean
}

interface ProductForm {
  slug: string
  title: string
  category: string
  subtype: string
  material: string
  color: string
  description: string
  aiDescription: string
  grossWeight: string
  diamondCarats: string
  diamondQuantity: string
  diamondQuality: string
  metalPurity: string
  centerShape: string
  centerStoneSizes: string
  allowCustomCenterStoneSize: boolean
  stoneTypes: string
  allowCustomStoneType: boolean
  ringSize: string
  bangleSize: string
  necklaceSize: string
  variantPricePaise: string
  rating: string
  reviewCount: string
  isNewArrival: boolean
  isBestSeller: boolean
  active: boolean
  images: EditableImage[]
}

const route = useRoute()
const router = useRouter()
const { user, isInternalUser } = useAuth()

const loading = ref(false)
const saving = ref(false)
const generatingAiDescription = ref(false)
const error = ref('')
const saved = ref(false)
const lastSavedSlug = ref(String(route.params.slug || ''))
const isEditing = ref(false)
const slugManuallyEdited = ref(false)
const formSnapshot = ref<ProductForm | null>(null)
const imageUploadInput = ref<HTMLInputElement | null>(null)
const imageAddMenuOpen = ref(false)
const imageUploadProcessing = ref(false)
// Read-only images served from S3 for this product (folder name === slug).
const s3Images = ref<{ url: string; sku: string | null; sortOrder: number }[]>([])
const fieldSkeletonRows = Array.from({ length: 9 }, (_, index) => index)
const MAX_INLINE_IMAGE_LENGTH = 750_000
const MAX_UPLOAD_DIMENSION = 1200
const materialOptions = [
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
]
const subtypeOptions = [
  { value: 'solitaire', label: 'Solitaire' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'multi-stone', label: 'Multi-stone' },
  { value: 'open-ring', label: 'Open ring' },
  { value: 'pendant', label: 'Pendant' },
  { value: 'statement-necklace', label: 'Statement necklace' },
  { value: 'cuff', label: 'Cuff / kada' },
  { value: 'chain-bracelet', label: 'Chain bracelet' },
  { value: 'drop', label: 'Drop earrings' },
  { value: 'stud', label: 'Stud earrings' },
  { value: 'mangal-sutra', label: 'Mangal sutra' },
  { value: 'jhumka', label: 'Jhumka' },
]

const isNewProduct = computed(() => String(route.params.slug || '') === 'new')
const fieldsEditable = computed(() => isNewProduct.value || isEditing.value)
const isRingCategory = computed(() => form.value.category === 'Rings')
const isBraceletCategory = computed(() => form.value.category === 'Bracelets')
const isNecklaceCategory = computed(
  () => form.value.category === 'Necklaces' || form.value.category === 'Mangal Sutra',
)
const isBangleLikeProduct = computed(() => {
  if (!isBraceletCategory.value) return false
  const fingerprint = [form.value.title, form.value.subtype, form.value.description]
    .join(' ')
    .toLowerCase()
  return /\b(bangle|kada|cuff)\b/.test(fingerprint)
})
const supportsCenterStoneFields = computed(() => !isBangleLikeProduct.value)

function cloneForm(f: ProductForm): ProductForm {
  return JSON.parse(JSON.stringify(f)) as ProductForm
}

function startEdit() {
  isEditing.value = true
}

function cancelEdit() {
  if (formSnapshot.value) form.value = cloneForm(formSnapshot.value)
  isEditing.value = false
  slugManuallyEdited.value = false
  imageAddMenuOpen.value = false
  error.value = ''
}

function emptyProductForm(): ProductForm {
  return {
    slug: '',
    title: '',
    category: '',
    subtype: '',
    material: '',
    color: '',
    description: '',
    aiDescription: '',
    grossWeight: '',
    diamondCarats: '',
    diamondQuantity: '',
    diamondQuality: '',
    metalPurity: '',
    centerShape: '',
    centerStoneSizes: '',
    allowCustomCenterStoneSize: true,
    stoneTypes: '',
    allowCustomStoneType: true,
    ringSize: '',
    bangleSize: '',
    necklaceSize: '',
    variantPricePaise: '',
    rating: '',
    reviewCount: '',
    isNewArrival: false,
    isBestSeller: false,
    active: true,
    images: [],
  }
}

function applyNewProductRoute() {
  form.value = emptyProductForm()
  lastSavedSlug.value = ''
  slugManuallyEdited.value = false
  error.value = ''
  saved.value = false
}

const form = ref<ProductForm>({
  slug: '',
  title: '',
  category: '',
  subtype: '',
  material: '',
  color: '',
  description: '',
  aiDescription: '',
  grossWeight: '',
  diamondCarats: '',
  diamondQuantity: '',
  diamondQuality: '',
  metalPurity: '',
  centerShape: '',
  centerStoneSizes: '',
  allowCustomCenterStoneSize: true,
  stoneTypes: '',
  allowCustomStoneType: true,
  ringSize: '',
  bangleSize: '',
  necklaceSize: '',
  variantPricePaise: '',
  rating: '',
  reviewCount: '',
  isNewArrival: false,
  isBestSeller: false,
  active: true,
  images: [],
})

const previewImages = computed<EditableImage[]>(() => {
  const formImages = form.value.images
    .filter((image) => image.url.trim())
    .sort((a, b) => a.sortOrder - b.sortOrder)
  if (formImages.length) return formImages
  // No DB-stored images: fall back to the read-only S3 images (folder name === slug)
  // so the Preview panel mirrors what the storefront actually shows.
  return s3Images.value
    .filter((image) => image.url?.trim())
    .map((image) => ({
      url: image.url,
      alt: image.sku || form.value.title,
      sortOrder: image.sortOrder,
      active: true,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
})
// Active image in the Preview gallery; mirrors the storefront's gallery so the
// internal preview shows every image as a separate, clickable thumbnail.
const activePreviewImage = ref(0)
function setPreviewImage(index: number) {
  const lastIndex = previewImages.value.length - 1
  activePreviewImage.value = lastIndex < 0 ? 0 : Math.min(Math.max(index, 0), lastIndex)
}
watch(previewImages, (images) => {
  if (activePreviewImage.value > images.length - 1) activePreviewImage.value = 0
})

function findOptionLabel(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label || value
}

function displayValue(value: unknown, fallback = '—') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function displayBoolean(value: boolean) {
  return value ? 'Yes' : 'No'
}

const coreDisplayRows = computed(() => [
  { label: 'Title', value: displayValue(form.value.title) },
  { label: 'Slug', value: displayValue(form.value.slug) },
  { label: 'Category', value: displayValue(form.value.category) },
  { label: 'Subtype', value: displayValue(findOptionLabel(subtypeOptions, form.value.subtype)) },
  { label: 'Material', value: displayValue(findOptionLabel(materialOptions, form.value.material)) },
  { label: 'Color', value: displayValue(COLORS.find((color) => color.id === form.value.color)?.label || form.value.color) },
  { label: 'Price (USD)', value: displayValue(form.value.variantPricePaise) },
])

const attributeDisplayRows = computed(() => [
  { label: 'Gross weight', value: displayValue(form.value.grossWeight) },
  { label: 'Diamond carats', value: displayValue(form.value.diamondCarats) },
  { label: 'Diamond quantity', value: displayValue(form.value.diamondQuantity) },
])

const customizationDisplayRows = computed(() => {
  const rows = [
    { label: 'Diamond quality', value: displayValue(form.value.diamondQuality) },
    { label: 'Metal purity', value: displayValue(form.value.metalPurity) },
    ...(supportsCenterStoneFields.value
      ? [
          { label: 'Stone types', value: displayValue(form.value.stoneTypes) },
          { label: 'Allow custom stone type', value: displayBoolean(form.value.allowCustomStoneType) },
          { label: 'Center shape', value: displayValue(form.value.centerShape) },
          { label: 'Center stone sizes', value: displayValue(form.value.centerStoneSizes) },
          { label: 'Allow custom center stone size', value: displayBoolean(form.value.allowCustomCenterStoneSize) },
        ]
      : []),
    ...(isRingCategory.value ? [{ label: 'Ring size', value: displayValue(form.value.ringSize) }] : []),
    ...(isBangleLikeProduct.value ? [{ label: 'Bangle size', value: displayValue(form.value.bangleSize) }] : []),
    ...(isNecklaceCategory.value ? [{ label: 'Necklace size', value: displayValue(form.value.necklaceSize) }] : []),
  ]
  return rows
})

const statusDisplayRows = computed(() => [
  { label: 'Active', value: displayBoolean(form.value.active) },
  { label: 'New arrival', value: displayBoolean(form.value.isNewArrival) },
  { label: 'Best seller', value: displayBoolean(form.value.isBestSeller) },
])

function toSlug(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function handleSlugInput(event: Event) {
  slugManuallyEdited.value = true
  form.value.slug = toSlug((event.target as HTMLInputElement).value)
}

function mapIncomingProduct(product: any): ProductForm {
  return {
    slug: String(product?.slug || ''),
    title: String(product?.title || ''),
    category: String(product?.category || ''),
    subtype: String(product?.subtype || ''),
    material: String(product?.material || ''),
    color: String(product?.color || ''),
    description: String(product?.description || ''),
    aiDescription: String(product?.aiDescription || ''),
    grossWeight: String(product?.productAttributes?.grossWeight || ''),
    diamondCarats: String(product?.productAttributes?.diamondCarats || ''),
    diamondQuantity: String(product?.productAttributes?.diamondQuantity || ''),
    diamondQuality: Array.isArray(product?.customizationOptions?.diamondQualities) ? (product.customizationOptions.diamondQualities[0] || '') : '',
    metalPurity: Array.isArray(product?.customizationOptions?.metalPurities) ? (product.customizationOptions.metalPurities[0] || '') : '',
    centerShape: Array.isArray(product?.customizationOptions?.centerShapes) ? (product.customizationOptions.centerShapes[0] || '') : '',
    centerStoneSizes: Array.isArray(product?.customizationOptions?.centerStoneSizes) ? product.customizationOptions.centerStoneSizes.join(', ') : '',
    allowCustomCenterStoneSize: product?.customizationOptions?.allowCustomCenterStoneSize !== false,
    stoneTypes: Array.isArray(product?.customizationOptions?.stoneTypes) ? product.customizationOptions.stoneTypes.join(', ') : '',
    allowCustomStoneType: product?.customizationOptions?.allowCustomStoneType !== false,
    ringSize: Array.isArray(product?.customizationOptions?.ringSizes) ? (product.customizationOptions.ringSizes[0] || '') : '',
    bangleSize: Array.isArray(product?.customizationOptions?.bangleSizes) ? (product.customizationOptions.bangleSizes[0] || '') : '',
    necklaceSize: Array.isArray(product?.customizationOptions?.necklaceSizes) ? (product.customizationOptions.necklaceSizes[0] || '') : '',
    variantPricePaise:
      typeof product?.variantPricePaise === 'number' ? String(product.variantPricePaise) : '',
    rating: typeof product?.rating === 'number' ? String(product.rating) : '',
    reviewCount: typeof product?.reviewCount === 'number' ? String(product.reviewCount) : '',
    isNewArrival: Boolean(product?.isNewArrival),
    isBestSeller: Boolean(product?.isBestSeller),
    active: product?.active !== false,
    images: Array.isArray(product?.images)
      ? product.images.map((image: any, index: number) => ({
          id: image.id,
          url: String(image?.url || ''),
          alt: String(image?.alt || ''),
          sortOrder:
            Number.isFinite(Number(image?.sortOrder)) && Number(image?.sortOrder) >= 0
              ? Number(image.sortOrder)
              : index,
          active: image?.active !== false,
        }))
      : [],
  }
}

function splitCommaSeparated(input: string) {
  return String(input || '').split(',').map((v) => v.trim()).filter(Boolean)
}

function wrapSingle(value: string) {
  return value ? [value] : []
}

function buildCustomizationOptionsPayload() {
  return {
    diamondQualities: wrapSingle(form.value.diamondQuality),
    metalPurities: wrapSingle(form.value.metalPurity),
    centerShapes: supportsCenterStoneFields.value ? wrapSingle(form.value.centerShape) : [],
    centerStoneSizes: supportsCenterStoneFields.value ? splitCommaSeparated(form.value.centerStoneSizes) : [],
    allowCustomCenterStoneSize: form.value.allowCustomCenterStoneSize,
    stoneTypes: supportsCenterStoneFields.value ? splitCommaSeparated(form.value.stoneTypes) : [],
    allowCustomStoneType: form.value.allowCustomStoneType,
    ringSizes: isRingCategory.value ? wrapSingle(form.value.ringSize) : [],
    bangleSizes: isBangleLikeProduct.value ? wrapSingle(form.value.bangleSize) : [],
    necklaceSizes: isNecklaceCategory.value ? wrapSingle(form.value.necklaceSize) : [],
  }
}

function buildProductAttributesPayload() {
  return {
    grossWeight: normalizeInputValue(form.value.grossWeight),
    diamondCarats: normalizeInputValue(form.value.diamondCarats),
    diamondQuantity: normalizeInputValue(form.value.diamondQuantity),
  }
}

function normalizeInputValue(input: unknown) {
  return String(input ?? '').trim()
}

function addImage() {
  if (!fieldsEditable.value) return
  imageAddMenuOpen.value = false
  form.value.images.push({
    url: '',
    alt: '',
    sortOrder: form.value.images.length,
    active: true,
  })
}

function openImageUpload() {
  if (!fieldsEditable.value) return
  imageAddMenuOpen.value = false
  imageUploadInput.value?.click()
}

function openBulkImageUpload() {
  if (!fieldsEditable.value && !isNewProduct.value) {
    startEdit()
  }
  imageAddMenuOpen.value = false
  imageUploadInput.value?.click()
}

function openImageAddDialog() {
  if (!fieldsEditable.value && !isNewProduct.value) {
    startEdit()
  }
  imageAddMenuOpen.value = true
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to read image file.'))
    image.src = url
  })
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Unable to read image file.'))
    reader.readAsDataURL(file)
  })
}

async function compressImageFile(file: File) {
  const originalUrl = await fileToDataUrl(file)
  const image = await loadImage(originalUrl)
  const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return originalUrl
  context.drawImage(image, 0, 0, width, height)
  const compressed = canvas.toDataURL('image/webp', 0.82)
  return compressed.length < originalUrl.length ? compressed : originalUrl
}

async function onImageUploadChange(event: Event) {
  if (!fieldsEditable.value) return
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || []).filter((file) => file.type.startsWith('image/'))
  input.value = ''
  if (!files.length) return
  imageUploadProcessing.value = true
  error.value = ''
  try {
    const uploadedImages = await Promise.all(
      files.map(async (file, offset) => ({
        url: await compressImageFile(file),
        alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 120),
        sortOrder: form.value.images.length + offset,
        active: true,
      })),
    )
    const oversized = uploadedImages.find((image) => image.url.length > MAX_INLINE_IMAGE_LENGTH)
    if (oversized) {
      throw new Error('Uploaded image is too large. Please use a smaller image or add it as an image URL.')
    }
    form.value.images.push(...uploadedImages)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unable to upload image.'
  } finally {
    imageUploadProcessing.value = false
  }
}

function removeImage(index: number) {
  if (!fieldsEditable.value) return
  form.value.images.splice(index, 1)
  form.value.images = form.value.images.map((image, idx) => ({ ...image, sortOrder: idx }))
}

function moveImage(index: number, direction: -1 | 1) {
  if (!fieldsEditable.value) return
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= form.value.images.length) return
  const nextImages = [...form.value.images]
  const [item] = nextImages.splice(index, 1)
  if (!item) return
  nextImages.splice(nextIndex, 0, item)
  form.value.images = nextImages.map((image, idx) => ({ ...image, sortOrder: idx }))
}

async function loadProduct() {
  if (!isInternalUser.value || !user.value?.id) return
  if (isNewProduct.value) {
    applyNewProductRoute()
    s3Images.value = []
    formSnapshot.value = null
    isEditing.value = false
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  saved.value = false
  try {
    const slug = String(route.params.slug || '')
    const res = await fetch(
      `${API_BASE}/api/internal?resource=product&userId=${encodeURIComponent(user.value.id)}&slug=${encodeURIComponent(slug)}`,
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to load internal product.')
    form.value = mapIncomingProduct(data.product)
    s3Images.value = Array.isArray(data.product?.s3Images) ? data.product.s3Images : []
    lastSavedSlug.value = String(data.product?.slug || slug)
    slugManuallyEdited.value = false
    formSnapshot.value = cloneForm(form.value)
    isEditing.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unable to load internal product.'
  } finally {
    loading.value = false
  }
}

async function saveProduct() {
  if (!user.value?.id || saving.value) return
  if (!isNewProduct.value && !isEditing.value) return
  const oversizedImage = form.value.images.find((image) => image.url.length > MAX_INLINE_IMAGE_LENGTH)
  if (oversizedImage) {
    error.value = 'One uploaded image is too large to save. Please remove it or use an image URL.'
    return
  }
  saving.value = true
  error.value = ''
  saved.value = false

  const basePayload = {
    userId: user.value.id,
    title: form.value.title,
    category: form.value.category,
    subtype: form.value.subtype,
    material: form.value.material,
    color: form.value.color,
    description: form.value.description,
    productAttributes: buildProductAttributesPayload(),
    customizationOptions: buildCustomizationOptionsPayload(),
    variantPricePaise: normalizeInputValue(form.value.variantPricePaise),
    rating: normalizeInputValue(form.value.rating),
    reviewCount: normalizeInputValue(form.value.reviewCount),
    isNewArrival: form.value.isNewArrival,
    isBestSeller: form.value.isBestSeller,
    active: form.value.active,
    images: form.value.images.map((image, index) => ({
      ...image,
      sortOrder: index,
    })),
    slug: form.value.slug,
  }

  const payload = isNewProduct.value
    ? basePayload
    : { ...basePayload, currentSlug: lastSavedSlug.value }

  try {
    const res = await fetch(`${API_BASE}/api/internal?resource=product`, {
      method: isNewProduct.value ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to save product.')
    invalidateProductsCache()
    form.value = mapIncomingProduct(data.product)
    formSnapshot.value = cloneForm(form.value)
    saved.value = true
    lastSavedSlug.value = form.value.slug
    if (!isNewProduct.value) isEditing.value = false
    if (isNewProduct.value || String(route.params.slug || '') !== form.value.slug) {
      await router.replace(`/internal/products/${form.value.slug}`)
    }
    setTimeout(() => {
      saved.value = false
    }, 2000)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unable to save product.'
  } finally {
    saving.value = false
  }
}

async function generateAiDescription() {
  if (!user.value?.id || !form.value.slug || generatingAiDescription.value) return
  generatingAiDescription.value = true
  error.value = ''
  try {
    const res = await fetch(`${API_BASE}/api/internal?resource=product`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.value.id,
        currentSlug: lastSavedSlug.value || form.value.slug,
        action: 'generate-ai-description',
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to generate AI description.')
    invalidateProductsCache()
    form.value = mapIncomingProduct(data.product)
    formSnapshot.value = cloneForm(form.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unable to generate AI description.'
  } finally {
    generatingAiDescription.value = false
  }
}

onMounted(() => {
  if (!isInternalUser.value) {
    router.replace('/')
    return
  }
  void loadProduct()
})

watch(
  () => route.params.slug,
  (slug) => {
    if (!isInternalUser.value) return
    if (String(slug || '') === 'new') applyNewProductRoute()
    else void loadProduct()
  },
)

watch(
  () => form.value.title,
  (title) => {
    if (!isNewProduct.value || slugManuallyEdited.value) return
    form.value.slug = toSlug(title)
  },
)
</script>

<template>
  <section class="ect-min-h-screen ect-bg-[#f6efec] ect-pt-32 ect-pb-16">
    <div class="ect-max-w-7xl ect-mx-auto ect-px-5">
      <InternalWorkspaceTabs />

      <input
        ref="imageUploadInput"
        type="file"
        accept="image/*"
        multiple
        class="ect-hidden"
        @change="onImageUploadChange"
      />

      <header class="ect-flex ect-flex-col sm:ect-flex-row sm:ect-items-end sm:ect-justify-between ect-gap-4 ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5 ect-mb-6">
        <div>
          <div
            v-if="loading && !isNewProduct"
            class="ect-h-5 ect-w-28 ect-rounded ect-bg-rose-100 ect-animate-pulse ect-mb-4"
          ></div>
          <RouterLink
            v-else
            :to="{ path: '/internal', query: { tab: 'products' } }"
            class="ect-inline-flex ect-items-center ect-font-body ect-text-sm ect-font-semibold ect-text-rose-700 hover:ect-text-rose-800 hover:ect-underline ect-mb-4"
          >
            Back to products
          </RouterLink>
          <template v-if="loading && !isNewProduct">
            <div class="ect-h-3 ect-w-20 ect-rounded ect-bg-rose-100 ect-animate-pulse ect-mb-3"></div>
            <div class="ect-h-10 ect-w-[min(26rem,80vw)] ect-rounded ect-bg-rose-100 ect-animate-pulse"></div>
            <div class="ect-mt-2 ect-h-4 ect-w-[min(22rem,76vw)] ect-rounded ect-bg-rose-100 ect-animate-pulse"></div>
          </template>
          <template v-else>
            <p class="ect-font-body ect-text-[11px] ect-uppercase ect-tracking-[0.2em] ect-text-rose-600 ect-mb-2">
              {{ isNewProduct ? 'New product' : fieldsEditable ? 'Editing product' : 'Product' }}
            </p>
            <h1 class="ect-font-display ect-text-3xl sm:ect-text-4xl ect-font-light ect-text-charcoal">
              {{ isNewProduct ? 'Create product' : form.title || 'Product detail' }}
            </h1>
            <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mt-1">
              {{
                isNewProduct
                  ? 'Set slug, details, and price, then create.'
                  : fieldsEditable
                    ? 'Update fields, price, or gallery, then save.'
                    : 'Review details. Use Edit to change this product.'
              }}
            </p>
          </template>
        </div>
        <div class="ect-flex ect-shrink-0 ect-flex-wrap ect-items-center ect-justify-end ect-gap-2">
          <div
            v-if="loading && !isNewProduct"
            class="ect-h-10 ect-w-20 ect-rounded-full ect-bg-rose-100 ect-animate-pulse"
          ></div>
          <template v-if="!loading && !isNewProduct">
            <template v-if="!fieldsEditable">
              <button
                type="button"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/20 ect-bg-white ect-px-5 ect-py-2.5 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/80 hover:ect-border-rose-300 hover:ect-text-rose-700 ect-transition-colors disabled:ect-opacity-60 disabled:ect-cursor-wait"
                :disabled="generatingAiDescription || !form.images.length"
                @click="generateAiDescription"
              >
                {{ generatingAiDescription ? 'Running...' : 'Run Through AI' }}
              </button>
              <button
                type="button"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/20 ect-bg-white ect-px-5 ect-py-2.5 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal hover:ect-border-rose-300 hover:ect-text-rose-700 ect-transition-colors"
                @click="startEdit"
              >
                Edit
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/20 ect-bg-white ect-px-5 ect-py-2.5 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/80 hover:ect-bg-rose-50 ect-transition-colors"
                :disabled="saving"
                @click="cancelEdit"
              >
                Cancel
              </button>
              <button
                type="button"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-5 ect-py-2.5 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-rose-700 ect-transition-colors"
                :disabled="saving"
                @click="saveProduct"
              >
                {{ saving ? 'Saving...' : saved ? 'Saved' : 'Save changes' }}
              </button>
            </template>
          </template>
          <button
            v-if="!loading && isNewProduct"
            type="button"
            class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-5 ect-py-2.5 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-rose-700 ect-transition-colors"
            :disabled="saving"
            @click="saveProduct"
          >
            {{
              saving ? 'Creating...' : saved ? 'Created' : 'Create product'
            }}
          </button>
        </div>
      </header>

      <p v-if="error" class="ect-font-body ect-text-sm ect-text-red-600 ect-mb-4">{{ error }}</p>

      <div v-if="loading" class="ect-grid xl:ect-grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] ect-gap-5">
        <section class="ect-space-y-5">
          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <div class="ect-h-4 ect-w-24 ect-rounded ect-bg-rose-100 ect-animate-pulse ect-mb-5"></div>
            <div class="ect-grid md:ect-grid-cols-2 ect-gap-4">
              <div v-for="index in fieldSkeletonRows" :key="index">
                <div class="ect-h-3 ect-w-24 ect-rounded ect-bg-rose-100 ect-animate-pulse ect-mb-2"></div>
                <div class="ect-h-10 ect-rounded-lg ect-bg-rose-50 ect-animate-pulse"></div>
              </div>
            </div>
            <div class="ect-mt-4">
              <div class="ect-h-3 ect-w-24 ect-rounded ect-bg-rose-100 ect-animate-pulse ect-mb-2"></div>
              <div class="ect-h-32 ect-rounded-lg ect-bg-rose-50 ect-animate-pulse"></div>
            </div>
          </article>
          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <div class="ect-h-4 ect-w-32 ect-rounded ect-bg-rose-100 ect-animate-pulse ect-mb-5"></div>
            <div class="ect-space-y-4">
              <div v-for="index in 2" :key="index" class="ect-grid lg:ect-grid-cols-[120px_minmax(0,1fr)] ect-gap-4 ect-rounded-lg ect-border ect-border-rose-100 ect-p-4">
                <div class="ect-aspect-square ect-rounded-lg ect-bg-rose-50 ect-animate-pulse"></div>
                <div class="ect-space-y-3">
                  <div class="ect-h-10 ect-rounded-lg ect-bg-rose-50 ect-animate-pulse"></div>
                  <div class="ect-h-10 ect-rounded-lg ect-bg-rose-50 ect-animate-pulse"></div>
                  <div class="ect-h-8 ect-w-44 ect-rounded-full ect-bg-rose-100 ect-animate-pulse"></div>
                </div>
              </div>
            </div>
          </article>
        </section>
        <aside class="ect-space-y-5">
          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <div class="ect-h-4 ect-w-20 ect-rounded ect-bg-rose-100 ect-animate-pulse ect-mb-4"></div>
            <div class="ect-aspect-square ect-rounded-lg ect-bg-rose-50 ect-animate-pulse"></div>
            <div class="ect-mt-4 ect-space-y-3">
              <div class="ect-h-7 ect-w-48 ect-rounded ect-bg-rose-100 ect-animate-pulse"></div>
              <div class="ect-h-4 ect-w-36 ect-rounded ect-bg-rose-100 ect-animate-pulse"></div>
              <div class="ect-h-16 ect-rounded ect-bg-rose-50 ect-animate-pulse"></div>
            </div>
          </article>
          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <div class="ect-h-4 ect-w-24 ect-rounded ect-bg-rose-100 ect-animate-pulse ect-mb-4"></div>
            <div class="ect-space-y-3">
              <div class="ect-h-10 ect-rounded-full ect-bg-rose-50 ect-animate-pulse"></div>
              <div class="ect-h-10 ect-rounded-full ect-bg-rose-50 ect-animate-pulse"></div>
            </div>
          </article>
        </aside>
      </div>

      <div v-if="!loading && fieldsEditable" class="ect-grid xl:ect-grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] ect-gap-5">
        <section class="ect-space-y-5">
          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal ect-mb-4">Core fields</h2>
            <div class="ect-grid md:ect-grid-cols-2 ect-gap-4">
              <label class="ect-block">
                <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Title</span>
                <input
                  v-model="form.title"
                  type="text"
                  :readonly="!fieldsEditable"
                  :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                />
              </label>
              <label class="ect-block">
                <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Slug</span>
                <input
                  v-model="form.slug"
                  type="text"
                  :readonly="!fieldsEditable"
                  placeholder="auto-generated-from-title"
                  @input="handleSlugInput"
                  :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                />
                <span v-if="isNewProduct && !slugManuallyEdited" class="ect-mt-1 ect-block ect-font-body ect-text-[11px] ect-text-charcoal/40">Auto-generated from title.</span>
              </label>
              <label class="ect-block">
                <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Category</span>
                <select
                  v-model="form.category"
                  :disabled="!fieldsEditable"
                  :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                >
                  <option value="" disabled>Select category</option>
                  <option v-for="category in CATEGORIES" :key="category" :value="category">{{ category }}</option>
                </select>
              </label>
              <label class="ect-block">
                <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Subtype</span>
                <select
                  v-model="form.subtype"
                  :disabled="!fieldsEditable"
                  :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                >
                  <option value="">Unspecified</option>
                  <option v-for="subtype in subtypeOptions" :key="subtype.value" :value="subtype.value">{{ subtype.label }}</option>
                </select>
              </label>
              <label class="ect-block">
                <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Material</span>
                <select
                  v-model="form.material"
                  :disabled="!fieldsEditable"
                  :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                >
                  <option value="" disabled>Select material</option>
                  <option v-for="material in materialOptions" :key="material.value" :value="material.value">{{ material.label }}</option>
                </select>
              </label>
              <label class="ect-block">
                <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Color</span>
                <select
                  v-model="form.color"
                  :disabled="!fieldsEditable"
                  :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                >
                  <option value="" disabled>Select color</option>
                  <option v-for="color in COLORS" :key="color.id" :value="color.id">{{ color.label }}</option>
                </select>
              </label>
              <label class="ect-block">
                <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Price (USD)</span>
                <input
                  v-model="form.variantPricePaise"
                  type="number"
                  min="0"
                  :readonly="!fieldsEditable"
                  :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                />
              </label>
            </div>

            <section class="ect-mt-5 ect-rounded-lg ect-border ect-border-rose-100 ect-bg-white ect-p-4">
              <div class="ect-mb-4">
                <h3 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Product attributes</h3>
                <p class="ect-font-body ect-text-xs ect-text-charcoal/50 ect-mt-1">Use these actual product values for the details section and stronger product search.</p>
              </div>

              <div class="ect-grid md:ect-grid-cols-2 ect-gap-4">
                <label class="ect-block">
                  <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Gross weight</span>
                  <input
                    v-model="form.grossWeight"
                    type="text"
                    placeholder="4.55 gms"
                    :readonly="!fieldsEditable"
                    :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                  />
                </label>
                <label class="ect-block">
                  <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Diamond carats</span>
                  <input
                    v-model="form.diamondCarats"
                    type="text"
                    placeholder="0.725 cts"
                    :readonly="!fieldsEditable"
                    :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                  />
                </label>
                <label class="ect-block">
                  <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Diamond quantity</span>
                  <input
                    v-model="form.diamondQuantity"
                    type="text"
                    placeholder="86"
                    :readonly="!fieldsEditable"
                    :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                  />
                </label>
              </div>
            </section>

            <label class="ect-block ect-mt-4">
              <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Description</span>
              <textarea
                v-model="form.description"
                rows="5"
                :readonly="!fieldsEditable"
                :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
              />
            </label>

            <section class="ect-mt-5 ect-rounded-lg ect-border ect-border-rose-100 ect-bg-rose-50/30 ect-p-4">
              <div class="ect-mb-4">
                <h3 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Customization options</h3>
                <p class="ect-font-body ect-text-xs ect-text-charcoal/50 ect-mt-1">These fields power the customer-facing customizable details section and the options shown in the customize card.</p>
              </div>

              <div class="ect-grid md:ect-grid-cols-2 ect-gap-4">
                <label class="ect-block">
                  <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Diamond quality</span>
                  <select
                    v-model="form.diamondQuality"
                    :disabled="!fieldsEditable"
                    :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : 'ect-bg-white']"
                  >
                    <option value="">None</option>
                    <option v-for="quality in DIAMOND_QUALITY_OPTIONS" :key="quality" :value="quality">{{ quality }}</option>
                  </select>
                </label>
                <label class="ect-block">
                  <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Metal purity</span>
                  <select
                    v-model="form.metalPurity"
                    :disabled="!fieldsEditable"
                    :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : 'ect-bg-white']"
                  >
                    <option value="">None</option>
                    <option v-for="purity in METAL_PURITY_OPTIONS" :key="purity" :value="purity">{{ purity }}</option>
                  </select>
                </label>
                <label v-if="supportsCenterStoneFields" class="ect-block">
                  <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Stone types</span>
                  <input
                    v-model="form.stoneTypes"
                    type="text"
                    placeholder="Natural Diamond, Moissanite, Ruby"
                    :readonly="!fieldsEditable"
                    :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                  />
                  <span class="ect-mt-1 ect-block ect-font-body ect-text-[11px] ect-text-charcoal/40">Comma-separated stone types, e.g. Natural Diamond, Moissanite, Ruby</span>
                </label>
                <label v-if="supportsCenterStoneFields" class="ect-block">
                  <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Center shape</span>
                  <select
                    v-model="form.centerShape"
                    :disabled="!fieldsEditable"
                    :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : 'ect-bg-white']"
                  >
                    <option value="">None</option>
                    <option v-for="shape in CENTER_SHAPE_OPTIONS" :key="shape" :value="shape">{{ shape }}</option>
                  </select>
                </label>
                <label v-if="supportsCenterStoneFields" class="ect-block">
                  <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Center stone sizes</span>
                  <input
                    v-model="form.centerStoneSizes"
                    type="text"
                    placeholder="6 mm, 7 mm, 8 mm"
                    :readonly="!fieldsEditable"
                    :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                  />
                  <span class="ect-mt-1 ect-block ect-font-body ect-text-[11px] ect-text-charcoal/40">Comma-separated dimensions, e.g. 6 mm, 7 mm, 8 mm</span>
                </label>
                <label v-if="isRingCategory" class="ect-block">
                  <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Ring size</span>
                  <select
                    v-model="form.ringSize"
                    :disabled="!fieldsEditable"
                    :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : 'ect-bg-white']"
                  >
                    <option value="">None</option>
                    <option v-for="size in RING_SIZE_OPTIONS" :key="size" :value="size">{{ size }}</option>
                  </select>
                </label>
                <label v-if="isBangleLikeProduct" class="ect-block">
                  <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Bangle size</span>
                  <select
                    v-model="form.bangleSize"
                    :disabled="!fieldsEditable"
                    :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : 'ect-bg-white']"
                  >
                    <option value="">None</option>
                    <option v-for="size in BANGLE_SIZE_OPTIONS" :key="size" :value="size">{{ size }}</option>
                  </select>
                </label>
                <label v-if="isNecklaceCategory" class="ect-block md:ect-col-span-2">
                  <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Necklace size</span>
                  <select
                    v-model="form.necklaceSize"
                    :disabled="!fieldsEditable"
                    :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : 'ect-bg-white']"
                  >
                    <option value="">None</option>
                    <option v-for="size in NECKLACE_SIZE_OPTIONS" :key="size" :value="size">{{ size }}</option>
                  </select>
                </label>
              </div>

              <label v-if="supportsCenterStoneFields" class="ect-mt-4 ect-inline-flex ect-items-center ect-gap-2 ect-rounded-lg ect-border ect-border-charcoal/10 ect-bg-white ect-px-3 ect-py-2.5" :class="{ 'ect-opacity-80': !fieldsEditable }">
                <input v-model="form.allowCustomCenterStoneSize" type="checkbox" class="ect-h-4 ect-w-4" :disabled="!fieldsEditable" />
                <span class="ect-font-body ect-text-sm ect-text-charcoal">Allow manual center stone size entry</span>
              </label>

              <label v-if="supportsCenterStoneFields" class="ect-mt-4 ect-ml-0 sm:ect-ml-3 ect-inline-flex ect-items-center ect-gap-2 ect-rounded-lg ect-border ect-border-charcoal/10 ect-bg-white ect-px-3 ect-py-2.5" :class="{ 'ect-opacity-80': !fieldsEditable }">
                <input v-model="form.allowCustomStoneType" type="checkbox" class="ect-h-4 ect-w-4" :disabled="!fieldsEditable" />
                <span class="ect-font-body ect-text-sm ect-text-charcoal">Allow manual stone type entry</span>
              </label>
            </section>

            <div class="ect-grid sm:ect-grid-cols-3 ect-gap-3 ect-mt-4">
              <label class="ect-flex ect-items-center ect-gap-2 ect-rounded-lg ect-border ect-border-charcoal/10 ect-bg-rose-50/50 ect-px-3 ect-py-2.5" :class="{ 'ect-opacity-80': !fieldsEditable }">
                <input v-model="form.active" type="checkbox" class="ect-h-4 ect-w-4" :disabled="!fieldsEditable" />
                <span class="ect-font-body ect-text-sm ect-text-charcoal">Active</span>
              </label>
              <label class="ect-flex ect-items-center ect-gap-2 ect-rounded-lg ect-border ect-border-charcoal/10 ect-bg-rose-50/50 ect-px-3 ect-py-2.5" :class="{ 'ect-opacity-80': !fieldsEditable }">
                <input v-model="form.isNewArrival" type="checkbox" class="ect-h-4 ect-w-4" :disabled="!fieldsEditable" />
                <span class="ect-font-body ect-text-sm ect-text-charcoal">New arrival</span>
              </label>
              <label class="ect-flex ect-items-center ect-gap-2 ect-rounded-lg ect-border ect-border-charcoal/10 ect-bg-rose-50/50 ect-px-3 ect-py-2.5" :class="{ 'ect-opacity-80': !fieldsEditable }">
                <input v-model="form.isBestSeller" type="checkbox" class="ect-h-4 ect-w-4" :disabled="!fieldsEditable" />
                <span class="ect-font-body ect-text-sm ect-text-charcoal">Best seller</span>
              </label>
            </div>
          </article>

          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <div class="ect-mb-4">
              <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">AI description</h2>
              <p class="ect-font-body ect-text-xs ect-text-charcoal/50 ect-mt-1">Generated from product images and stored separately from the manual description.</p>
            </div>
            <textarea
              :value="form.aiDescription || 'AI description will be generated from product images.'"
              rows="5"
              readonly
              class="ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-bg-charcoal/[0.04] ect-px-3 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal/85 focus:ect-outline-none"
            />
            <p class="ect-mt-2 ect-font-body ect-text-[11px] ect-text-charcoal/40">Manual description stays separate. Regenerate anytime from the header action.</p>
          </article>

          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <div class="ect-flex ect-items-center ect-justify-between ect-gap-3 ect-mb-4">
              <div>
                <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Gallery images</h2>
                <p class="ect-font-body ect-text-xs ect-text-charcoal/45 ect-mt-1">Add, bulk upload, reorder, retire, or replace image URLs for the internal product record.</p>
              </div>
              <div class="ect-flex ect-shrink-0 ect-flex-wrap ect-items-center ect-justify-end ect-gap-2">
                <button
                  type="button"
                  class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-px-4 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/75 hover:ect-border-rose-300 hover:ect-text-rose-700 ect-transition-colors disabled:ect-cursor-wait disabled:ect-opacity-60"
                  :disabled="imageUploadProcessing"
                  @click="openBulkImageUpload"
                >
                  {{ imageUploadProcessing ? 'Uploading...' : 'Bulk upload' }}
                </button>
                <button
                  type="button"
                  class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-white hover:ect-bg-rose-700 ect-transition-colors"
                  :aria-expanded="imageAddMenuOpen"
                  @click="openImageAddDialog"
                >
                  New image
                </button>
              </div>
            </div>

            <Teleport to="body">
              <Transition
                enter-active-class="ect-transition ect-duration-150 ect-ease-out"
                enter-from-class="ect-opacity-0"
                enter-to-class="ect-opacity-100"
                leave-active-class="ect-transition ect-duration-100 ect-ease-in"
                leave-from-class="ect-opacity-100"
                leave-to-class="ect-opacity-0"
              >
                <div
                  v-if="imageAddMenuOpen"
                  class="ect-fixed ect-inset-0 ect-z-[80] ect-flex ect-items-center ect-justify-center ect-bg-charcoal/35 ect-p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="new-image-title"
                  @click.self="imageAddMenuOpen = false"
                >
                  <section class="ect-w-full ect-max-w-sm ect-rounded-lg ect-bg-white ect-p-5 ect-shadow-2xl">
                    <div class="ect-flex ect-items-start ect-justify-between ect-gap-3">
                      <div>
                        <h3 id="new-image-title" class="ect-font-body ect-text-base ect-font-semibold ect-text-charcoal">New image</h3>
                        <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mt-1">Choose one file, upload many files together, or paste an image URL.</p>
                      </div>
                      <button
                        type="button"
                        class="ect-rounded-full ect-px-2 ect-py-1 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/45 hover:ect-bg-rose-50 hover:ect-text-charcoal"
                        aria-label="Close new image popup"
                        @click="imageAddMenuOpen = false"
                      >
                        Close
                      </button>
                    </div>
                    <div class="ect-mt-5 ect-grid ect-gap-3">
                      <button
                        type="button"
                        class="ect-rounded-lg ect-border ect-border-rose-200 ect-bg-rose-50 ect-px-4 ect-py-3 ect-text-left hover:ect-bg-rose-100 ect-transition-colors"
                        @click="openImageUpload"
                      >
                        <span class="ect-block ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Upload images</span>
                        <span class="ect-block ect-font-body ect-text-xs ect-text-charcoal/55 ect-mt-1">Select one or many images from your device.</span>
                      </button>
                      <button
                        type="button"
                        class="ect-rounded-lg ect-border ect-border-charcoal/10 ect-bg-white ect-px-4 ect-py-3 ect-text-left hover:ect-bg-rose-50 ect-transition-colors"
                        @click="addImage"
                      >
                        <span class="ect-block ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Use URL</span>
                        <span class="ect-block ect-font-body ect-text-xs ect-text-charcoal/55 ect-mt-1">Add an empty image row and paste the image URL.</span>
                      </button>
                    </div>
                  </section>
                </div>
              </Transition>
            </Teleport>

            <div v-if="form.images.length" class="ect-space-y-4">
              <article v-for="(image, index) in form.images" :key="image.id || `new-${index}`" class="ect-rounded-lg ect-border ect-border-rose-100 ect-p-4">
                <div class="ect-grid lg:ect-grid-cols-[120px_minmax(0,1fr)] ect-gap-4">
                  <div class="ect-relative ect-aspect-square ect-rounded-lg ect-overflow-hidden ect-bg-charcoal/5">
                    <img v-if="image.url" :src="image.url" :alt="image.alt || form.title" class="ect-h-full ect-w-full ect-object-cover" />
                    <div v-else class="ect-flex ect-h-full ect-items-center ect-justify-center ect-font-body ect-text-xs ect-text-charcoal/35">Preview</div>
                    <span class="ect-absolute ect-top-1.5 ect-left-1.5 ect-rounded-full ect-bg-charcoal/80 ect-px-2 ect-py-0.5 ect-font-body ect-text-[10px] ect-font-semibold ect-text-white">Supabase</span>
                  </div>
                  <div class="ect-space-y-3">
                    <label class="ect-block">
                      <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Image URL</span>
                      <input
                        v-model="image.url"
                        type="text"
                        :readonly="!fieldsEditable"
                        :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                      />
                    </label>
                    <label class="ect-block">
                      <span class="ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-2">Alt text</span>
                      <input
                        v-model="image.alt"
                        type="text"
                        :readonly="!fieldsEditable"
                        :class="['ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-3 ect-py-2.5 ect-font-body ect-text-sm focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-rose-300/40', !fieldsEditable ? 'ect-bg-charcoal/[0.04] ect-text-charcoal/90' : '']"
                      />
                    </label>
                    <div class="ect-flex ect-flex-wrap ect-items-center ect-gap-2">
                      <label class="ect-flex ect-items-center ect-gap-2 ect-rounded-lg ect-border ect-border-charcoal/10 ect-bg-rose-50/50 ect-px-3 ect-py-2" :class="{ 'ect-opacity-80': !fieldsEditable }">
                        <input v-model="image.active" type="checkbox" class="ect-h-4 ect-w-4" :disabled="!fieldsEditable" />
                        <span class="ect-font-body ect-text-sm ect-text-charcoal">Active</span>
                      </label>
                      <template v-if="fieldsEditable">
                        <button type="button" class="ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 hover:ect-border-rose-300 hover:ect-text-rose-700 ect-transition-colors" :disabled="index === 0" @click="moveImage(index, -1)">Move up</button>
                        <button type="button" class="ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 hover:ect-border-rose-300 hover:ect-text-rose-700 ect-transition-colors" :disabled="index === form.images.length - 1" @click="moveImage(index, 1)">Move down</button>
                        <button type="button" class="ect-rounded-full ect-border ect-border-red-200 ect-bg-red-50 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-red-700 hover:ect-bg-red-100 ect-transition-colors" @click="removeImage(index)">Remove</button>
                      </template>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <p v-else class="ect-rounded-lg ect-border ect-border-dashed ect-border-charcoal/15 ect-p-6 ect-text-center ect-font-body ect-text-sm ect-text-charcoal/45">
              No images yet. Add one to start building the gallery.
            </p>

            <!-- Read-only images served from S3 (folder name === slug) -->
            <div v-if="s3Images.length" class="ect-mt-6 ect-border-t ect-border-rose-100 ect-pt-5">
              <div class="ect-flex ect-items-center ect-gap-2 ect-mb-3">
                <span class="ect-rounded-full ect-bg-indigo-100 ect-px-2.5 ect-py-1 ect-font-body ect-text-xs ect-font-semibold ect-text-indigo-700">S3</span>
                <h3 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">From S3 ({{ s3Images.length }})</h3>
                <span class="ect-font-body ect-text-xs ect-text-charcoal/45">Managed in S3 · read-only · auto-shown on the storefront</span>
              </div>
              <div class="ect-grid ect-grid-cols-2 sm:ect-grid-cols-3 lg:ect-grid-cols-4 ect-gap-3">
                <figure v-for="(img, i) in s3Images" :key="img.url || i" class="ect-rounded-lg ect-border ect-border-rose-100 ect-overflow-hidden">
                  <div class="ect-relative ect-aspect-square ect-bg-charcoal/5">
                    <img :src="img.url" :alt="img.sku || form.title" loading="lazy" class="ect-h-full ect-w-full ect-object-cover" />
                    <span class="ect-absolute ect-top-1.5 ect-left-1.5 ect-rounded-full ect-bg-indigo-600/90 ect-px-2 ect-py-0.5 ect-font-body ect-text-[10px] ect-font-semibold ect-text-white">S3</span>
                  </div>
                  <figcaption v-if="img.sku" class="ect-px-2 ect-py-1.5 ect-font-body ect-text-[11px] ect-text-charcoal/55 ect-truncate">{{ img.sku }}</figcaption>
                </figure>
              </div>
            </div>
          </article>
        </section>

        <aside class="ect-space-y-5">
          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal ect-mb-4">Preview</h2>
            <div v-if="previewImages.length" class="ect-space-y-3">
              <figure class="ect-relative ect-aspect-square ect-rounded-lg ect-overflow-hidden ect-bg-charcoal/5">
                <img :src="previewImages[activePreviewImage]?.url" :alt="previewImages[activePreviewImage]?.alt || form.title" class="ect-h-full ect-w-full ect-object-cover" />
                <span v-if="previewImages.length > 1" class="ect-absolute ect-top-2 ect-left-2 ect-inline-flex ect-items-center ect-rounded-full ect-bg-white/88 ect-px-2.5 ect-py-1 ect-font-body ect-text-[11px] ect-font-semibold ect-text-charcoal ect-shadow-sm">
                  {{ activePreviewImage + 1 }} / {{ previewImages.length }}
                </span>
              </figure>
              <ul v-if="previewImages.length > 1" class="ect-flex ect-gap-2 ect-list-none ect-m-0 ect-p-0 ect-overflow-x-auto">
                <li v-for="(image, idx) in previewImages" :key="`${image.url}-${image.sortOrder}`" class="ect-shrink-0">
                  <button type="button" @click="setPreviewImage(idx)" :aria-current="activePreviewImage === idx ? 'true' : undefined"
                    class="ect-h-16 ect-w-16 ect-rounded-lg ect-overflow-hidden ect-border-2 ect-transition focus:ect-outline-none focus-visible:ect-ring-2 focus-visible:ect-ring-rose-300"
                    :class="activePreviewImage === idx ? 'ect-border-rose-400 ect-shadow-sm' : 'ect-border-charcoal/10 ect-opacity-75 hover:ect-opacity-100'">
                    <img :src="image.url" :alt="image.alt || form.title" loading="lazy" class="ect-h-full ect-w-full ect-object-cover" />
                  </button>
                </li>
              </ul>
            </div>
            <div v-else class="ect-flex ect-aspect-square ect-items-center ect-justify-center ect-rounded-lg ect-bg-charcoal/5 ect-font-body ect-text-sm ect-text-charcoal/35">
              Image preview
            </div>
            <div class="ect-mt-4">
              <p class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal">{{ form.title || 'Untitled product' }}</p>
              <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mt-1">{{ form.category || 'Category' }} · {{ form.material || 'Material' }}</p>
              <p class="ect-font-body ect-text-sm ect-text-charcoal/70 ect-mt-3">{{ form.description || 'Description preview will appear here.' }}</p>
            </div>
          </article>

          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal ect-mb-4">Quick links</h2>
            <div class="ect-flex ect-flex-col ect-gap-3">
              <RouterLink
                v-if="form.slug"
                :to="`/product/${form.slug}`"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-border-rose-300 hover:ect-text-rose-700 ect-transition-colors"
              >
                Open customer page
              </RouterLink>
              <RouterLink
                :to="{ path: '/internal', query: { tab: 'products' } }"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-border-rose-300 hover:ect-text-rose-700 ect-transition-colors"
              >
                Back to products list
              </RouterLink>
            </div>
          </article>
        </aside>
      </div>

      <div v-else-if="!loading" class="ect-grid xl:ect-grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] ect-gap-5">
        <section class="ect-space-y-5">
          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal ect-mb-4">Core fields</h2>
            <dl class="ect-grid md:ect-grid-cols-2 ect-gap-x-6 ect-gap-y-4">
              <div v-for="row in coreDisplayRows" :key="row.label" class="ect-min-w-0">
                <dt class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-1.5">{{ row.label }}</dt>
                <dd class="ect-font-body ect-text-sm ect-leading-6 ect-text-charcoal ect-break-words">{{ row.value }}</dd>
              </div>
            </dl>
          </article>

          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <div class="ect-mb-4">
              <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Product attributes</h2>
              <p class="ect-font-body ect-text-xs ect-text-charcoal/50 ect-mt-1">These values appear in the product details section and improve search quality.</p>
            </div>
            <dl class="ect-grid md:ect-grid-cols-2 ect-gap-x-6 ect-gap-y-4">
              <div v-for="row in attributeDisplayRows" :key="row.label">
                <dt class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-1.5">{{ row.label }}</dt>
                <dd class="ect-font-body ect-text-sm ect-leading-6 ect-text-charcoal">{{ row.value }}</dd>
              </div>
            </dl>
          </article>

          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal ect-mb-4">Description</h2>
            <p class="ect-font-body ect-text-sm ect-leading-7 ect-text-charcoal/80 ect-whitespace-pre-wrap">
              {{ displayValue(form.description, 'No manual description added yet.') }}
            </p>
          </article>

          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <div class="ect-mb-4">
              <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Customization options</h2>
              <p class="ect-font-body ect-text-xs ect-text-charcoal/50 ect-mt-1">These values power the customer-facing customizable details section and the customize card.</p>
            </div>
            <dl class="ect-grid md:ect-grid-cols-2 ect-gap-x-6 ect-gap-y-4">
              <div v-for="row in customizationDisplayRows" :key="row.label">
                <dt class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-1.5">{{ row.label }}</dt>
                <dd class="ect-font-body ect-text-sm ect-leading-6 ect-text-charcoal ect-break-words">{{ row.value }}</dd>
              </div>
            </dl>
          </article>

          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal ect-mb-4">Status</h2>
            <dl class="ect-grid sm:ect-grid-cols-3 ect-gap-x-6 ect-gap-y-4">
              <div v-for="row in statusDisplayRows" :key="row.label">
                <dt class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-1.5">{{ row.label }}</dt>
                <dd class="ect-font-body ect-text-sm ect-leading-6 ect-text-charcoal">{{ row.value }}</dd>
              </div>
            </dl>
          </article>

          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <div class="ect-mb-4">
              <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">AI description</h2>
              <p class="ect-font-body ect-text-xs ect-text-charcoal/50 ect-mt-1">Generated from product images and stored separately from the manual description.</p>
            </div>
            <p class="ect-font-body ect-text-sm ect-leading-7 ect-text-charcoal/75 ect-whitespace-pre-wrap">
              {{ displayValue(form.aiDescription, 'AI description will be generated from product images.') }}
            </p>
          </article>

          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <div class="ect-flex ect-items-center ect-justify-between ect-gap-3 ect-mb-4">
              <div>
                <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Gallery images</h2>
                <p class="ect-font-body ect-text-xs ect-text-charcoal/45 ect-mt-1">Review the image stack in display order. Use Edit to upload, reorder, or retire images.</p>
              </div>
            </div>

            <div v-if="form.images.length" class="ect-space-y-4">
              <article v-for="(image, index) in form.images" :key="image.id || `view-${index}`" class="ect-rounded-lg ect-border ect-border-rose-100 ect-p-4">
                <div class="ect-grid lg:ect-grid-cols-[120px_minmax(0,1fr)] ect-gap-4">
                  <div class="ect-relative ect-aspect-square ect-rounded-lg ect-overflow-hidden ect-bg-charcoal/5">
                    <img v-if="image.url" :src="image.url" :alt="image.alt || form.title" class="ect-h-full ect-w-full ect-object-cover" />
                    <div v-else class="ect-flex ect-h-full ect-items-center ect-justify-center ect-font-body ect-text-xs ect-text-charcoal/35">Preview</div>
                    <span class="ect-absolute ect-top-1.5 ect-left-1.5 ect-rounded-full ect-bg-charcoal/80 ect-px-2 ect-py-0.5 ect-font-body ect-text-[10px] ect-font-semibold ect-text-white">Supabase</span>
                  </div>
                  <dl class="ect-grid sm:ect-grid-cols-2 ect-gap-x-4 ect-gap-y-3">
                    <div>
                      <dt class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-1.5">Alt text</dt>
                      <dd class="ect-font-body ect-text-sm ect-leading-6 ect-text-charcoal">{{ displayValue(image.alt) }}</dd>
                    </div>
                    <div>
                      <dt class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/45 ect-mb-1.5">Active</dt>
                      <dd class="ect-font-body ect-text-sm ect-leading-6 ect-text-charcoal">{{ displayBoolean(image.active) }}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            </div>

            <p v-else class="ect-rounded-lg ect-border ect-border-dashed ect-border-charcoal/15 ect-p-6 ect-text-center ect-font-body ect-text-sm ect-text-charcoal/45">
              No images yet. Use Edit to add one.
            </p>

            <!-- Read-only images served from S3 (folder name === slug) -->
            <div v-if="s3Images.length" class="ect-mt-6 ect-border-t ect-border-rose-100 ect-pt-5">
              <div class="ect-flex ect-items-center ect-gap-2 ect-mb-3">
                <span class="ect-rounded-full ect-bg-indigo-100 ect-px-2.5 ect-py-1 ect-font-body ect-text-xs ect-font-semibold ect-text-indigo-700">S3</span>
                <h3 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">From S3 ({{ s3Images.length }})</h3>
                <span class="ect-font-body ect-text-xs ect-text-charcoal/45">Managed in S3 · read-only · auto-shown on the storefront</span>
              </div>
              <div class="ect-grid ect-grid-cols-2 sm:ect-grid-cols-3 lg:ect-grid-cols-4 ect-gap-3">
                <figure v-for="(img, i) in s3Images" :key="img.url || i" class="ect-rounded-lg ect-border ect-border-rose-100 ect-overflow-hidden">
                  <div class="ect-relative ect-aspect-square ect-bg-charcoal/5">
                    <img :src="img.url" :alt="img.sku || form.title" loading="lazy" class="ect-h-full ect-w-full ect-object-cover" />
                    <span class="ect-absolute ect-top-1.5 ect-left-1.5 ect-rounded-full ect-bg-indigo-600/90 ect-px-2 ect-py-0.5 ect-font-body ect-text-[10px] ect-font-semibold ect-text-white">S3</span>
                  </div>
                  <figcaption v-if="img.sku" class="ect-px-2 ect-py-1.5 ect-font-body ect-text-[11px] ect-text-charcoal/55 ect-truncate">{{ img.sku }}</figcaption>
                </figure>
              </div>
            </div>
          </article>
        </section>

        <aside class="ect-space-y-5">
          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal ect-mb-4">Preview</h2>
            <div v-if="previewImages.length" class="ect-space-y-3">
              <figure class="ect-relative ect-aspect-square ect-rounded-lg ect-overflow-hidden ect-bg-charcoal/5">
                <img :src="previewImages[activePreviewImage]?.url" :alt="previewImages[activePreviewImage]?.alt || form.title" class="ect-h-full ect-w-full ect-object-cover" />
                <span v-if="previewImages.length > 1" class="ect-absolute ect-top-2 ect-left-2 ect-inline-flex ect-items-center ect-rounded-full ect-bg-white/88 ect-px-2.5 ect-py-1 ect-font-body ect-text-[11px] ect-font-semibold ect-text-charcoal ect-shadow-sm">
                  {{ activePreviewImage + 1 }} / {{ previewImages.length }}
                </span>
              </figure>
              <ul v-if="previewImages.length > 1" class="ect-flex ect-gap-2 ect-list-none ect-m-0 ect-p-0 ect-overflow-x-auto">
                <li v-for="(image, idx) in previewImages" :key="`${image.url}-${image.sortOrder}`" class="ect-shrink-0">
                  <button type="button" @click="setPreviewImage(idx)" :aria-current="activePreviewImage === idx ? 'true' : undefined"
                    class="ect-h-16 ect-w-16 ect-rounded-lg ect-overflow-hidden ect-border-2 ect-transition focus:ect-outline-none focus-visible:ect-ring-2 focus-visible:ect-ring-rose-300"
                    :class="activePreviewImage === idx ? 'ect-border-rose-400 ect-shadow-sm' : 'ect-border-charcoal/10 ect-opacity-75 hover:ect-opacity-100'">
                    <img :src="image.url" :alt="image.alt || form.title" loading="lazy" class="ect-h-full ect-w-full ect-object-cover" />
                  </button>
                </li>
              </ul>
            </div>
            <div v-else class="ect-flex ect-aspect-square ect-items-center ect-justify-center ect-rounded-lg ect-bg-charcoal/5 ect-font-body ect-text-sm ect-text-charcoal/35">
              Image preview
            </div>
            <div class="ect-mt-4">
              <p class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal">{{ form.title || 'Untitled product' }}</p>
              <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mt-1">{{ form.category || 'Category' }} · {{ form.material || 'Material' }}</p>
              <p class="ect-font-body ect-text-sm ect-text-charcoal/70 ect-mt-3">{{ form.description || 'Description preview will appear here.' }}</p>
            </div>
          </article>

          <article class="ect-bg-white ect-border ect-border-rose-200/50 ect-rounded-lg ect-p-5">
            <h2 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal ect-mb-4">Quick links</h2>
            <div class="ect-flex ect-flex-col ect-gap-3">
              <RouterLink
                v-if="form.slug"
                :to="`/product/${form.slug}`"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-border-rose-300 hover:ect-text-rose-700 ect-transition-colors"
              >
                Open customer page
              </RouterLink>
              <RouterLink
                :to="{ path: '/internal', query: { tab: 'products' } }"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-border-rose-300 hover:ect-text-rose-700 ect-transition-colors"
              >
                Back to products list
              </RouterLink>
            </div>
          </article>
        </aside>
      </div>
    </div>
  </section>
</template>
