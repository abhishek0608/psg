<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import InternalWorkspaceTabs from '../components/InternalWorkspaceTabs.vue'
import InternalNewOrderModal from '../components/InternalNewOrderModal.vue'
import InternalNewQuoteModal from '../components/InternalNewQuoteModal.vue'
import InternalNewUserModal from '../components/InternalNewUserModal.vue'
import UiSelect from '../components/UiSelect.vue'
import { API_BASE } from '../config-api'
import { useAuth } from '../composables/useAuth'
import { invalidateHomepageSlides } from '../composables/useHomepageSlides'
import { invalidateProductsCache } from '../composables/useProductsApi'
import { invalidateSiteConfig, DEFAULT_LOGO_SRC } from '../composables/useSiteConfig'
import { useInternalWorkspaceTab } from '../composables/useInternalWorkspaceTab'
import { useOrders } from '../composables/useOrders'
import { useQuotes } from '../composables/useQuotes'
import {
  fetchVideoCallBookings,
  updateVideoCallStatus,
  type VideoCallBooking,
  type VideoCallStatus,
} from '../composables/useVideoCallBookings'
import { HOMEPAGE_COLLECTION_LINKS } from '../data/collections'
import { CATEGORIES } from '../data/products'


interface AuditFields {
  createdBy?: string | null
  createdAt: string
  modifiedBy?: string | null
  modifiedAt?: string | null
}

interface InternalOrder extends AuditFields {
  id: string
  orderNo: string
  customerId?: string | null
  customer: string
  customerEmail: string
  status: string
  total: string
  itemCount: number
}

interface InternalUser extends AuditFields {
  id: string
  name: string
  email: string
  isInternal: boolean
  isAdmin: boolean
  channel: string
  orderCount: number
}

interface InternalProduct extends AuditFields {
  id: string
  slug: string
  title: string
  category: string
  material: string
  active: boolean
  price: string | null
  hiddenForNoPrice?: boolean
  updatedAt: string
}

interface HomepageSlideRecord {
  id?: string
  imageUrl: string
  mobileImageUrl?: string
  videoUrl?: string
  mobileVideoUrl?: string
  headline?: string
  subheadline?: string
  ctaLabel?: string
  ctaHref?: string
  device?: 'all' | 'desktop' | 'mobile'
  sortOrder?: number
  active?: boolean
}

const router = useRouter()
const { user, isInternalUser, isAdminUser } = useAuth()
const { orders: localOrders } = useOrders()
const { quotes } = useQuotes()
const { activeTabId } = useInternalWorkspaceTab()
const error = ref('')
const videoCallBookings = ref<VideoCallBooking[]>([])
const videoCallsLoading = ref(false)
const videoCallsError = ref('')
const videoCallSearch = ref('')
const videoCallStatusOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

// --- Video consultation settings (site config) ---
const videoCallEnabled = ref(true)
const videoCallFee = ref<number | null>(0)
const videoCallMinPrice = ref<number | null>(0)
const videoCallMaxItems = ref<number | null>(5)
const videoCallSettingsSaving = ref(false)
const videoCallSettingsMessage = ref('')
const homepageSlides = ref<HomepageSlideRecord[]>([])
const homepageGrid = ref<HTMLElement | null>(null)
const homepageLoading = ref(false)
const homepageSaving = ref(false)
const homepageUploading = ref(false)
const homepageMessage = ref('')
const logoUrl = ref('')
const logoLoading = ref(false)
const logoSaving = ref(false)
const logoMessage = ref('')

// --- Shop by Collection tile images ---
// The fixed collections rendered on the homepage grid. The admin can attach an
// image to each; slugs left blank keep their bundled fallback image.
const collectionLinks = HOMEPAGE_COLLECTION_LINKS
const collectionImages = ref<Record<string, string>>({})
const collectionImagesSaving = ref(false)
const collectionImagesUploading = ref(false)
const collectionImagesMessage = ref('')
const logoPreviewSrc = computed(() => logoUrl.value || DEFAULT_LOGO_SRC)

// --- About Us page content ---
// Hero copy, journey milestones (group/founder photos), and team portraits for
// the storefront About page. Empty fields / lists fall back to the storefront's
// bundled defaults.
interface AboutJourneyDraft {
  year: string
  place: string
  title: string
  desc: string
  imageUrl: string
  active: boolean
}
interface AboutTeamDraft {
  name: string
  role: string
  imageUrl: string
  active: boolean
}
const aboutHeroEyebrow = ref('')
const aboutHeroHeadline = ref('')
const aboutHeroSubheadline = ref('')
const aboutJourney = ref<AboutJourneyDraft[]>([])
const aboutTeam = ref<AboutTeamDraft[]>([])
const aboutSaving = ref(false)
const aboutUploading = ref(false)
const aboutMessage = ref('')

// --- Offers config ---
// Automatic offers can cover the whole catalog or a selected product set. A
// one-product offer is simply a selected set with one member. Promo codes stay
// separate because they do nothing until the shopper enters a code at checkout.
type PromoOfferTypeDraft = 'PERCENT' | 'AMOUNT'
type AutomaticOfferTypeDraft = PromoOfferTypeDraft | 'FIXED_PRICE'
type OfferScopeDraft = 'ALL_PRODUCTS' | 'PRODUCTS'

interface OfferProductOption {
  id: string
  slug: string
  title: string
  category: string
  /** Blank means inherit the campaign's default pricing rule. */
  pricingType: '' | AutomaticOfferTypeDraft
  pricingValue: number | null
  pricingLabel: string
}

interface AutomaticOfferDraft {
  id: string
  name: string
  type: '' | AutomaticOfferTypeDraft
  value: number | null
  label: string
  scope: OfferScopeDraft
  startsAt: string
  endsAt: string
  active: boolean
  products: OfferProductOption[]
}

const automaticOffers = ref<AutomaticOfferDraft[]>([])
const automaticOffersLoading = ref(false)
const automaticOfferSavingId = ref('')
const automaticOfferMessage = ref('')
const automaticOfferDraft = ref<AutomaticOfferDraft | null>(null)
const offerProductOptions = ref<OfferProductOption[]>([])
const offerProductSearch = ref('')
const offerProductCategory = ref('')
const offerProductCreatedBefore = ref('')
const offerProductOptionsLoading = ref(false)
let offerProductSearchDebounce: ReturnType<typeof setTimeout> | undefined

interface PromoCodeDraft {
  id: string
  code: string
  type: PromoOfferTypeDraft
  value: number | null
  minOrderPaise: number | null
  startsAt: string
  endsAt: string
  active: boolean
}

const promoCodes = ref<PromoCodeDraft[]>([])
const promoLoading = ref(false)
const promoSavingId = ref('')
const promoMessage = ref('')
// The row being edited, or a blank draft when adding. Editing happens in a
// single form rather than inline so the date and type pickers have room.
const promoDraft = ref<PromoCodeDraft | null>(null)

// Percent offers are capped below 100 so enabling one can never drive an order
// to ₹0 — mirrors MAX_OFFER_PERCENT in server/api/offers-source.js.
const MAX_OFFER_PERCENT = 90

function blankPromoDraft(): PromoCodeDraft {
  return {
    id: '',
    code: '',
    type: 'PERCENT',
    value: null,
    minOrderPaise: null,
    startsAt: '',
    endsAt: '',
    active: true,
  }
}
// --- Orders tab: searchable + paginated list (replaces the capped dashboard
// payload so search covers every order, not just the newest 25) ---
const orders = ref<InternalOrder[]>([])
const orderSearch = ref('')
const orderTotal = ref(0)
const orderHasMore = ref(false)
const orderListLoading = ref(false)
const orderLoadingMore = ref(false)
// Whether the backend list answered at least once — distinguishes "no matches"
// from "backend unreachable" so the local-order fallback stays honest.
const ordersFetched = ref(false)
let orderSearchDebounce: ReturnType<typeof setTimeout> | undefined

async function loadOrders(reset = true) {
  if (!isInternalUser.value || !user.value?.id) return
  const skip = reset ? 0 : orders.value.length
  if (reset) orderListLoading.value = true
  else orderLoadingMore.value = true
  try {
    const params = new URLSearchParams({
      resource: 'orders-list',
      userId: user.value.id,
      skip: String(skip),
    })
    if (orderSearch.value.trim()) params.set('search', orderSearch.value.trim())
    const res = await fetch(`${API_BASE}/api/internal?${params.toString()}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to load orders.')
    orders.value = reset ? data.orders : [...orders.value, ...data.orders]
    orderTotal.value = data.total ?? orders.value.length
    orderHasMore.value = Boolean(data.hasMore)
    ordersFetched.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unable to load orders.'
  } finally {
    orderListLoading.value = false
    orderLoadingMore.value = false
  }
}

function onOrderSearchInput() {
  if (orderSearchDebounce) clearTimeout(orderSearchDebounce)
  orderSearchDebounce = setTimeout(() => void loadOrders(true), 300)
}

// --- Users tab: searchable + paginated list ---
const users = ref<InternalUser[]>([])
const userSearch = ref('')
const userTotal = ref(0)
const userHasMore = ref(false)
const userListLoading = ref(false)
const userLoadingMore = ref(false)
let userSearchDebounce: ReturnType<typeof setTimeout> | undefined

async function loadUsers(reset = true) {
  if (!isInternalUser.value || !user.value?.id) return
  const skip = reset ? 0 : users.value.length
  if (reset) userListLoading.value = true
  else userLoadingMore.value = true
  try {
    const params = new URLSearchParams({
      resource: 'users-list',
      userId: user.value.id,
      skip: String(skip),
    })
    if (userSearch.value.trim()) params.set('search', userSearch.value.trim())
    const res = await fetch(`${API_BASE}/api/internal?${params.toString()}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to load users.')
    users.value = reset ? data.users : [...users.value, ...data.users]
    userTotal.value = data.total ?? users.value.length
    userHasMore.value = Boolean(data.hasMore)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unable to load users.'
  } finally {
    userListLoading.value = false
    userLoadingMore.value = false
  }
}

function onUserSearchInput() {
  if (userSearchDebounce) clearTimeout(userSearchDebounce)
  userSearchDebounce = setTimeout(() => void loadUsers(true), 300)
}

// --- "New …" creation modals, one per tab ---
const newOrderOpen = ref(false)
const newQuoteOpen = ref(false)
const newUserOpen = ref(false)

function onOrderCreated() {
  newOrderOpen.value = false
  void loadOrders(true)
}

function onUserCreated() {
  newUserOpen.value = false
  void loadUsers(true)
}

// Quotes are reactive through useQuotes, so closing the modal is enough.
function onQuoteCreated() {
  newQuoteOpen.value = false
}

// --- Quotes tab: this list lives in this browser's storage, so a simple
// client-side filter covers everything ---
const quoteSearch = ref('')
const filteredQuotes = computed(() => {
  const q = quoteSearch.value.trim().toLowerCase()
  if (!q) return quotes.value
  return quotes.value.filter((quote) =>
    [quote.id, quote.customerName, quote.customerEmail, quote.status].some((v) =>
      String(v || '').toLowerCase().includes(q)
    )
  )
})

const filteredVideoCallBookings = computed(() => {
  const query = videoCallSearch.value.trim().toLowerCase()
  if (!query) return videoCallBookings.value
  return videoCallBookings.value.filter((booking) =>
    [
      booking.reference, booking.name, booking.email, booking.phone, booking.status,
      booking.notes, booking.preferredTime,
      ...booking.items.map((item) => item.title),
    ].some((value) => String(value || '').toLowerCase().includes(query)),
  )
})

async function loadVideoCallBookings() {
  if (!user.value?.id) return
  videoCallsLoading.value = true
  videoCallsError.value = ''
  try {
    videoCallBookings.value = await fetchVideoCallBookings(user.value.id)
  } catch (err) {
    videoCallsError.value = err instanceof Error ? err.message : 'Could not load video-call requests.'
  } finally {
    videoCallsLoading.value = false
  }
}

async function setVideoCallStatus(booking: VideoCallBooking, nextStatus: string) {
  if (!user.value?.id || nextStatus === booking.status) return
  try {
    const updated = await updateVideoCallStatus(user.value.id, booking.reference, nextStatus as VideoCallStatus)
    const index = videoCallBookings.value.findIndex((item) => item.reference === booking.reference)
    if (index >= 0) videoCallBookings.value[index] = updated
  } catch (err) {
    videoCallsError.value = err instanceof Error ? err.message : 'Could not update the request.'
  }
}

// A datetime-local input speaks the browser's local time; the API stores UTC.
function toLocalInputValue(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function setVideoCallSchedule(booking: VideoCallBooking, localValue: string) {
  if (!user.value?.id) return
  const scheduledAt = localValue ? new Date(localValue).toISOString() : ''
  // Agreeing a time is what "scheduled" means, so the status follows the date.
  const nextStatus: VideoCallStatus =
    localValue && (booking.status === 'new' || booking.status === 'contacted') ? 'scheduled' : booking.status
  try {
    const updated = await updateVideoCallStatus(user.value.id, booking.reference, nextStatus, scheduledAt)
    const index = videoCallBookings.value.findIndex((item) => item.reference === booking.reference)
    if (index >= 0) videoCallBookings.value[index] = updated
  } catch (err) {
    videoCallsError.value = err instanceof Error ? err.message : 'Could not update the appointment time.'
  }
}

async function saveVideoCallSettings() {
  if (!isInternalUser.value || !user.value?.id) return
  videoCallSettingsSaving.value = true
  videoCallSettingsMessage.value = ''
  try {
    const res = await fetch(`${API_BASE}/api/internal?resource=site-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.value.id,
        videoCallEnabled: videoCallEnabled.value,
        videoCallFee: Math.max(0, Math.floor(Number(videoCallFee.value) || 0)),
        videoCallMinPrice: Math.max(0, Math.floor(Number(videoCallMinPrice.value) || 0)),
        videoCallMaxItems: Math.min(20, Math.max(1, Math.floor(Number(videoCallMaxItems.value) || 5))),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to save video-call settings.')
    applyVideoCallSettings(data?.siteConfig)
    invalidateSiteConfig()
    videoCallSettingsMessage.value = 'Video-call settings saved.'
  } catch (e) {
    videoCallSettingsMessage.value = e instanceof Error ? e.message : 'Unable to save video-call settings.'
  } finally {
    videoCallSettingsSaving.value = false
  }
}

function applyVideoCallSettings(siteConfig: Record<string, unknown> | undefined | null) {
  videoCallEnabled.value = siteConfig?.videoCallEnabled !== false
  videoCallFee.value = Number(siteConfig?.videoCallFee) || 0
  videoCallMinPrice.value = Number(siteConfig?.videoCallMinPrice) || 0
  videoCallMaxItems.value = Number(siteConfig?.videoCallMaxItems) || 5
}

// --- Products tab: searchable + paginated list (independent of the dashboard
// payload so the table is no longer capped at the first 50 records) ---
const products = ref<InternalProduct[]>([])
const productSearch = ref('')
const productStatusFilter = ref<'all' | 'active' | 'hidden'>('all')
const productStatusOptions = [
  { value: 'all', label: 'All products' },
  { value: 'active', label: 'Active products' },
  { value: 'hidden', label: 'Hidden products' },
]
const productTotal = ref(0)
const productUnpricedTotal = ref(0)
const productHasMore = ref(false)
const productListLoading = ref(false)
const productLoadingMore = ref(false)
let productSearchDebounce: ReturnType<typeof setTimeout> | undefined

async function loadProducts(reset = true) {
  if (!isInternalUser.value || !user.value?.id) return
  const skip = reset ? 0 : products.value.length
  if (reset) productListLoading.value = true
  else productLoadingMore.value = true
  try {
    const params = new URLSearchParams({
      resource: 'products-list',
      userId: user.value.id,
      skip: String(skip),
    })
    if (productSearch.value.trim()) params.set('search', productSearch.value.trim())
    if (productStatusFilter.value !== 'all') params.set('status', productStatusFilter.value)
    const res = await fetch(`${API_BASE}/api/internal?${params.toString()}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to load products.')
    products.value = reset ? data.products : [...products.value, ...data.products]
    productTotal.value = data.total ?? products.value.length
    productUnpricedTotal.value = data.unpricedTotal ?? 0
    productHasMore.value = Boolean(data.hasMore)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unable to load products.'
  } finally {
    productListLoading.value = false
    productLoadingMore.value = false
  }
}

function onProductSearchInput() {
  if (productSearchDebounce) clearTimeout(productSearchDebounce)
  productSearchDebounce = setTimeout(() => void loadProducts(true), 300)
}

function onProductStatusChange() {
  void loadProducts(true)
}

const skeletonRows = Array.from({ length: 5 }, (_, index) => index)
const orderSkeletonWidths = ['ect-w-32', 'ect-w-40', 'ect-w-10', 'ect-w-20', 'ect-w-20', 'ect-w-28']
const userSkeletonWidths = ['ect-w-32', 'ect-w-44', 'ect-w-20', 'ect-w-24', 'ect-w-10', 'ect-w-28']
// One width per column (Product, Category, Material, Price, Status, Created,
// Modified) — distinct values so they double as v-for keys.
const productSkeletonWidths = ['ect-w-44', 'ect-w-24', 'ect-w-20', 'ect-w-16', 'ect-w-14', 'ect-w-28', 'ect-w-32']

const displayOrders = computed<InternalOrder[]>(() => {
  if (orders.value.length) return orders.value
  const q = orderSearch.value.trim().toLowerCase()
  // The backend answered (possibly with zero matches) — trust it over the
  // local fallback so a search never surfaces unrelated cached orders.
  if (ordersFetched.value && q) return []
  const fallbackCustomer = user.value?.name || 'Current customer'
  const fallback = localOrders.value.map((order) => ({
    id: order.id,
    orderNo: order.id,
    customerId: null,
    customer: fallbackCustomer,
    customerEmail: user.value?.email || '',
    status: order.status,
    total: order.formattedTotal,
    itemCount: order.itemCount,
    // Locally-cached orders were placed by the signed-in customer.
    createdBy: fallbackCustomer,
    createdAt: order.createdAt,
    modifiedBy: null,
    modifiedAt: null,
  }))
  if (!q) return fallback
  return fallback.filter((order) =>
    [order.orderNo, order.customer, order.customerEmail, order.status].some((v) =>
      String(v || '').toLowerCase().includes(q)
    )
  )
})

function formatDate(value: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )
}

// --- Run all products through AI (regenerate description + image-search vector) ---
// Driven from the products tab toolbar. Processes products in small batches via
// cursor pagination so each request stays under serverless timeouts.
const AI_BATCH_SIZE = 3
const aiModalOpen = ref(false)
const aiScope = ref<'missing' | 'all'>('missing')
const aiRunning = ref(false)
const aiStopRequested = ref(false)
const aiError = ref('')
const aiProgress = ref({ done: 0, total: 0 })
const aiTotals = ref<Record<string, number>>({ generated: 0, empty: 0, skipped: 0, error: 0 })
const aiResults = ref<{ slug: string; status: string; message: string }[]>([])

// CSV column order must match the bulk-import schema so an exported file can be
// edited and re-uploaded without creating duplicates (import upserts by slug).
const EXPORT_COLUMNS = [
  'slug', 'title', 'category', 'subtype', 'material', 'color', 'price', 'description',
  'grossWeight', 'diamondCarats', 'diamondQuantity',
  'styleTags', 'stoneTags',
  'isNewArrival', 'isBestSeller', 'active', 'rating', 'reviewCount',
  'diamondQualities', 'metalPurities', 'centerShapes', 'centerStoneSizes',
  'stoneTypes', 'ringSizes', 'bangleSizes', 'necklaceSizes',
  'allowCustomCenterStoneSize', 'allowCustomStoneType',
]

const exporting = ref(false)
const exportError = ref('')

// "More" dropdown in the products toolbar (holds secondary actions)
const productMoreOpen = ref(false)
const productMoreRef = ref<HTMLElement | null>(null)

function closeProductMoreOnOutsideClick(e: MouseEvent) {
  if (productMoreRef.value && !productMoreRef.value.contains(e.target as Node)) {
    productMoreOpen.value = false
  }
}

async function exportProducts() {
  if (!user.value?.id || exporting.value) return
  exporting.value = true
  exportError.value = ''
  try {
    const res = await fetch(
      `${API_BASE}/api/internal?resource=product&action=export&userId=${encodeURIComponent(user.value.id)}`,
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Export request failed.')
    const records = (data.rows || []) as Record<string, string>[]
    if (!records.length) { exportError.value = 'No products to export.'; return }
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const csv =
      EXPORT_COLUMNS.join(',') + '\n' +
      records.map((r) => EXPORT_COLUMNS.map((c) => esc(r[c] ?? '')).join(',')).join('\n') + '\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    exportError.value = e instanceof Error ? e.message : 'Export failed.'
  } finally {
    exporting.value = false
  }
}

function aiStatusClass(status: string) {
  if (status === 'generated') return 'ect-bg-green-100 ect-text-green-700'
  if (status === 'skipped' || status === 'empty') return 'ect-bg-amber-100 ect-text-amber-700'
  return 'ect-bg-red-100 ect-text-red-700'
}

// --- Photo-vector sync (image embeddings only, no AI descriptions) ---------
// Picks up photos uploaded to a product's S3 folder after the product was
// created. Runs scope 'all' because already-embedded photos are skipped
// server-side by hash — only new/changed photos cost an embedding call.
const SYNC_BATCH_SIZE = 3
const syncRunning = ref(false)
const syncStopRequested = ref(false)
const syncError = ref('')
const syncProgress = ref({ done: 0, total: 0 })
const syncTotals = ref<Record<string, number>>({})
const syncResults = ref<{ slug: string; status: string; message: string }[]>([])

function syncStatusClass(status: string) {
  if (status === 'synced') return 'ect-bg-green-100 ect-text-green-700'
  if (status === 'error') return 'ect-bg-red-100 ect-text-red-700'
  return 'ect-bg-amber-100 ect-text-amber-700'
}

async function runPhotoVectorSync() {
  if (!user.value?.id || syncRunning.value) return

  syncRunning.value = true
  syncStopRequested.value = false
  syncError.value = ''
  syncProgress.value = { done: 0, total: 0 }
  syncTotals.value = {}
  syncResults.value = []

  let cursor: string | null = null
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (syncStopRequested.value) break
      const res = await fetch(
        `${API_BASE}/api/internal?resource=product&action=resync-image-embeddings&userId=${encodeURIComponent(user.value.id)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.value.id,
            action: 'resync-image-embeddings',
            scope: 'all',
            limit: SYNC_BATCH_SIZE,
            cursor,
          }),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Photo vector sync request failed.')

      for (const r of data.results || []) {
        syncResults.value.push(r)
        syncTotals.value[r.status] = (syncTotals.value[r.status] || 0) + 1
      }
      syncProgress.value = {
        done: syncResults.value.length,
        total: typeof data.total === 'number' ? data.total : syncResults.value.length,
      }
      cursor = data.nextCursor || cursor
      if (data.done || !(data.results || []).length) break
    }
  } catch (e) {
    syncError.value = e instanceof Error ? e.message : 'Photo vector sync failed.'
  } finally {
    syncRunning.value = false
  }
}

function stopPhotoVectorSync() {
  syncStopRequested.value = true
}

function openAiModal() {
  if (aiRunning.value) return
  aiModalOpen.value = true
}

async function runAllThroughAi() {
  if (!user.value?.id || aiRunning.value) return
  aiModalOpen.value = false

  aiRunning.value = true
  aiStopRequested.value = false
  aiError.value = ''
  aiProgress.value = { done: 0, total: 0 }
  aiTotals.value = { generated: 0, empty: 0, skipped: 0, error: 0 }
  aiResults.value = []

  let cursor: string | null = null
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (aiStopRequested.value) break
      const res = await fetch(
        `${API_BASE}/api/internal?resource=product&action=bulk-ai&userId=${encodeURIComponent(user.value.id)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.value.id,
            action: 'bulk-ai',
            scope: aiScope.value,
            limit: AI_BATCH_SIZE,
            cursor,
          }),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'AI run request failed.')

      for (const r of data.results || []) {
        aiResults.value.push(r)
        aiTotals.value[r.status] = (aiTotals.value[r.status] || 0) + 1
      }
      aiProgress.value = {
        done: aiResults.value.length,
        total: typeof data.total === 'number' ? data.total : aiResults.value.length,
      }
      cursor = data.nextCursor || cursor
      if (data.done || !(data.results || []).length) break
    }
  } catch (e) {
    aiError.value = e instanceof Error ? e.message : 'AI run failed.'
  } finally {
    aiRunning.value = false
  }
}

function stopAiRun() {
  aiStopRequested.value = true
}

function customerDetailPath(order: InternalOrder) {
  return order.customerId ? `/internal/users/${order.customerId}` : null
}

function openOrderDetail(order: InternalOrder) {
  void router.push({ name: 'internal-order', params: { id: order.id } })
}

function createHomepageSlide(): HomepageSlideRecord {
  return {
    imageUrl: '',
    mobileImageUrl: '',
    videoUrl: '',
    mobileVideoUrl: '',
    headline: '',
    subheadline: '',
    ctaLabel: '',
    ctaHref: '',
    device: 'all',
    sortOrder: homepageSlides.value.length,
    active: true,
  }
}

function normalizeHomepageSlidesForView(slides: any[]) {
  return Array.isArray(slides)
    ? slides.map((slide: any, index: number) => ({
        id: slide?.id ? String(slide.id) : undefined,
        imageUrl: String(slide?.imageUrl || ''),
        mobileImageUrl: String(slide?.mobileImageUrl || ''),
        videoUrl: String(slide?.videoUrl || ''),
        mobileVideoUrl: String(slide?.mobileVideoUrl || ''),
        headline: String(slide?.headline || ''),
        subheadline: String(slide?.subheadline || ''),
        ctaLabel: String(slide?.ctaLabel || ''),
        ctaHref: String(slide?.ctaHref || ''),
        device:
          slide?.device === 'desktop' || slide?.device === 'mobile' ? slide.device : 'all',
        sortOrder:
          Number.isFinite(Number(slide?.sortOrder)) && Number(slide.sortOrder) >= 0
            ? Number(slide.sortOrder)
            : index,
        active: slide?.active !== false,
      }))
    : []
}

function refreshHomepageSortOrder() {
  homepageSlides.value = homepageSlides.value.map((slide, index) => ({
    ...slide,
    sortOrder: index,
  }))
}

async function addHomepageSlide() {
  homepageSlides.value.push(createHomepageSlide())
  refreshHomepageSortOrder()
  homepageMessage.value = ''
  await nextTick()
  const cards = homepageGrid.value?.querySelectorAll(':scope > article')
  const newCard = cards?.[cards.length - 1]
  newCard?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function removeHomepageSlide(index: number) {
  homepageSlides.value.splice(index, 1)
  refreshHomepageSortOrder()
}

function moveHomepageSlide(index: number, direction: number) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= homepageSlides.value.length) return
  const nextSlides = [...homepageSlides.value]
  const [target] = nextSlides.splice(index, 1)
  if (!target) return
  nextSlides.splice(nextIndex, 0, target)
  homepageSlides.value = nextSlides
  refreshHomepageSortOrder()
}

const MAX_INLINE_IMAGE_LENGTH = 750_000
const MAX_UPLOAD_DIMENSION = 1600

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Unable to read selected image.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to read selected image.'))
    image.src = url
  })
}

// Downscale + re-encode an inline data URL to WebP so it stays small enough to
// fit inside the serverless request body limit (full-size photos overflow it).
// External http(s) URLs are passed through untouched.
async function compressDataUrl(url: string) {
  if (!url.startsWith('data:')) return url
  try {
    const image = await loadImage(url)
    const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return url
    context.drawImage(image, 0, 0, width, height)
    const compressed = canvas.toDataURL('image/webp', 0.82)
    return compressed.length < url.length ? compressed : url
  } catch {
    return url
  }
}

async function compressImageFile(file: File) {
  return compressDataUrl(await readFileAsDataUrl(file))
}

// Upload the original (full-resolution) file straight to S3 via a presigned
// URL and return its public URL. Returns null when uploads aren't configured
// (e.g. local dev without S3) so the caller can fall back to inline storage —
// image callers only; video has no inline fallback and must surface the error.
async function uploadHomepageImageToS3(
  file: File,
  target: 'desktop' | 'mobile' | 'collection' | 'about',
): Promise<string | null> {
  const userId = user.value?.id
  if (!userId) return null

  const presignRes = await fetch(
    `${API_BASE}/api/internal?resource=upload-image&userId=${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: file.type, target }),
    },
  )

  // Uploads not configured (501) or endpoint not deployed yet (404) → signal
  // the caller to use the base64 fallback rather than failing.
  if (presignRes.status === 501 || presignRes.status === 404) return null
  const presign = await presignRes.json().catch(() => ({}))
  if (!presignRes.ok) throw new Error(presign?.message || 'Unable to start the upload.')

  const putRes = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!putRes.ok) throw new Error('Upload to storage failed. Please try again.')

  return String(presign.publicUrl || '')
}

async function onHomepageSlideFileChange(index: number, event: Event, target: 'desktop' | 'mobile') {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  homepageMessage.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    homepageMessage.value = 'Please choose a JPG, PNG, WEBP, or AVIF image.'
    if (input) input.value = ''
    return
  }
  // S3 stores the full-resolution file, so we allow large banners here. The
  // inline (base64) fallback still downscales aggressively to fit the DB.
  if (file.size > 15 * 1024 * 1024) {
    homepageMessage.value = 'Please choose an image smaller than 15 MB.'
    if (input) input.value = ''
    return
  }
  const field = target === 'desktop' ? 'imageUrl' : 'mobileImageUrl'
  const applyUrl = (url: string) => {
    const nextSlides = [...homepageSlides.value]
    if (!nextSlides[index]) return
    nextSlides[index] = { ...nextSlides[index], [field]: url }
    homepageSlides.value = nextSlides
  }
  homepageUploading.value = true
  try {
    // Preferred path: upload the original file to S3 and store its public URL.
    const publicUrl = await uploadHomepageImageToS3(file, target)
    if (publicUrl) {
      applyUrl(publicUrl)
      return
    }

    // Fallback (no S3 configured): downscale + inline as a base64 data URL.
    const dataUrl = await compressImageFile(file)
    if (dataUrl.length > MAX_INLINE_IMAGE_LENGTH) {
      homepageMessage.value =
        'This image is too large to save even after compression. Please use a smaller image or paste an image URL instead.'
      return
    }
    applyUrl(dataUrl)
  } catch (error) {
    homepageMessage.value = error instanceof Error ? error.message : 'Unable to read image.'
  } finally {
    homepageUploading.value = false
    if (input) input.value = ''
  }
}

async function loadHomepageSlides() {
  if (!isInternalUser.value || !user.value?.id) return
  homepageLoading.value = true
  homepageMessage.value = ''
  try {
    const res = await fetch(
      `${API_BASE}/api/internal?resource=homepage-slides&userId=${encodeURIComponent(user.value.id)}`
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to load homepage slides.')
    homepageSlides.value = normalizeHomepageSlidesForView(data?.slides)
  } catch (e) {
    homepageMessage.value = e instanceof Error ? e.message : 'Unable to load homepage slides.'
  } finally {
    homepageLoading.value = false
  }
}

async function saveHomepageSlides() {
  if (!isInternalUser.value || !user.value?.id) return
  homepageSaving.value = true
  homepageMessage.value = ''
  try {
    // Re-compress any oversized inline images (including legacy slides saved
    // before compression existed) so the request body stays under the
    // serverless payload limit — otherwise the whole save fails with a 413.
    const slidesToSave = await Promise.all(
      homepageSlides.value.map(async (slide, index) => {
        const next = { ...slide, sortOrder: index }
        if (next.imageUrl && next.imageUrl.length > MAX_INLINE_IMAGE_LENGTH) {
          next.imageUrl = await compressDataUrl(next.imageUrl)
        }
        if (next.mobileImageUrl && next.mobileImageUrl.length > MAX_INLINE_IMAGE_LENGTH) {
          next.mobileImageUrl = await compressDataUrl(next.mobileImageUrl)
        }
        return next
      })
    )
    homepageSlides.value = slidesToSave.map((slide) => ({ ...slide }))

    const oversized = slidesToSave.find(
      (slide) =>
        (slide.imageUrl?.length || 0) > MAX_INLINE_IMAGE_LENGTH ||
        (slide.mobileImageUrl?.length || 0) > MAX_INLINE_IMAGE_LENGTH
    )
    if (oversized) {
      homepageMessage.value =
        'An image is too large to save even after compression. Please replace it with a smaller image or an image URL.'
      return
    }

    const res = await fetch(`${API_BASE}/api/internal?resource=homepage-slides`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.value.id,
        slides: slidesToSave,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to save homepage slides.')
    homepageSlides.value = normalizeHomepageSlidesForView(data?.slides)
    invalidateHomepageSlides()
    homepageMessage.value = 'Homepage slides saved.'
  } catch (e) {
    homepageMessage.value = e instanceof Error ? e.message : 'Unable to save homepage slides.'
  } finally {
    homepageSaving.value = false
  }
}

async function loadSiteConfig() {
  if (!isInternalUser.value || !user.value?.id) return
  logoLoading.value = true
  try {
    const res = await fetch(
      `${API_BASE}/api/internal?resource=site-config&userId=${encodeURIComponent(user.value.id)}`
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to load branding settings.')
    logoUrl.value = String(data?.siteConfig?.logoUrl || '')
    collectionImages.value = normalizeCollectionImagesForView(data?.siteConfig?.collectionImages)
    applyAboutContentToView(data?.siteConfig?.aboutContent)
    applyVideoCallSettings(data?.siteConfig)
  } catch (e) {
    logoMessage.value = e instanceof Error ? e.message : 'Unable to load branding settings.'
  } finally {
    logoLoading.value = false
  }
}

function automaticOfferRowToDraft(row: Record<string, unknown>): AutomaticOfferDraft {
  const rawProducts = Array.isArray(row?.products) ? row.products : []
  return {
    id: String(row?.id || ''),
    name: String(row?.name || ''),
    type: (row?.type ? parseAutomaticOfferType(row.type) : '') as AutomaticOfferDraft['type'],
    value: Number(row?.value) || null,
    label: String(row?.label || ''),
    scope: String(row?.scope || '').toUpperCase() === 'PRODUCTS' ? 'PRODUCTS' : 'ALL_PRODUCTS',
    startsAt: String(row?.startsAt || ''),
    endsAt: String(row?.endsAt || ''),
    active: row?.active !== false,
    products: rawProducts.map((product) => {
      const item = product as Record<string, unknown>
      return {
        id: String(item.id || ''),
        slug: String(item.slug || ''),
        title: String(item.title || ''),
        category: String(item.category || ''),
        pricingType: (item.pricingType ? parseAutomaticOfferType(item.pricingType) : '') as OfferProductOption['pricingType'],
        pricingValue: Number(item.pricingValue) || null,
        pricingLabel: String(item.pricingLabel || ''),
      }
    }).filter((product) => product.id),
  }
}

function parseAutomaticOfferType(value: unknown): AutomaticOfferTypeDraft {
  const type = String(value || '').toUpperCase()
  if (type === 'FIXED_PRICE') return 'FIXED_PRICE'
  return type === 'AMOUNT' ? 'AMOUNT' : 'PERCENT'
}

function blankAutomaticOfferDraft(): AutomaticOfferDraft {
  return {
    id: '',
    name: '',
    type: 'PERCENT',
    value: null,
    label: '',
    scope: 'ALL_PRODUCTS',
    startsAt: '',
    endsAt: '',
    active: true,
    products: [],
  }
}

async function loadAutomaticOffers() {
  if (!isInternalUser.value || !user.value?.id) return
  automaticOffersLoading.value = true
  try {
    const res = await fetch(
      `${API_BASE}/api/internal?resource=offers&userId=${encodeURIComponent(user.value.id)}`,
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to load offers.')
    automaticOffers.value = (Array.isArray(data?.offers) ? data.offers : []).map(automaticOfferRowToDraft)
  } catch (e) {
    automaticOfferMessage.value = e instanceof Error ? e.message : 'Unable to load offers.'
  } finally {
    automaticOffersLoading.value = false
  }
}

function startNewAutomaticOffer() {
  automaticOfferDraft.value = blankAutomaticOfferDraft()
  automaticOfferMessage.value = ''
  offerProductOptions.value = []
  void loadOfferProductOptions()
}

function editAutomaticOffer(row: AutomaticOfferDraft) {
  automaticOfferDraft.value = { ...row, products: row.products.map((product) => ({ ...product })) }
  automaticOfferMessage.value = ''
  offerProductOptions.value = []
  void loadOfferProductOptions()
}

function cancelAutomaticOfferDraft() {
  automaticOfferDraft.value = null
  automaticOfferMessage.value = ''
}

async function loadOfferProductOptions() {
  if (!isInternalUser.value || !user.value?.id) return
  offerProductOptionsLoading.value = true
  try {
    const params = new URLSearchParams({
      resource: 'products-list',
      userId: user.value.id,
      status: 'active',
      skip: '0',
    })
    if (offerProductSearch.value.trim()) params.set('search', offerProductSearch.value.trim())
    if (offerProductCategory.value) params.set('category', offerProductCategory.value)
    if (offerProductCreatedBefore.value) params.set('createdBefore', offerProductCreatedBefore.value)
    const res = await fetch(`${API_BASE}/api/internal?${params.toString()}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to load products.')
    offerProductOptions.value = (Array.isArray(data?.products) ? data.products : []).map(
      (product: Record<string, unknown>) => ({
        id: String(product.id || ''),
        slug: String(product.slug || ''),
        title: String(product.title || ''),
        category: String(product.category || ''),
        pricingType: '',
        pricingValue: null,
        pricingLabel: '',
      }),
    )
  } catch (e) {
    automaticOfferMessage.value = e instanceof Error ? e.message : 'Unable to load products.'
  } finally {
    offerProductOptionsLoading.value = false
  }
}

function onOfferProductSearchInput() {
  if (offerProductSearchDebounce) clearTimeout(offerProductSearchDebounce)
  offerProductSearchDebounce = setTimeout(() => void loadOfferProductOptions(), 300)
}

function offerHasProduct(productId: string) {
  return Boolean(automaticOfferDraft.value?.products.some((product) => product.id === productId))
}

function toggleOfferProduct(product: OfferProductOption) {
  const draft = automaticOfferDraft.value
  if (!draft) return
  const index = draft.products.findIndex((selected) => selected.id === product.id)
  if (index >= 0) draft.products.splice(index, 1)
  else draft.products.push({ ...product, pricingType: '', pricingValue: null, pricingLabel: '' })
}

function selectVisibleOfferProducts() {
  const draft = automaticOfferDraft.value
  if (!draft) return
  const selected = new Set(draft.products.map((product) => product.id))
  for (const product of offerProductOptions.value) {
    if (!selected.has(product.id)) {
      draft.products.push({ ...product, pricingType: '', pricingValue: null, pricingLabel: '' })
    }
  }
}

async function saveAutomaticOfferDraft() {
  const draft = automaticOfferDraft.value
  if (!draft || !isInternalUser.value || !user.value?.id) return
  const value = Math.floor(Number(draft.value))
  if (!draft.name.trim()) {
    automaticOfferMessage.value = 'Enter an offer name.'
    return
  }
  if (draft.type && (!(value > 0) || (draft.type === 'PERCENT' && value > MAX_OFFER_PERCENT))) {
    automaticOfferMessage.value = draft.type === 'PERCENT'
      ? `Enter a discount between 1 and ${MAX_OFFER_PERCENT}%.`
      : draft.type === 'FIXED_PRICE'
        ? 'Enter a fixed selling price greater than zero.'
        : 'Enter a discount amount greater than zero.'
    return
  }
  if (draft.scope === 'PRODUCTS' && !draft.products.length) {
    automaticOfferMessage.value = 'Select at least one product for this offer.'
    return
  }
  if (draft.scope === 'ALL_PRODUCTS' && !draft.type) {
    automaticOfferMessage.value = 'Choose default pricing for an organisation-wide offer.'
    return
  }
  if (draft.scope === 'PRODUCTS' && !draft.type && draft.products.some((product) => !product.pricingType)) {
    automaticOfferMessage.value = 'Choose default pricing or set a pricing rule for every selected product.'
    return
  }
  const invalidProduct = draft.products.find((product) => {
    const productValue = Math.floor(Number(product.pricingValue))
    return product.pricingType && (
      !(productValue > 0) ||
      (product.pricingType === 'PERCENT' && productValue > MAX_OFFER_PERCENT)
    )
  })
  if (invalidProduct) {
    automaticOfferMessage.value = `Enter a valid pricing value for ${invalidProduct.title}.`
    return
  }

  automaticOfferSavingId.value = draft.id || 'new'
  automaticOfferMessage.value = ''
  try {
    const res = await fetch(`${API_BASE}/api/internal?resource=offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.value.id,
        id: draft.id || undefined,
        name: draft.name,
        type: draft.type,
        value: draft.type ? value : null,
        label: draft.label,
        scope: draft.scope,
        startsAt: draft.startsAt,
        endsAt: draft.endsAt,
        active: draft.active,
        products: draft.scope === 'PRODUCTS'
          ? draft.products.map((product) => ({
              productId: product.id,
              pricingType: product.pricingType,
              pricingValue: product.pricingType ? Math.floor(Number(product.pricingValue)) : null,
              pricingLabel: product.pricingLabel,
            }))
          : [],
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to save the offer.')
    automaticOfferDraft.value = null
    invalidateProductsCache()
    await loadAutomaticOffers()
    automaticOfferMessage.value = 'Offer saved.'
  } catch (e) {
    automaticOfferMessage.value = e instanceof Error ? e.message : 'Unable to save the offer.'
  } finally {
    automaticOfferSavingId.value = ''
  }
}

async function deleteAutomaticOffer(row: AutomaticOfferDraft) {
  if (!isInternalUser.value || !user.value?.id || !row.id) return
  if (!window.confirm(`Delete the offer "${row.name}"? Existing orders keep their charged prices.`)) return
  automaticOfferSavingId.value = row.id
  automaticOfferMessage.value = ''
  try {
    const res = await fetch(`${API_BASE}/api/internal?resource=offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.value.id, action: 'delete', id: row.id }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to delete the offer.')
    if (automaticOfferDraft.value?.id === row.id) automaticOfferDraft.value = null
    invalidateProductsCache()
    await loadAutomaticOffers()
    automaticOfferMessage.value = 'Offer deleted.'
  } catch (e) {
    automaticOfferMessage.value = e instanceof Error ? e.message : 'Unable to delete the offer.'
  } finally {
    automaticOfferSavingId.value = ''
  }
}

function automaticOfferSummary(row: AutomaticOfferDraft) {
  const off = !row.type
    ? 'Individual product pricing'
    : row.type === 'PERCENT'
    ? `${row.value}% off`
    : row.type === 'FIXED_PRICE'
      ? `₹${Number(row.value).toLocaleString('en-IN')} default sale price`
      : `₹${Number(row.value).toLocaleString('en-IN')} off`
  const scope = row.scope === 'ALL_PRODUCTS'
    ? 'all products'
    : `${row.products.length} product${row.products.length === 1 ? '' : 's'}`
  const overrides = row.products.filter((product) => product.pricingType).length
  return `${off} · ${scope}${overrides ? ` · ${overrides} custom price${overrides === 1 ? '' : 's'}` : ''}`
}

// --- Promo codes ---

function promoRowToDraft(row: Record<string, unknown>): PromoCodeDraft {
  return {
    id: String(row?.id || ''),
    code: String(row?.code || ''),
    type: String(row?.type || '').toUpperCase() === 'AMOUNT' ? 'AMOUNT' : 'PERCENT',
    value: Number(row?.value) || null,
    minOrderPaise: Number(row?.minOrderPaise) || null,
    startsAt: String(row?.startsAt || ''),
    endsAt: String(row?.endsAt || ''),
    active: row?.active !== false,
  }
}

async function loadPromoCodes() {
  if (!isInternalUser.value || !user.value?.id) return
  promoLoading.value = true
  try {
    const res = await fetch(
      `${API_BASE}/api/internal?resource=promo-codes&userId=${encodeURIComponent(user.value.id)}`,
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to load promo codes.')
    const rows = Array.isArray(data?.promoCodes) ? data.promoCodes : []
    promoCodes.value = rows.map(promoRowToDraft)
  } catch (e) {
    promoMessage.value = e instanceof Error ? e.message : 'Unable to load promo codes.'
  } finally {
    promoLoading.value = false
  }
}

function startNewPromo() {
  promoDraft.value = blankPromoDraft()
  promoMessage.value = ''
}

function editPromo(row: PromoCodeDraft) {
  promoDraft.value = { ...row }
  promoMessage.value = ''
}

function cancelPromoDraft() {
  promoDraft.value = null
  promoMessage.value = ''
}

async function savePromoDraft() {
  const draft = promoDraft.value
  if (!draft || !isInternalUser.value || !user.value?.id) return
  promoSavingId.value = draft.id || 'new'
  promoMessage.value = ''
  try {
    const res = await fetch(`${API_BASE}/api/internal?resource=promo-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.value.id,
        id: draft.id || undefined,
        code: draft.code,
        type: draft.type,
        value: Number(draft.value) || 0,
        minOrderPaise: Number(draft.minOrderPaise) || 0,
        startsAt: draft.startsAt,
        endsAt: draft.endsAt,
        active: draft.active,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to save the promo code.')
    await loadPromoCodes()
    promoDraft.value = null
    promoMessage.value = 'Promo code saved.'
  } catch (e) {
    promoMessage.value = e instanceof Error ? e.message : 'Unable to save the promo code.'
  } finally {
    promoSavingId.value = ''
  }
}

async function deletePromo(row: PromoCodeDraft) {
  if (!isInternalUser.value || !user.value?.id || !row.id) return
  if (!window.confirm(`Delete the code "${row.code}"? Orders that already used it keep their record.`)) return
  promoSavingId.value = row.id
  promoMessage.value = ''
  try {
    const res = await fetch(`${API_BASE}/api/internal?resource=promo-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.value.id, action: 'delete', id: row.id }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to delete the promo code.')
    if (promoDraft.value?.id === row.id) promoDraft.value = null
    await loadPromoCodes()
    promoMessage.value = 'Promo code deleted.'
  } catch (e) {
    promoMessage.value = e instanceof Error ? e.message : 'Unable to delete the promo code.'
  } finally {
    promoSavingId.value = ''
  }
}

/** Plain-language summary of a code, so the table reads without decoding fields. */
function promoSummary(row: PromoCodeDraft) {
  const off = row.type === 'PERCENT' ? `${row.value}% off` : `₹${Number(row.value).toLocaleString('en-IN')} off`
  const min = row.minOrderPaise ? ` over ₹${Number(row.minOrderPaise).toLocaleString('en-IN')}` : ''
  const from = row.startsAt ? ` from ${row.startsAt}` : ''
  const to = row.endsAt ? ` until ${row.endsAt}` : ''
  return `${off}${min}${from}${to}`
}

async function onLogoFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  logoMessage.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    logoMessage.value = 'Please choose a PNG, JPG, or WEBP image.'
    if (input) input.value = ''
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    logoMessage.value = 'Please choose an image smaller than 8 MB.'
    if (input) input.value = ''
    return
  }
  try {
    logoUrl.value = await compressImageFile(file)
  } catch (e) {
    logoMessage.value = e instanceof Error ? e.message : 'Unable to read image.'
  } finally {
    if (input) input.value = ''
  }
}

function clearLogo() {
  logoUrl.value = ''
  logoMessage.value = ''
}

async function saveSiteConfig() {
  if (!isInternalUser.value || !user.value?.id) return
  logoSaving.value = true
  logoMessage.value = ''
  try {
    if (logoUrl.value && logoUrl.value.length > MAX_INLINE_IMAGE_LENGTH) {
      logoUrl.value = await compressDataUrl(logoUrl.value)
    }
    if (logoUrl.value && logoUrl.value.length > MAX_INLINE_IMAGE_LENGTH) {
      logoMessage.value =
        'The logo is too large to save even after compression. Please use a smaller image or an image URL.'
      return
    }
    const res = await fetch(`${API_BASE}/api/internal?resource=site-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.value.id, logoUrl: logoUrl.value }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to save branding settings.')
    logoUrl.value = String(data?.siteConfig?.logoUrl || '')
    invalidateSiteConfig()
    logoMessage.value = 'Branding saved.'
  } catch (e) {
    logoMessage.value = e instanceof Error ? e.message : 'Unable to save branding settings.'
  } finally {
    logoSaving.value = false
  }
}

function normalizeCollectionImagesForView(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const images: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const slug = String(key || '').trim()
    const url = typeof value === 'string' ? value.trim() : ''
    if (slug && url) images[slug] = url
  }
  return images
}

async function onCollectionImageFileChange(slug: string, event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  collectionImagesMessage.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    collectionImagesMessage.value = 'Please choose a JPG, PNG, WEBP, or AVIF image.'
    if (input) input.value = ''
    return
  }
  if (file.size > 15 * 1024 * 1024) {
    collectionImagesMessage.value = 'Please choose an image smaller than 15 MB.'
    if (input) input.value = ''
    return
  }
  collectionImagesUploading.value = true
  try {
    // Preferred path: upload the original to S3 and store its public URL;
    // fall back to a downscaled inline data URL when S3 isn't configured.
    const publicUrl = await uploadHomepageImageToS3(file, 'collection')
    if (publicUrl) {
      collectionImages.value = { ...collectionImages.value, [slug]: publicUrl }
      return
    }
    const dataUrl = await compressImageFile(file)
    if (dataUrl.length > MAX_INLINE_IMAGE_LENGTH) {
      collectionImagesMessage.value =
        'This image is too large to save even after compression. Please use a smaller image or paste an image URL instead.'
      return
    }
    collectionImages.value = { ...collectionImages.value, [slug]: dataUrl }
  } catch (error) {
    collectionImagesMessage.value = error instanceof Error ? error.message : 'Unable to read image.'
  } finally {
    collectionImagesUploading.value = false
    if (input) input.value = ''
  }
}

function setCollectionImageUrl(slug: string, value: string) {
  const next = { ...collectionImages.value }
  if (value.trim()) next[slug] = value
  else delete next[slug]
  collectionImages.value = next
}

function clearCollectionImage(slug: string) {
  const next = { ...collectionImages.value }
  delete next[slug]
  collectionImages.value = next
  collectionImagesMessage.value = ''
}

async function saveCollectionImages() {
  if (!isInternalUser.value || !user.value?.id) return
  collectionImagesSaving.value = true
  collectionImagesMessage.value = ''
  try {
    // Re-compress any oversized inline images so the request body stays under
    // the serverless payload limit; trim and drop blanks before saving.
    const payload: Record<string, string> = {}
    for (const link of collectionLinks) {
      let url = (collectionImages.value[link.slug] || '').trim()
      if (!url) continue
      if (url.length > MAX_INLINE_IMAGE_LENGTH) url = await compressDataUrl(url)
      payload[link.slug] = url
    }
    const oversized = Object.values(payload).some((url) => url.length > MAX_INLINE_IMAGE_LENGTH)
    if (oversized) {
      collectionImagesMessage.value =
        'An image is too large to save even after compression. Please replace it with a smaller image or an image URL.'
      return
    }
    const res = await fetch(`${API_BASE}/api/internal?resource=site-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.value.id, collectionImages: payload }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to save collection images.')
    collectionImages.value = normalizeCollectionImagesForView(data?.siteConfig?.collectionImages)
    invalidateSiteConfig()
    collectionImagesMessage.value = 'Collection images saved.'
  } catch (e) {
    collectionImagesMessage.value = e instanceof Error ? e.message : 'Unable to save collection images.'
  } finally {
    collectionImagesSaving.value = false
  }
}

// --- About Us page editor ---

function applyAboutContentToView(raw: unknown) {
  const src = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>
  const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  aboutHeroEyebrow.value = str(src.heroEyebrow)
  aboutHeroHeadline.value = str(src.heroHeadline)
  aboutHeroSubheadline.value = str(src.heroSubheadline)
  aboutJourney.value = Array.isArray(src.journey)
    ? (src.journey as Array<Record<string, unknown>>).map((entry) => ({
        year: str(entry?.year),
        place: str(entry?.place),
        title: str(entry?.title),
        desc: str(entry?.desc),
        imageUrl: str(entry?.imageUrl),
        active: entry?.active !== false,
      }))
    : []
  aboutTeam.value = Array.isArray(src.team)
    ? (src.team as Array<Record<string, unknown>>).map((entry) => ({
        name: str(entry?.name),
        role: str(entry?.role),
        imageUrl: str(entry?.imageUrl),
        active: entry?.active !== false,
      }))
    : []
}

function addAboutJourney() {
  aboutJourney.value.push({ year: '', place: '', title: '', desc: '', imageUrl: '', active: true })
  aboutMessage.value = ''
}

function removeAboutJourney(index: number) {
  aboutJourney.value.splice(index, 1)
}

function moveAboutJourney(index: number, direction: number) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= aboutJourney.value.length) return
  const next = [...aboutJourney.value]
  const [target] = next.splice(index, 1)
  if (!target) return
  next.splice(nextIndex, 0, target)
  aboutJourney.value = next
}

function addAboutTeam() {
  aboutTeam.value.push({ name: '', role: '', imageUrl: '', active: true })
  aboutMessage.value = ''
}

function removeAboutTeam(index: number) {
  aboutTeam.value.splice(index, 1)
}

function moveAboutTeam(index: number, direction: number) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= aboutTeam.value.length) return
  const next = [...aboutTeam.value]
  const [target] = next.splice(index, 1)
  if (!target) return
  next.splice(nextIndex, 0, target)
  aboutTeam.value = next
}

async function onAboutImageFileChange(kind: 'journey' | 'team', index: number, event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  aboutMessage.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    aboutMessage.value = 'Please choose a JPG, PNG, WEBP, or AVIF image.'
    if (input) input.value = ''
    return
  }
  if (file.size > 15 * 1024 * 1024) {
    aboutMessage.value = 'Please choose an image smaller than 15 MB.'
    if (input) input.value = ''
    return
  }
  const applyUrl = (url: string) => {
    if (kind === 'journey') {
      const next = [...aboutJourney.value]
      if (!next[index]) return
      next[index] = { ...next[index], imageUrl: url }
      aboutJourney.value = next
    } else {
      const next = [...aboutTeam.value]
      if (!next[index]) return
      next[index] = { ...next[index], imageUrl: url }
      aboutTeam.value = next
    }
  }
  aboutUploading.value = true
  try {
    // Preferred path: upload the original to S3 and store its public URL;
    // fall back to a downscaled inline data URL when S3 isn't configured.
    const publicUrl = await uploadHomepageImageToS3(file, 'about')
    if (publicUrl) {
      applyUrl(publicUrl)
      return
    }
    const dataUrl = await compressImageFile(file)
    if (dataUrl.length > MAX_INLINE_IMAGE_LENGTH) {
      aboutMessage.value =
        'This image is too large to save even after compression. Please use a smaller image or paste an image URL instead.'
      return
    }
    applyUrl(dataUrl)
  } catch (error) {
    aboutMessage.value = error instanceof Error ? error.message : 'Unable to read image.'
  } finally {
    aboutUploading.value = false
    if (input) input.value = ''
  }
}

async function saveAboutContent() {
  if (!isInternalUser.value || !user.value?.id) return
  aboutSaving.value = true
  aboutMessage.value = ''
  try {
    // Re-compress any oversized inline images so the request body stays under
    // the serverless payload limit; drop rows with no usable content.
    const journey = await Promise.all(
      aboutJourney.value
        .filter((step) => step.title.trim())
        .map(async (step) => ({
          ...step,
          imageUrl:
            step.imageUrl.length > MAX_INLINE_IMAGE_LENGTH
              ? await compressDataUrl(step.imageUrl)
              : step.imageUrl,
        })),
    )
    const team = await Promise.all(
      aboutTeam.value
        .filter((member) => member.name.trim() || member.imageUrl.trim())
        .map(async (member) => ({
          ...member,
          imageUrl:
            member.imageUrl.length > MAX_INLINE_IMAGE_LENGTH
              ? await compressDataUrl(member.imageUrl)
              : member.imageUrl,
        })),
    )
    const oversized = [...journey, ...team].some((entry) => entry.imageUrl.length > MAX_INLINE_IMAGE_LENGTH)
    if (oversized) {
      aboutMessage.value =
        'An image is too large to save even after compression. Please replace it with a smaller image or an image URL.'
      return
    }
    const res = await fetch(`${API_BASE}/api/internal?resource=site-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.value.id,
        aboutContent: {
          heroEyebrow: aboutHeroEyebrow.value,
          heroHeadline: aboutHeroHeadline.value,
          heroSubheadline: aboutHeroSubheadline.value,
          journey,
          team,
        },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Unable to save the About page.')
    applyAboutContentToView(data?.siteConfig?.aboutContent)
    invalidateSiteConfig()
    aboutMessage.value = 'About page saved.'
  } catch (e) {
    aboutMessage.value = e instanceof Error ? e.message : 'Unable to save the About page.'
  } finally {
    aboutSaving.value = false
  }
}

onMounted(() => {
  if (!isInternalUser.value) {
    router.replace('/')
    return
  }
  void loadOrders(true)
  void loadVideoCallBookings()
  void loadUsers(true)
  void loadProducts(true)
  void loadHomepageSlides()
  void loadSiteConfig()
  void loadAutomaticOffers()
  void loadPromoCodes()
  document.addEventListener('click', closeProductMoreOnOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeProductMoreOnOutsideClick)
})
</script>

<template>
  <section class="ect-min-h-screen ect-bg-[#f6efec] ect-pt-32 ect-pb-16">
    <div class="ect-max-w-7xl ect-mx-auto ect-px-5">
      <InternalWorkspaceTabs />

      <p v-if="error" class="ect-font-body ect-text-sm ect-text-red-600 ect-mb-4">{{ error }}</p>

      <section class="ect-bg-white ect-border ect-border-sand ect-rounded-lg ect-overflow-hidden">
        <div v-if="activeTabId === 'orders'" class="ect-overflow-x-auto">
          <div class="ect-flex ect-flex-wrap ect-items-center ect-gap-2 ect-border-b ect-border-sand ect-bg-cream ect-px-4 ect-py-3">
            <div class="ect-relative ect-w-full sm:ect-w-72">
              <svg class="ect-absolute ect-left-3 ect-top-1/2 -ect-translate-y-1/2 ect-w-4 ect-h-4 ect-text-charcoal/35" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/></svg>
              <input
                v-model="orderSearch"
                type="search"
                placeholder="Search orders…"
                class="ect-w-full ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-pl-9 ect-pr-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/35 focus:ect-border-gold-400 focus:ect-outline-none"
                @input="onOrderSearchInput"
              />
            </div>
            <button
              type="button"
              class="sm:ect-ml-auto ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors"
              @click="newOrderOpen = true"
            >
              New order
            </button>
          </div>
          <InternalNewOrderModal v-if="newOrderOpen" @close="newOrderOpen = false" @created="onOrderCreated" />
          <table class="ect-w-full ect-min-w-[980px] ect-border-collapse">
            <thead class="ect-bg-cream"><tr><th v-for="h in ['Order', 'Customer', 'Items', 'Status', 'Total', 'Created', 'Modified']" :key="h" class="ect-px-4 ect-py-3 ect-text-left ect-font-body ect-text-xs ect-uppercase ect-tracking-label ect-text-charcoal/45">{{ h }}</th></tr></thead>
            <tbody>
              <template v-if="orderListLoading">
                <tr v-for="index in skeletonRows" :key="index" class="ect-border-t ect-border-sand">
                  <td v-for="width in orderSkeletonWidths" :key="width" class="ect-px-4 ect-py-3">
                    <div class="ect-h-4 ect-rounded ect-bg-sand ect-animate-pulse" :class="width"></div>
                  </td>
                </tr>
              </template>
              <tr
                v-for="order in displayOrders"
                v-else
                :key="order.id"
                class="ect-cursor-pointer ect-border-t ect-border-sand hover:ect-bg-cream"
                tabindex="0"
                @click="openOrderDetail(order)"
                @keydown.enter="openOrderDetail(order)"
              >
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-semibold">
                  <RouterLink :to="{ name: 'internal-order', params: { id: order.id } }" class="ect-text-charcoal hover:ect-text-gold-700 hover:ect-underline" @click.stop>
                    {{ order.orderNo }}
                  </RouterLink>
                </td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/70">
                  <RouterLink
                    v-if="customerDetailPath(order)"
                    :to="customerDetailPath(order)!"
                    class="ect-text-charcoal hover:ect-text-gold-700 hover:ect-underline"
                    @click.stop
                  >
                    {{ order.customer }}
                  </RouterLink>
                  <span v-else>{{ order.customer }}</span>
                  <span class="ect-block ect-text-xs ect-text-charcoal/40">{{ order.customerEmail }}</span>
                </td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm">{{ order.itemCount }}</td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-capitalize">{{ order.status }}</td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-semibold">{{ order.total }}</td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/55">{{ formatDate(order.createdAt) }}<span class="ect-block ect-text-xs ect-text-charcoal/40">by {{ order.createdBy || '—' }}</span></td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/55">{{ order.modifiedAt ? formatDate(order.modifiedAt) : '—' }}<span v-if="order.modifiedBy" class="ect-block ect-text-xs ect-text-charcoal/40">by {{ order.modifiedBy }}</span></td>
              </tr>
              <tr v-if="!orderListLoading && !displayOrders.length" class="ect-border-t ect-border-sand">
                <td colspan="7" class="ect-px-4 ect-py-6 ect-font-body ect-text-sm ect-text-charcoal/45">No orders found.</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!orderListLoading && orders.length" class="ect-flex ect-flex-col ect-items-center ect-gap-3 ect-border-t ect-border-sand ect-px-4 ect-py-4">
            <p class="ect-font-body ect-text-xs ect-text-charcoal/45">Showing {{ orders.length }} of {{ orderTotal }}</p>
            <button
              v-if="orderHasMore"
              type="button"
              :disabled="orderLoadingMore"
              class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/15 ect-px-5 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-border-gold-400 hover:ect-text-gold-700 ect-transition-colors disabled:ect-opacity-50 disabled:ect-cursor-not-allowed"
              @click="loadOrders(false)"
            >
              {{ orderLoadingMore ? 'Loading…' : 'Load more' }}
            </button>
          </div>
        </div>

        <div v-else-if="activeTabId === 'quotes'" class="ect-overflow-x-auto">
          <div class="ect-flex ect-flex-wrap ect-items-center ect-gap-2 ect-border-b ect-border-sand ect-bg-cream ect-px-4 ect-py-3">
            <div class="ect-relative ect-w-full sm:ect-w-72">
              <svg class="ect-absolute ect-left-3 ect-top-1/2 -ect-translate-y-1/2 ect-w-4 ect-h-4 ect-text-charcoal/35" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/></svg>
              <input
                v-model="quoteSearch"
                type="search"
                placeholder="Search quotes…"
                class="ect-w-full ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-pl-9 ect-pr-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/35 focus:ect-border-gold-400 focus:ect-outline-none"
              />
            </div>
            <button
              type="button"
              class="sm:ect-ml-auto ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors"
              @click="newQuoteOpen = true"
            >
              New quote
            </button>
          </div>
          <InternalNewQuoteModal v-if="newQuoteOpen" @close="newQuoteOpen = false" @created="onQuoteCreated" />
          <table class="ect-w-full ect-min-w-[860px] ect-border-collapse">
            <thead class="ect-bg-cream">
              <tr>
                <th v-for="h in ['Quote', 'Customer', 'Items', 'Total', 'Status', 'Created']" :key="h" class="ect-px-4 ect-py-3 ect-text-left ect-font-body ect-text-xs ect-uppercase ect-tracking-label ect-text-charcoal/45">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="quote in filteredQuotes"
                :key="quote.id"
                class="ect-cursor-pointer ect-border-t ect-border-sand hover:ect-bg-cream"
                tabindex="0"
                @click="router.push({ name: 'internal-quote', params: { id: quote.id } })"
                @keydown.enter="router.push({ name: 'internal-quote', params: { id: quote.id } })"
              >
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-semibold">
                  <RouterLink :to="{ name: 'internal-quote', params: { id: quote.id } }" class="ect-text-charcoal hover:ect-text-gold-700 hover:ect-underline" @click.stop>{{ quote.id }}</RouterLink>
                </td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/70">
                  {{ quote.customerName }}
                  <span class="ect-block ect-text-xs ect-text-charcoal/40">{{ quote.customerEmail }}</span>
                </td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm">{{ quote.itemCount }}</td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-semibold">{{ quote.formattedTotal }}</td>
                <td class="ect-px-4 ect-py-3">
                  <span class="ect-rounded-full ect-px-2.5 ect-py-1 ect-font-body ect-text-xs ect-font-semibold ect-capitalize"
                    :class="{
 'ect-bg-amber-100 ect-text-amber-700': quote.status === 'pending',
                      'ect-bg-blue-100 ect-text-blue-700': quote.status === 'reviewing',
                      'ect-bg-purple-100 ect-text-purple-700': quote.status === 'quoted',
                      'ect-bg-emerald-100 ect-text-emerald-700': quote.status === 'accepted',
                    }"
                  >{{ quote.status }}</span>
                </td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/55">{{ formatDate(quote.createdAt) }}</td>
              </tr>
              <tr v-if="!filteredQuotes.length" class="ect-border-t ect-border-sand">
                <td colspan="6" class="ect-px-4 ect-py-6 ect-font-body ect-text-sm ect-text-charcoal/45">{{ quoteSearch.trim() ? 'No quotes match your search.' : 'No quotes yet.' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="activeTabId === 'video-calls'">
          <!-- Storefront settings for the consultation feature -->
          <section v-if="isAdminUser" class="ect-border-b ect-border-sand ect-p-4 sm:ect-p-5">
            <div class="ect-mb-4 ect-flex ect-flex-col ect-gap-3 sm:ect-flex-row sm:ect-items-center sm:ect-justify-between">
              <div>
                <p class="ect-mb-1 ect-font-body ect-text-micro ect-uppercase ect-tracking-label ect-text-gold-700">Storefront</p>
                <h2 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal">Video consultation settings</h2>
                <p class="ect-mt-1 ect-font-body ect-text-sm ect-text-charcoal/55">Controls the “Add to Video Call” option shoppers see on products, and how many pieces they can bring to one call.</p>
              </div>
              <button
                type="button"
                class="ect-inline-flex ect-shrink-0 ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors disabled:ect-opacity-60"
                :disabled="videoCallSettingsSaving || logoLoading"
                @click="saveVideoCallSettings"
              >
                {{ videoCallSettingsSaving ? 'Saving…' : 'Save settings' }}
              </button>
            </div>

            <p
              v-if="videoCallSettingsMessage"
              class="ect-mb-3 ect-font-body ect-text-sm"
              :class="videoCallSettingsMessage === 'Video-call settings saved.' ? 'ect-text-emerald-700' : 'ect-text-red-600'"
            >
              {{ videoCallSettingsMessage }}
            </p>

            <article class="ect-max-w-3xl ect-rounded-2xl ect-border ect-border-sand ect-bg-white ect-p-5 ect-space-y-5">
              <label class="ect-flex ect-items-center ect-gap-3 ect-cursor-pointer">
                <input v-model="videoCallEnabled" type="checkbox" class="ect-h-4 ect-w-4 ect-rounded ect-border-charcoal/25 ect-text-gold-700 focus:ect-ring-gold-400/40" />
                <span class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Offer video consultations on the storefront</span>
              </label>

              <div class="ect-grid ect-gap-4 sm:ect-grid-cols-3" :class="videoCallEnabled ? '' : 'ect-opacity-50 ect-pointer-events-none'">
                <label class="ect-grid ect-gap-1.5">
                  <span class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Consultation fee (₹)</span>
                  <input v-model.number="videoCallFee" type="number" min="0" step="100" class="ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                  <span class="ect-font-body ect-text-micro ect-text-charcoal/40">0 keeps the call free.</span>
                </label>
                <label class="ect-grid ect-gap-1.5">
                  <span class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Minimum product price (₹)</span>
                  <input v-model.number="videoCallMinPrice" type="number" min="0" step="1000" class="ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                  <span class="ect-font-body ect-text-micro ect-text-charcoal/40">Cheaper pieces don’t show the option. Price-on-request pieces always do.</span>
                </label>
                <label class="ect-grid ect-gap-1.5">
                  <span class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Max pieces per call</span>
                  <input v-model.number="videoCallMaxItems" type="number" min="1" max="20" step="1" class="ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                  <span class="ect-font-body ect-text-micro ect-text-charcoal/40">Between 1 and 20.</span>
                </label>
              </div>
            </article>
          </section>

          <div class="ect-flex ect-flex-wrap ect-items-center ect-gap-3 ect-border-b ect-border-sand ect-bg-cream ect-px-4 ect-py-3">
            <div class="ect-relative ect-w-full sm:ect-w-80">
              <input v-model="videoCallSearch" type="search" placeholder="Search video-call requests…" class="ect-w-full ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/35 focus:ect-border-gold-400 focus:ect-outline-none" />
            </div>
            <RouterLink to="/video-consultation" class="sm:ect-ml-auto ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir">Open request page</RouterLink>
          </div>
          <div class="ect-overflow-x-auto">
          <table class="ect-w-full ect-min-w-[1180px] ect-border-collapse">
            <thead class="ect-bg-cream"><tr><th v-for="heading in ['Reference', 'Requested', 'Customer', 'Contact', 'Pieces', 'Availability', 'Appointment', 'Status']" :key="heading" class="ect-px-4 ect-py-3 ect-text-left ect-font-body ect-text-xs ect-uppercase ect-tracking-label ect-text-charcoal/45">{{ heading }}</th></tr></thead>
            <tbody>
              <tr v-for="booking in filteredVideoCallBookings" :key="booking.reference" class="ect-border-t ect-border-sand ect-align-top">
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">{{ booking.reference }}</td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/50">{{ formatDate(booking.createdAt) }}</td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/70">{{ booking.name }}<span v-if="booking.notes" class="ect-mt-1 ect-block ect-max-w-[16rem] ect-text-xs ect-text-charcoal/45">“{{ booking.notes }}”</span></td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/70">
                  {{ booking.phone }}
                  <span class="ect-mt-0.5 ect-inline-flex ect-rounded-full ect-px-2 ect-py-0.5 ect-text-nano ect-font-semibold ect-uppercase ect-tracking-label" :class="booking.contactChannel === 'whatsapp' ? 'ect-bg-emerald-50 ect-text-emerald-700' : 'ect-bg-cream ect-text-charcoal/55'">{{ booking.contactChannel === 'whatsapp' ? 'WhatsApp' : 'Phone call' }}</span>
                  <span class="ect-block ect-text-xs ect-text-charcoal/40">{{ booking.email }}</span>
                </td>
                <td class="ect-max-w-xs ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/60">
                  <span v-if="!booking.items.length" class="ect-text-charcoal/35">No pieces</span>
                  <ul v-else class="ect-space-y-1">
                    <li v-for="item in booking.items" :key="item.slug" class="ect-flex ect-items-baseline ect-gap-2">
                      <RouterLink :to="`/internal/products/${item.slug}`" class="ect-truncate ect-text-charcoal hover:ect-text-gold-700 hover:ect-underline">{{ item.title || item.slug }}</RouterLink>
                      <span class="ect-shrink-0 ect-text-xs ect-text-charcoal/40">{{ item.price }}</span>
                    </li>
                  </ul>
                </td>
                <td class="ect-max-w-[12rem] ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/60">{{ booking.preferredTime || '—' }}</td>
                <td class="ect-px-4 ect-py-3">
                  <input
                    type="datetime-local"
                    :value="toLocalInputValue(booking.scheduledAt)"
                    class="ect-w-48 ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40"
                    @change="setVideoCallSchedule(booking, ($event.target as HTMLInputElement).value)"
                  />
                  <span class="ect-mt-1 ect-block ect-font-body ect-text-micro ect-text-charcoal/40">Your local time</span>
                </td>
                <td class="ect-w-36 ect-px-4 ect-py-3"><UiSelect :model-value="booking.status" :options="videoCallStatusOptions" @update:model-value="setVideoCallStatus(booking, $event)" /></td>
              </tr>
              <tr v-if="videoCallsLoading && !videoCallBookings.length" class="ect-border-t ect-border-sand"><td colspan="8" class="ect-px-4 ect-py-6 ect-font-body ect-text-sm ect-text-charcoal/45">Loading video-call requests…</td></tr>
              <tr v-else-if="videoCallsError" class="ect-border-t ect-border-sand"><td colspan="8" class="ect-px-4 ect-py-6 ect-font-body ect-text-sm ect-text-red-600">{{ videoCallsError }}</td></tr>
              <tr v-else-if="!filteredVideoCallBookings.length" class="ect-border-t ect-border-sand"><td colspan="8" class="ect-px-4 ect-py-6 ect-font-body ect-text-sm ect-text-charcoal/45">{{ videoCallSearch.trim() ? 'No video-call requests match your search.' : 'No video-call requests yet.' }}</td></tr>
            </tbody>
          </table>
          </div>
        </div>

        <div v-else-if="activeTabId === 'users'" class="ect-overflow-x-auto">
          <div class="ect-flex ect-flex-wrap ect-items-center ect-gap-2 ect-border-b ect-border-sand ect-bg-cream ect-px-4 ect-py-3">
            <div class="ect-relative ect-w-full sm:ect-w-72">
              <svg class="ect-absolute ect-left-3 ect-top-1/2 -ect-translate-y-1/2 ect-w-4 ect-h-4 ect-text-charcoal/35" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/></svg>
              <input
                v-model="userSearch"
                type="search"
                placeholder="Search users…"
                class="ect-w-full ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-pl-9 ect-pr-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/35 focus:ect-border-gold-400 focus:ect-outline-none"
                @input="onUserSearchInput"
              />
            </div>
            <button
              v-if="isAdminUser"
              type="button"
              class="sm:ect-ml-auto ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors"
              @click="newUserOpen = true"
            >
              New user
            </button>
          </div>
          <InternalNewUserModal v-if="newUserOpen" @close="newUserOpen = false" @created="onUserCreated" />
          <table class="ect-w-full ect-min-w-[940px] ect-border-collapse">
            <thead class="ect-bg-cream"><tr><th v-for="h in ['Name', 'Email', 'Type', 'Channel', 'Orders', 'Created', 'Modified']" :key="h" class="ect-px-4 ect-py-3 ect-text-left ect-font-body ect-text-xs ect-uppercase ect-tracking-label ect-text-charcoal/45">{{ h }}</th></tr></thead>
            <tbody>
              <template v-if="userListLoading">
                <tr v-for="index in skeletonRows" :key="index" class="ect-border-t ect-border-sand">
                  <td v-for="width in userSkeletonWidths" :key="width" class="ect-px-4 ect-py-3">
                    <div class="ect-h-4 ect-rounded ect-bg-sand ect-animate-pulse" :class="width"></div>
                  </td>
                </tr>
              </template>
              <tr v-for="row in users" v-else :key="row.id" class="ect-border-t ect-border-sand"><td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-semibold"><RouterLink :to="`/internal/users/${row.id}`" class="ect-text-charcoal hover:ect-text-gold-700 hover:ect-underline">{{ row.name }}</RouterLink></td><td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/60">{{ row.email }}</td><td class="ect-px-4 ect-py-3"><span class="ect-rounded-full ect-px-2.5 ect-py-1 ect-font-body ect-text-xs ect-font-semibold" :class="row.isAdmin ? 'ect-bg-gold-700 ect-text-white' : row.isInternal ? 'ect-bg-charcoal ect-text-white' : 'ect-bg-cream ect-text-charcoal/60'">{{ row.isAdmin ? 'Full Admin' : row.isInternal ? 'Internal' : 'Customer' }}</span></td><td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm">{{ row.channel }}</td><td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm">{{ row.orderCount }}</td><td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/55">{{ formatDate(row.createdAt) }}<span class="ect-block ect-text-xs ect-text-charcoal/40">by {{ row.createdBy || '—' }}</span></td><td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/55">{{ row.modifiedAt ? formatDate(row.modifiedAt) : '—' }}<span v-if="row.modifiedBy" class="ect-block ect-text-xs ect-text-charcoal/40">by {{ row.modifiedBy }}</span></td></tr>
              <tr v-if="!userListLoading && !users.length" class="ect-border-t ect-border-sand">
                <td colspan="7" class="ect-px-4 ect-py-6 ect-font-body ect-text-sm ect-text-charcoal/45">No users found.</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!userListLoading && users.length" class="ect-flex ect-flex-col ect-items-center ect-gap-3 ect-border-t ect-border-sand ect-px-4 ect-py-4">
            <p class="ect-font-body ect-text-xs ect-text-charcoal/45">Showing {{ users.length }} of {{ userTotal }}</p>
            <button
              v-if="userHasMore"
              type="button"
              :disabled="userLoadingMore"
              class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/15 ect-px-5 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-border-gold-400 hover:ect-text-gold-700 ect-transition-colors disabled:ect-opacity-50 disabled:ect-cursor-not-allowed"
              @click="loadUsers(false)"
            >
              {{ userLoadingMore ? 'Loading…' : 'Load more' }}
            </button>
          </div>
        </div>

        <div v-else-if="activeTabId === 'homepage'" class="ect-p-4 sm:ect-p-5">
          <div class="ect-mb-5 ect-flex ect-flex-col ect-gap-3 sm:ect-flex-row sm:ect-items-center sm:ect-justify-between">
            <div>
              <p class="ect-font-body ect-text-micro ect-uppercase ect-tracking-label ect-text-gold-700 ect-mb-1">Storefront hero</p>
              <div class="ect-flex ect-items-center ect-gap-2">
                <h2 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal">Homepage image carousel</h2>
                <span
                  class="ect-group ect-relative ect-inline-flex"
                  tabindex="0"
                  role="img"
                  aria-label="Recommended banner image specifications"
                >
                  <svg class="ect-h-5 ect-w-5 ect-cursor-help ect-text-charcoal/35 hover:ect-text-gold-700" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="8.25" stroke="currentColor" stroke-width="1.4" />
                    <circle cx="10" cy="6.4" r="1" fill="currentColor" />
                    <path d="M10 9v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                  </svg>
                  <span
                    class="ect-pointer-events-none ect-absolute ect-left-0 ect-top-full ect-z-30 ect-mt-2 ect-w-[20rem] ect-max-w-[80vw] ect-rounded-xl ect-border ect-border-charcoal/10 ect-bg-white ect-p-4 ect-text-left ect-font-body ect-text-charcoal/70 ect-opacity-0 ect-shadow-[0_18px_50px_-20px_rgba(0,0,0,0.45)] ect-transition-opacity ect-duration-150 group-hover:ect-opacity-100 group-focus-within:ect-opacity-100"
                  >
                    <span class="ect-mb-2 ect-block ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal">For crisp, undistorted banners</span>
                    <span class="ect-mb-2.5 ect-block ect-text-xs ect-leading-relaxed ect-text-charcoal/55">Images fill the banner without stretching. Match these proportions to keep artwork and text from being cropped.</span>
                    <span class="ect-block ect-space-y-1.5 ect-text-xs ect-leading-relaxed">
                      <span class="ect-flex ect-justify-between ect-gap-3"><span class="ect-text-charcoal/55">Desktop</span><span class="ect-font-semibold ect-text-charcoal">2500 × 1000 px · 5:2 landscape</span></span>
                      <span class="ect-flex ect-justify-between ect-gap-3"><span class="ect-text-charcoal/55">Mobile</span><span class="ect-font-semibold ect-text-charcoal">1000 × 1200 px · 5:6 portrait</span></span>
                      <span class="ect-flex ect-justify-between ect-gap-3"><span class="ect-text-charcoal/55">Format</span><span class="ect-font-semibold ect-text-charcoal">WebP, AVIF or JPEG</span></span>
                      <span class="ect-flex ect-justify-between ect-gap-3"><span class="ect-text-charcoal/55">File size</span><span class="ect-font-semibold ect-text-charcoal">up to 15 MB (≈1–2 MB ideal)</span></span>
                    </span>
                    <span class="ect-mt-2.5 ect-block ect-text-xs ect-leading-relaxed ect-text-charcoal/55">Images are hosted on S3, so you can upload full-quality exports — aim for ~1–2 MB so the hero still loads fast. Use sharp, high-resolution exports — never upscale a small image. Add a separate mobile image so phones get the portrait crop.</span>
                  </span>
                </span>
              </div>
              <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mt-1">Add and reorder image slides for the homepage. Add a mobile image for each slide. Where no active images are configured, the default PSG campaign is shown.</p>
            </div>
            <div class="ect-flex ect-flex-wrap ect-gap-2">
              <button
                type="button"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-gold-400 ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-gold-700 hover:ect-bg-cream ect-transition-colors"
                @click="addHomepageSlide"
              >
                Add slide
              </button>
              <button
                type="button"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors disabled:ect-opacity-60"
                :disabled="homepageSaving || homepageUploading"
                @click="saveHomepageSlides"
              >
                {{ homepageSaving ? 'Saving…' : 'Save homepage' }}
              </button>
            </div>
          </div>

          <p
            v-if="homepageUploading"
            class="ect-mb-4 ect-font-body ect-text-sm ect-text-charcoal/55"
          >
            Uploading image…
          </p>
          <p
            v-else-if="homepageMessage"
            class="ect-mb-4 ect-font-body ect-text-sm"
            :class="homepageMessage === 'Homepage slides saved.' ? 'ect-text-emerald-700' : 'ect-text-red-600'"
          >
            {{ homepageMessage }}
          </p>

          <div v-if="homepageLoading" class="ect-grid ect-gap-4 lg:ect-grid-cols-2">
            <div v-for="index in 2" :key="index" class="ect-h-72 ect-rounded-2xl ect-bg-cream ect-animate-pulse" />
          </div>

          <div v-else-if="homepageSlides.length" ref="homepageGrid" class="ect-grid ect-gap-4 lg:ect-grid-cols-2">
            <article
              v-for="(slide, index) in homepageSlides"
              :key="slide.id || `homepage-${index}`"
              class="ect-overflow-hidden ect-rounded-2xl ect-border ect-border-sand ect-bg-white"
            >
              <div class="ect-bg-charcoal/5 ect-p-3">
                <div class="ect-mb-2 ect-flex ect-items-center ect-justify-between">
                  <span class="ect-inline-flex ect-items-center ect-gap-2 ect-rounded-full ect-bg-white/90 ect-px-3 ect-py-1 ect-font-body ect-text-micro ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal">
                    Slide {{ index + 1 }}
                  </span>
                  <span
                    v-if="slide.device && slide.device !== 'all'"
                    class="ect-inline-flex ect-items-center ect-gap-2 ect-rounded-full ect-bg-charcoal/85 ect-px-3 ect-py-1 ect-font-body ect-text-micro ect-font-semibold ect-uppercase ect-tracking-label ect-text-white">
                    {{ slide.device === 'mobile' ? 'Mobile only' : 'Desktop only' }}
                  </span>
                </div>
                <div class="ect-flex ect-gap-3">
                  <div class="ect-flex-1 ect-min-w-0">
                    <span class="ect-mb-1 ect-block ect-font-body ect-text-nano ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Desktop</span>
                    <div class="ect-relative ect-aspect-[16/10] ect-overflow-hidden ect-rounded-xl ect-bg-charcoal/10">
                      <img
                        v-if="slide.imageUrl"
                        :src="slide.imageUrl"
                        :alt="slide.headline || `Homepage slide ${index + 1} desktop`"
                        class="ect-h-full ect-w-full ect-object-cover"
                      />
                      <div v-else class="ect-flex ect-h-full ect-items-center ect-justify-center ect-px-2 ect-text-center ect-font-body ect-text-xs ect-text-charcoal/40">
                        Add desktop image
                      </div>
                    </div>
                  </div>
                  <div class="ect-w-24 ect-shrink-0 sm:ect-w-28">
                    <span class="ect-mb-1 ect-block ect-font-body ect-text-nano ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Mobile</span>
                    <div class="ect-relative ect-aspect-[5/6] ect-overflow-hidden ect-rounded-xl ect-bg-charcoal/10">
                      <img
                        v-if="slide.mobileImageUrl"
                        :src="slide.mobileImageUrl"
                        :alt="slide.headline || `Homepage slide ${index + 1} mobile`"
                        class="ect-h-full ect-w-full ect-object-cover"
                      />
                      <div v-else class="ect-flex ect-h-full ect-items-center ect-justify-center ect-px-2 ect-text-center ect-font-body ect-text-xs ect-text-charcoal/40">
                        Add mobile image
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="ect-space-y-4 ect-p-4">
                <div class="ect-flex ect-flex-wrap ect-gap-2">
                  <label class="ect-inline-flex ect-cursor-pointer ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-gold-400 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-gold-700 hover:ect-bg-cream">
                    Upload desktop image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      class="ect-hidden"
                      @change="onHomepageSlideFileChange(index, $event, 'desktop')"
                    />
                  </label>
                  <label class="ect-inline-flex ect-cursor-pointer ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-gold-400 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-gold-700 hover:ect-bg-cream">
                    Upload mobile image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif"
                      class="ect-hidden"
                      @change="onHomepageSlideFileChange(index, $event, 'mobile')"
                    />
                  </label>
                </div>

                <label class="ect-block">
                  <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Desktop image URL</span>
                  <input v-model="slide.imageUrl" type="text" placeholder="https://…" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                </label>

                <label class="ect-block">
                  <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Mobile image URL <span class="ect-normal-case ect-font-normal ect-text-charcoal/35">(optional)</span></span>
                  <input v-model="slide.mobileImageUrl" type="text" placeholder="https://…" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                </label>

                <div class="ect-grid ect-gap-4 sm:ect-grid-cols-2">
                  <label class="ect-block">
                    <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Headline</span>
                    <input v-model="slide.headline" type="text" placeholder="Optional headline" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                  </label>
                  <label class="ect-block">
                    <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">CTA label</span>
                    <input v-model="slide.ctaLabel" type="text" placeholder="Explore now" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                  </label>
                </div>

                <label class="ect-block">
                  <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Subheadline</span>
                  <textarea v-model="slide.subheadline" rows="3" placeholder="Optional supporting copy" class="ect-w-full ect-resize-none ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40"></textarea>
                </label>

                <label class="ect-block">
                  <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">CTA link</span>
                  <input v-model="slide.ctaHref" type="text" placeholder="/collections or https://…" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                </label>

                <label class="ect-block">
                  <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Show on</span>
                  <select v-model="slide.device" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40">
                    <option value="all">All devices</option>
                    <option value="desktop">Desktop only</option>
                    <option value="mobile">Mobile only</option>
                  </select>
                </label>

                <div class="ect-flex ect-flex-wrap ect-items-center ect-justify-between ect-gap-3 ect-border-t ect-border-sand ect-pt-4">
                  <label class="ect-inline-flex ect-items-center ect-gap-2 ect-font-body ect-text-sm ect-text-charcoal">
                    <input v-model="slide.active" type="checkbox" class="ect-h-4 ect-w-4 ect-rounded ect-border-gold-400 ect-text-gold-700 focus:ect-ring-gold-400" />
                    Active on homepage
                  </label>
                  <div class="ect-flex ect-flex-wrap ect-gap-2">
                    <button type="button" class="ect-rounded-full ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 hover:ect-border-gold-400 hover:ect-text-gold-700" :disabled="index === 0" @click="moveHomepageSlide(index, -1)">Move up</button>
                    <button type="button" class="ect-rounded-full ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 hover:ect-border-gold-400 hover:ect-text-gold-700" :disabled="index === homepageSlides.length - 1" @click="moveHomepageSlide(index, 1)">Move down</button>
                    <button type="button" class="ect-rounded-full ect-border ect-border-red-200 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-red-600 hover:ect-bg-red-50" @click="removeHomepageSlide(index)">Remove</button>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="ect-rounded-2xl ect-border ect-border-dashed ect-border-sand ect-bg-cream ect-p-10 ect-text-center">
            <p class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal">No homepage slides yet</p>
            <p class="ect-mt-2 ect-font-body ect-text-sm ect-text-charcoal/55">Add your first full-screen image and it will replace the default storefront hero.</p>
            <button
              type="button"
              class="ect-mt-5 ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-5 ect-py-2.5 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors"
              @click="addHomepageSlide"
            >
              Add first slide
            </button>
          </div>

          <!-- Shop by Collection tile images -->
          <div class="ect-mt-10 ect-border-t ect-border-sand ect-pt-8">
            <div class="ect-mb-5 ect-flex ect-flex-col ect-gap-3 sm:ect-flex-row sm:ect-items-center sm:ect-justify-between">
              <div>
                <p class="ect-font-body ect-text-micro ect-uppercase ect-tracking-label ect-text-gold-700 ect-mb-1">Storefront grid</p>
                <h2 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal">Shop by Collection images</h2>
                <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mt-1">Set an image for each collection tile on the homepage grid. Tiles left blank keep the default gold placeholder. Landscape images around 700 × 500 px (7:5) look best.</p>
              </div>
              <button
                type="button"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors disabled:ect-opacity-60"
                :disabled="collectionImagesSaving || collectionImagesUploading"
                @click="saveCollectionImages"
              >
                {{ collectionImagesSaving ? 'Saving…' : 'Save collection images' }}
              </button>
            </div>

            <p
              v-if="collectionImagesUploading"
              class="ect-mb-4 ect-font-body ect-text-sm ect-text-charcoal/55"
            >
              Uploading image…
            </p>
            <p
              v-else-if="collectionImagesMessage"
              class="ect-mb-4 ect-font-body ect-text-sm"
              :class="collectionImagesMessage === 'Collection images saved.' ? 'ect-text-emerald-700' : 'ect-text-red-600'"
            >
              {{ collectionImagesMessage }}
            </p>

            <div class="ect-grid ect-gap-4 sm:ect-grid-cols-2 lg:ect-grid-cols-3">
              <article
                v-for="link in collectionLinks"
                :key="link.slug"
                class="ect-overflow-hidden ect-rounded-2xl ect-border ect-border-sand ect-bg-white"
              >
                <div class="ect-relative ect-aspect-[7/5] ect-bg-charcoal/10">
                  <img
                    v-if="collectionImages[link.slug]"
                    :src="collectionImages[link.slug]"
                    :alt="`${link.title} tile`"
                    class="ect-h-full ect-w-full ect-object-cover"
                  />
                  <div v-else class="ect-flex ect-h-full ect-items-center ect-justify-center ect-px-2 ect-text-center ect-font-body ect-text-xs ect-text-charcoal/40">
                    No image — placeholder shown
                  </div>
                  <span class="ect-pointer-events-none ect-absolute ect-bottom-2 ect-left-2 ect-rounded-full ect-bg-white/90 ect-px-3 ect-py-1 ect-font-body ect-text-micro ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal">
                    {{ link.title }}
                  </span>
                </div>
                <div class="ect-space-y-3 ect-p-3">
                  <div class="ect-flex ect-flex-wrap ect-gap-2">
                    <label class="ect-inline-flex ect-cursor-pointer ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-gold-400 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-gold-700 hover:ect-bg-cream">
                      Upload image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        class="ect-hidden"
                        @change="onCollectionImageFileChange(link.slug, $event)"
                      />
                    </label>
                    <button
                      v-if="collectionImages[link.slug]"
                      type="button"
                      class="ect-rounded-full ect-border ect-border-red-200 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-red-600 hover:ect-bg-red-50"
                      @click="clearCollectionImage(link.slug)"
                    >
                      Remove
                    </button>
                  </div>
                  <label class="ect-block">
                    <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Image URL</span>
                    <input
                      :value="collectionImages[link.slug] || ''"
                      type="text"
                      placeholder="https://…"
                      class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40"
                      @input="setCollectionImageUrl(link.slug, ($event.target as HTMLInputElement).value)"
                    />
                  </label>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div v-else-if="activeTabId === 'about'" class="ect-p-4 sm:ect-p-5">
          <div class="ect-mb-5 ect-flex ect-flex-col ect-gap-3 sm:ect-flex-row sm:ect-items-center sm:ect-justify-between">
            <div>
              <p class="ect-font-body ect-text-micro ect-uppercase ect-tracking-label ect-text-gold-700 ect-mb-1">Storefront page</p>
              <h2 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal">About Us page</h2>
              <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mt-1">Configure the hero copy, journey milestones, and team portraits shown on the About page. Use real group and founder photos — landscape ~1200 × 900 px (4:3) for milestones, portrait ~900 × 1200 px (3:4) for people. Fields left blank keep the built-in defaults.</p>
            </div>
            <button
              type="button"
              class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors disabled:ect-opacity-60"
              :disabled="aboutSaving || aboutUploading"
              @click="saveAboutContent"
            >
              {{ aboutSaving ? 'Saving…' : 'Save About page' }}
            </button>
          </div>

          <p v-if="aboutUploading" class="ect-mb-4 ect-font-body ect-text-sm ect-text-charcoal/55">Uploading image…</p>
          <p
            v-else-if="aboutMessage"
            class="ect-mb-4 ect-font-body ect-text-sm"
            :class="aboutMessage === 'About page saved.' ? 'ect-text-emerald-700' : 'ect-text-red-600'"
          >
            {{ aboutMessage }}
          </p>

          <!-- Hero copy -->
          <div class="ect-rounded-2xl ect-border ect-border-sand ect-bg-white ect-p-4 ect-mb-8">
            <p class="ect-font-body ect-text-micro ect-uppercase ect-tracking-label ect-text-charcoal/45 ect-mb-3">Hero copy</p>
            <div class="ect-grid ect-gap-4 sm:ect-grid-cols-2">
              <label class="ect-block">
                <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Eyebrow</span>
                <input v-model="aboutHeroEyebrow" type="text" placeholder="PSG · Bangkok" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
              </label>
              <label class="ect-block">
                <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Headline</span>
                <input v-model="aboutHeroHeadline" type="text" placeholder="Brilliance by Design" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
              </label>
            </div>
            <label class="ect-block ect-mt-4">
              <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Subheadline</span>
              <textarea v-model="aboutHeroSubheadline" rows="2" placeholder="Reinventing fine jewellery with precision, craftsmanship and stories told in every stone." class="ect-w-full ect-resize-none ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40"></textarea>
            </label>
          </div>

          <!-- Journey milestones -->
          <div class="ect-mb-3 ect-flex ect-items-center ect-justify-between">
            <div>
              <p class="ect-font-body ect-text-micro ect-uppercase ect-tracking-label ect-text-charcoal/45">Journey milestones</p>
              <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mt-1">Shown as alternating photo + story rows. Add your group photos here — until a milestone is added, the page shows the built-in three (Bangkok → Our craft → The PSG experience).</p>
            </div>
            <button
              type="button"
              class="ect-shrink-0 ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-gold-400 ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-gold-700 hover:ect-bg-cream ect-transition-colors"
              @click="addAboutJourney"
            >
              Add milestone
            </button>
          </div>

          <div v-if="aboutJourney.length" class="ect-grid ect-gap-4 lg:ect-grid-cols-2 ect-mb-8">
            <article
              v-for="(step, index) in aboutJourney"
              :key="`about-journey-${index}`"
              class="ect-overflow-hidden ect-rounded-2xl ect-border ect-border-sand ect-bg-white"
            >
              <div class="ect-relative ect-aspect-[4/3] ect-bg-charcoal/10">
                <img v-if="step.imageUrl" :src="step.imageUrl" :alt="step.title || `Milestone ${index + 1}`" class="ect-h-full ect-w-full ect-object-cover" />
                <div v-else class="ect-flex ect-h-full ect-items-center ect-justify-center ect-px-2 ect-text-center ect-font-body ect-text-xs ect-text-charcoal/40">
                  Add a group / workshop photo (4:3)
                </div>
                <span class="ect-pointer-events-none ect-absolute ect-bottom-2 ect-left-2 ect-rounded-full ect-bg-white/90 ect-px-3 ect-py-1 ect-font-body ect-text-micro ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal">
                  Milestone {{ index + 1 }}
                </span>
              </div>
              <div class="ect-space-y-4 ect-p-4">
                <div class="ect-flex ect-flex-wrap ect-gap-2">
                  <label class="ect-inline-flex ect-cursor-pointer ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-gold-400 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-gold-700 hover:ect-bg-cream">
                    Upload photo
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" class="ect-hidden" @change="onAboutImageFileChange('journey', index, $event)" />
                  </label>
                </div>
                <label class="ect-block">
                  <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Image URL</span>
                  <input v-model="step.imageUrl" type="text" placeholder="https://…" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                </label>
                <div class="ect-grid ect-gap-4 sm:ect-grid-cols-2">
                  <label class="ect-block">
                    <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Year</span>
                    <input v-model="step.year" type="text" placeholder="2024" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                  </label>
                  <label class="ect-block">
                    <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Place</span>
                    <input v-model="step.place" type="text" placeholder="Bangkok" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                  </label>
                </div>
                <label class="ect-block">
                  <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Title <span class="ect-text-red-500">*</span></span>
                  <input v-model="step.title" type="text" placeholder="Jewelet" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                </label>
                <label class="ect-block">
                  <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Story</span>
                  <textarea v-model="step.desc" rows="3" placeholder="What happened at this point in the journey…" class="ect-w-full ect-resize-none ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40"></textarea>
                </label>
                <div class="ect-flex ect-flex-wrap ect-items-center ect-justify-between ect-gap-3 ect-border-t ect-border-sand ect-pt-4">
                  <label class="ect-inline-flex ect-items-center ect-gap-2 ect-font-body ect-text-sm ect-text-charcoal">
                    <input v-model="step.active" type="checkbox" class="ect-h-4 ect-w-4 ect-rounded ect-border-gold-400 ect-text-gold-700 focus:ect-ring-gold-400" />
                    Visible on page
                  </label>
                  <div class="ect-flex ect-flex-wrap ect-gap-2">
                    <button type="button" class="ect-rounded-full ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 hover:ect-border-gold-400 hover:ect-text-gold-700" :disabled="index === 0" @click="moveAboutJourney(index, -1)">Move up</button>
                    <button type="button" class="ect-rounded-full ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 hover:ect-border-gold-400 hover:ect-text-gold-700" :disabled="index === aboutJourney.length - 1" @click="moveAboutJourney(index, 1)">Move down</button>
                    <button type="button" class="ect-rounded-full ect-border ect-border-red-200 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-red-600 hover:ect-bg-red-50" @click="removeAboutJourney(index)">Remove</button>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="ect-rounded-2xl ect-border ect-border-dashed ect-border-sand ect-bg-cream ect-p-8 ect-text-center ect-mb-8">
            <p class="ect-font-body ect-text-sm ect-text-charcoal/55">No custom milestones yet — the storefront shows the built-in journey. Add one to replace it with your own photos and story.</p>
          </div>

          <!-- Team / founders -->
          <div class="ect-border-t ect-border-sand ect-pt-8">
            <div class="ect-mb-3 ect-flex ect-items-center ect-justify-between">
              <div>
                <p class="ect-font-body ect-text-micro ect-uppercase ect-tracking-label ect-text-charcoal/45">Founders &amp; team</p>
                <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mt-1">Portrait cards shown in a "The people behind Jewelet" section. The section stays hidden until at least one person is added.</p>
              </div>
              <button
                type="button"
                class="ect-shrink-0 ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-gold-400 ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-gold-700 hover:ect-bg-cream ect-transition-colors"
                @click="addAboutTeam"
              >
                Add person
              </button>
            </div>

            <div v-if="aboutTeam.length" class="ect-grid ect-gap-4 sm:ect-grid-cols-2 lg:ect-grid-cols-3">
              <article
                v-for="(member, index) in aboutTeam"
                :key="`about-team-${index}`"
                class="ect-overflow-hidden ect-rounded-2xl ect-border ect-border-sand ect-bg-white"
              >
                <div class="ect-relative ect-aspect-[3/4] ect-max-h-64 ect-w-full ect-bg-charcoal/10">
                  <img v-if="member.imageUrl" :src="member.imageUrl" :alt="member.name || `Team member ${index + 1}`" class="ect-h-full ect-w-full ect-object-cover" />
                  <div v-else class="ect-flex ect-h-full ect-items-center ect-justify-center ect-px-2 ect-text-center ect-font-body ect-text-xs ect-text-charcoal/40">
                    Add a portrait photo (3:4)
                  </div>
                </div>
                <div class="ect-space-y-4 ect-p-4">
                  <div class="ect-flex ect-flex-wrap ect-gap-2">
                    <label class="ect-inline-flex ect-cursor-pointer ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-gold-400 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-gold-700 hover:ect-bg-cream">
                      Upload portrait
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" class="ect-hidden" @change="onAboutImageFileChange('team', index, $event)" />
                    </label>
                  </div>
                  <label class="ect-block">
                    <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Image URL</span>
                    <input v-model="member.imageUrl" type="text" placeholder="https://…" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                  </label>
                  <div class="ect-grid ect-gap-4 sm:ect-grid-cols-2">
                    <label class="ect-block">
                      <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Name</span>
                      <input v-model="member.name" type="text" placeholder="Full name" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                    </label>
                    <label class="ect-block">
                      <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Role</span>
                      <input v-model="member.role" type="text" placeholder="Co-founder" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                    </label>
                  </div>
                  <div class="ect-flex ect-flex-wrap ect-items-center ect-justify-between ect-gap-3 ect-border-t ect-border-sand ect-pt-4">
                    <label class="ect-inline-flex ect-items-center ect-gap-2 ect-font-body ect-text-sm ect-text-charcoal">
                      <input v-model="member.active" type="checkbox" class="ect-h-4 ect-w-4 ect-rounded ect-border-gold-400 ect-text-gold-700 focus:ect-ring-gold-400" />
                      Visible on page
                    </label>
                    <div class="ect-flex ect-flex-wrap ect-gap-2">
                      <button type="button" class="ect-rounded-full ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 hover:ect-border-gold-400 hover:ect-text-gold-700" :disabled="index === 0" @click="moveAboutTeam(index, -1)">Move up</button>
                      <button type="button" class="ect-rounded-full ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 hover:ect-border-gold-400 hover:ect-text-gold-700" :disabled="index === aboutTeam.length - 1" @click="moveAboutTeam(index, 1)">Move down</button>
                      <button type="button" class="ect-rounded-full ect-border ect-border-red-200 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-red-600 hover:ect-bg-red-50" @click="removeAboutTeam(index)">Remove</button>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <div v-else class="ect-rounded-2xl ect-border ect-border-dashed ect-border-sand ect-bg-cream ect-p-8 ect-text-center">
              <p class="ect-font-body ect-text-sm ect-text-charcoal/55">No people added yet — the "People behind Jewelet" section is hidden on the storefront until you add someone.</p>
            </div>
          </div>
        </div>

        <div v-else-if="activeTabId === 'branding'" class="ect-p-4 sm:ect-p-5">
          <div class="ect-mb-5 ect-flex ect-flex-col ect-gap-3 sm:ect-flex-row sm:ect-items-center sm:ect-justify-between">
            <div>
              <p class="ect-font-body ect-text-micro ect-uppercase ect-tracking-label ect-text-gold-700 ect-mb-1">Storefront identity</p>
              <h2 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal">Site logo</h2>
              <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mt-1">Upload a logo or paste an image URL. It replaces the logo in the header and footer across the storefront. If left empty, the bundled default logo is used.</p>
            </div>
            <div class="ect-flex ect-flex-wrap ect-gap-2">
              <button
                type="button"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors disabled:ect-opacity-60"
                :disabled="logoSaving || logoLoading"
                @click="saveSiteConfig"
              >
                {{ logoSaving ? 'Saving…' : 'Save branding' }}
              </button>
            </div>
          </div>

          <p
            v-if="logoMessage"
            class="ect-mb-4 ect-font-body ect-text-sm"
            :class="logoMessage === 'Branding saved.' ? 'ect-text-emerald-700' : 'ect-text-red-600'"
          >
            {{ logoMessage }}
          </p>

          <div v-if="logoLoading" class="ect-h-40 ect-max-w-md ect-rounded-2xl ect-bg-cream ect-animate-pulse" />

          <article v-else class="ect-max-w-md ect-overflow-hidden ect-rounded-2xl ect-border ect-border-sand ect-bg-white">
            <div class="ect-flex ect-items-center ect-justify-center ect-bg-charcoal/5 ect-p-8">
              <img :src="logoPreviewSrc" alt="Logo preview" class="ect-h-14 ect-w-auto ect-max-w-full ect-object-contain" />
            </div>
            <div class="ect-space-y-4 ect-p-4">
              <div class="ect-flex ect-flex-wrap ect-gap-2">
                <label class="ect-inline-flex ect-cursor-pointer ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-gold-400 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-gold-700 hover:ect-bg-cream">
                  Upload logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    class="ect-hidden"
                    @change="onLogoFileChange"
                  />
                </label>
                <button
                  v-if="logoUrl"
                  type="button"
                  class="ect-rounded-full ect-border ect-border-red-200 ect-px-3 ect-py-2 ect-font-body ect-text-xs ect-font-semibold ect-text-red-600 hover:ect-bg-red-50"
                  @click="clearLogo"
                >
                  Reset to default
                </button>
              </div>

              <label class="ect-block">
                <span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Logo image URL</span>
                <input v-model="logoUrl" type="text" placeholder="https://… or upload above" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-4 ect-py-2.5 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
              </label>
            </div>
          </article>
        </div>

        <div v-else-if="activeTabId === 'offers'" class="ect-p-4 sm:ect-p-5 ect-space-y-8">

          <!-- Automatic catalog offers can target the whole organisation or a
               selected set. One selected product is the single-product case. -->
          <section>
            <div class="ect-mb-5 ect-flex ect-flex-col ect-gap-3 sm:ect-flex-row sm:ect-items-center sm:ect-justify-between">
              <div>
                <p class="ect-font-body ect-text-micro ect-uppercase ect-tracking-label ect-text-gold-700 ect-mb-1">Pricing</p>
                <h2 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal">Automatic offers</h2>
                <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mt-1">Discount the whole catalog, one product, or a selected group. If campaigns overlap, the offer giving the shopper the lowest price wins.</p>
              </div>
              <button
                type="button"
                class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors disabled:ect-opacity-60"
                :disabled="automaticOffersLoading || Boolean(automaticOfferDraft)"
                @click="startNewAutomaticOffer"
              >
                + New offer
              </button>
            </div>

            <p
              v-if="automaticOfferMessage"
              class="ect-mb-4 ect-font-body ect-text-sm"
              :class="automaticOfferMessage.endsWith('saved.') || automaticOfferMessage.endsWith('deleted.') ? 'ect-text-emerald-700' : 'ect-text-red-600'"
            >
              {{ automaticOfferMessage }}
            </p>

            <article v-if="automaticOfferDraft" class="ect-mb-5 ect-max-w-6xl ect-rounded-2xl ect-border ect-border-gold-400 ect-bg-white ect-p-5 ect-space-y-5">
              <div class="ect-grid ect-grid-cols-1 sm:ect-grid-cols-2 ect-gap-4">
                <label class="ect-block">
                  <span class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45 ect-block ect-mb-2">Offer name</span>
                  <input v-model="automaticOfferDraft.name" type="text" maxlength="100" placeholder="Old collection clearance" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                </label>
                <label class="ect-block">
                  <span class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45 ect-block ect-mb-2">Storefront label (optional)</span>
                  <input v-model="automaticOfferDraft.label" type="text" maxlength="60" placeholder="Clearance · 80% off" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                </label>
                <div>
                  <span class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45 ect-block ect-mb-2">Default product pricing</span>
                  <div class="ect-flex ect-items-center ect-gap-2">
                    <select v-model="automaticOfferDraft.type" class="ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40">
                      <option v-if="automaticOfferDraft.scope === 'PRODUCTS'" value="">No default — price each product</option>
                      <option value="PERCENT">Percentage off</option>
                      <option value="AMOUNT">Rupees off</option>
                      <option value="FIXED_PRICE">Fixed selling price</option>
                    </select>
                    <input v-model.number="automaticOfferDraft.value" type="number" min="1" :max="automaticOfferDraft.type === 'PERCENT' ? MAX_OFFER_PERCENT : undefined" step="1" :disabled="!automaticOfferDraft.type" :placeholder="automaticOfferDraft.type === 'PERCENT' ? '%' : '₹'" class="ect-w-28 ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal disabled:ect-bg-charcoal/5 disabled:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                  </div>
                  <p class="ect-mt-2 ect-font-body ect-text-micro ect-text-charcoal/40">Selected products can override this default individually below.</p>
                </div>
                <div>
                  <span class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45 ect-block ect-mb-2">Applies to</span>
                  <select v-model="automaticOfferDraft.scope" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40">
                    <option value="ALL_PRODUCTS">All products (organisation-wide)</option>
                    <option value="PRODUCTS">Selected products</option>
                  </select>
                </div>
                <label class="ect-block">
                  <span class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45 ect-block ect-mb-2">Starts (optional)</span>
                  <input v-model="automaticOfferDraft.startsAt" type="date" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                </label>
                <label class="ect-block">
                  <span class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45 ect-block ect-mb-2">Ends (optional)</span>
                  <input v-model="automaticOfferDraft.endsAt" type="date" class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                </label>
              </div>

              <section v-if="automaticOfferDraft.scope === 'PRODUCTS'" class="ect-rounded-2xl ect-bg-cream/70 ect-p-4 ect-space-y-3">
                <div class="ect-flex ect-flex-col lg:ect-flex-row ect-gap-2">
                  <input v-model="offerProductSearch" type="search" placeholder="Search name, SKU, category or material…" class="ect-min-w-0 ect-flex-1 ect-rounded-xl ect-border ect-border-charcoal/15 ect-bg-white ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" @input="onOfferProductSearchInput" />
                  <select v-model="offerProductCategory" class="ect-rounded-xl ect-border ect-border-charcoal/15 ect-bg-white ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal" @change="loadOfferProductOptions">
                    <option value="">All categories</option>
                    <option v-for="category in CATEGORIES" :key="category" :value="category">{{ category }}</option>
                  </select>
                  <label class="ect-flex ect-items-center ect-gap-2 ect-rounded-xl ect-border ect-border-charcoal/15 ect-bg-white ect-px-3 ect-py-2">
                    <span class="ect-font-body ect-text-xs ect-text-charcoal/45 ect-whitespace-nowrap">Created before</span>
                    <input v-model="offerProductCreatedBefore" type="date" class="ect-min-w-0 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none" @change="loadOfferProductOptions" />
                  </label>
                </div>

                <div class="ect-flex ect-items-center ect-justify-between ect-gap-3">
                  <p class="ect-font-body ect-text-xs ect-text-charcoal/55">{{ automaticOfferDraft.products.length }} selected</p>
                  <button type="button" class="ect-font-body ect-text-xs ect-font-semibold ect-text-gold-700 hover:ect-text-charcoal disabled:ect-opacity-40" :disabled="!offerProductOptions.length" @click="selectVisibleOfferProducts">Select visible results</button>
                </div>

                <div v-if="offerProductOptionsLoading" class="ect-h-24 ect-rounded-xl ect-bg-white ect-animate-pulse" />
                <div v-else class="ect-max-h-64 ect-overflow-y-auto ect-rounded-xl ect-border ect-border-sand ect-bg-white ect-divide-y ect-divide-sand">
                  <label v-for="product in offerProductOptions" :key="product.id" class="ect-flex ect-cursor-pointer ect-items-start ect-gap-3 ect-px-3 ect-py-2.5 hover:ect-bg-cream/60">
                    <input type="checkbox" class="ect-mt-0.5 ect-h-4 ect-w-4 ect-rounded ect-border-charcoal/25 ect-text-gold-700 focus:ect-ring-gold-400/40" :checked="offerHasProduct(product.id)" @change="toggleOfferProduct(product)" />
                    <span class="ect-min-w-0">
                      <span class="ect-block ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">{{ product.title }}</span>
                      <span class="ect-block ect-font-body ect-text-micro ect-text-charcoal/45">{{ product.slug }} · {{ product.category }}</span>
                    </span>
                  </label>
                  <p v-if="!offerProductOptions.length" class="ect-p-4 ect-font-body ect-text-sm ect-text-charcoal/45">No matching active products.</p>
                </div>

                <section v-if="automaticOfferDraft.products.length" class="ect-space-y-2 ect-pt-2">
                  <div>
                    <h3 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Selected product pricing</h3>
                    <p class="ect-font-body ect-text-xs ect-text-charcoal/45">Choose “Campaign default” for shared pricing, or set a different rule and value for any product.</p>
                  </div>
                  <div class="ect-overflow-x-auto ect-rounded-xl ect-border ect-border-sand ect-bg-white">
                    <table class="ect-w-full ect-min-w-[860px] ect-border-collapse">
                      <thead class="ect-bg-cream">
                        <tr class="ect-text-left">
                          <th class="ect-px-3 ect-py-2 ect-font-body ect-text-micro ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Product</th>
                          <th class="ect-px-3 ect-py-2 ect-font-body ect-text-micro ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Pricing rule</th>
                          <th class="ect-px-3 ect-py-2 ect-font-body ect-text-micro ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Value</th>
                          <th class="ect-px-3 ect-py-2 ect-font-body ect-text-micro ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45">Label</th>
                          <th class="ect-w-12"><span class="ect-sr-only">Remove</span></th>
                        </tr>
                      </thead>
                      <tbody class="ect-divide-y ect-divide-sand">
                        <tr v-for="product in automaticOfferDraft.products" :key="product.id">
                          <td class="ect-px-3 ect-py-2.5">
                            <span class="ect-block ect-max-w-56 ect-truncate ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal" :title="product.title">{{ product.title }}</span>
                            <span class="ect-block ect-font-body ect-text-micro ect-text-charcoal/40">{{ product.slug }}</span>
                          </td>
                          <td class="ect-px-3 ect-py-2.5">
                            <select v-model="product.pricingType" class="ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-bg-white ect-px-2.5 ect-py-2 ect-font-body ect-text-xs ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40">
                              <option value="">Campaign default</option>
                              <option value="PERCENT">Percentage off</option>
                              <option value="AMOUNT">Rupees off</option>
                              <option value="FIXED_PRICE">Fixed selling price</option>
                            </select>
                          </td>
                          <td class="ect-px-3 ect-py-2.5">
                            <input v-model.number="product.pricingValue" type="number" min="1" :max="product.pricingType === 'PERCENT' ? MAX_OFFER_PERCENT : undefined" step="1" :disabled="!product.pricingType" :placeholder="product.pricingType === 'PERCENT' ? '%' : '₹'" class="ect-w-28 ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-2.5 ect-py-2 ect-font-body ect-text-xs ect-text-charcoal disabled:ect-bg-charcoal/5 disabled:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                          </td>
                          <td class="ect-px-3 ect-py-2.5">
                            <input v-model="product.pricingLabel" type="text" maxlength="60" :disabled="!product.pricingType" placeholder="Optional product label" class="ect-w-full ect-rounded-lg ect-border ect-border-charcoal/15 ect-px-2.5 ect-py-2 ect-font-body ect-text-xs ect-text-charcoal disabled:ect-bg-charcoal/5 disabled:ect-text-charcoal/30 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40" />
                          </td>
                          <td class="ect-pr-2 ect-text-right">
                            <button type="button" class="ect-rounded-full ect-p-2 ect-text-charcoal/30 hover:ect-bg-red-50 hover:ect-text-red-500" :aria-label="`Remove ${product.title}`" @click="toggleOfferProduct(product)">
                              <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p class="ect-font-body ect-text-micro ect-text-charcoal/40">A fixed selling price must be below the product’s current list price; otherwise that product remains at list price.</p>
                </section>
              </section>

              <label class="ect-flex ect-items-center ect-gap-3 ect-cursor-pointer">
                <input v-model="automaticOfferDraft.active" type="checkbox" class="ect-h-4 ect-w-4 ect-rounded ect-border-charcoal/25 ect-text-gold-700 focus:ect-ring-gold-400/40" />
                <span class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Active on the storefront</span>
              </label>

              <div class="ect-flex ect-flex-wrap ect-gap-2">
                <button type="button" class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors disabled:ect-opacity-60" :disabled="Boolean(automaticOfferSavingId)" @click="saveAutomaticOfferDraft">{{ automaticOfferSavingId ? 'Saving…' : 'Save offer' }}</button>
                <button type="button" class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/20 ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-bg-cream ect-transition-colors" @click="cancelAutomaticOfferDraft">Cancel</button>
              </div>
            </article>

            <div v-if="automaticOffersLoading" class="ect-h-24 ect-max-w-4xl ect-rounded-2xl ect-bg-cream ect-animate-pulse" />
            <p v-else-if="!automaticOffers.length" class="ect-font-body ect-text-sm ect-text-charcoal/45 ect-py-3">No automatic offers yet.</p>
            <ul v-else class="ect-list-none ect-m-0 ect-p-0 ect-max-w-4xl ect-space-y-2">
              <li v-for="row in automaticOffers" :key="row.id" class="ect-flex ect-flex-wrap ect-items-center ect-gap-3 ect-rounded-2xl ect-border ect-border-sand ect-bg-white ect-px-4 ect-py-3">
                <span class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">{{ row.name }}</span>
                <span class="ect-inline-flex ect-items-center ect-rounded-full ect-px-2 ect-py-0.5 ect-font-body ect-text-nano ect-font-semibold ect-uppercase ect-tracking-label" :class="row.active ? 'ect-bg-emerald-50 ect-text-emerald-700' : 'ect-bg-charcoal/5 ect-text-charcoal/45'">{{ row.active ? 'Active' : 'Off' }}</span>
                <span class="ect-font-body ect-text-sm ect-text-charcoal/55">{{ automaticOfferSummary(row) }}</span>
                <span class="ect-ml-auto ect-flex ect-items-center ect-gap-1">
                  <button type="button" class="ect-rounded-full ect-px-3 ect-py-1.5 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 hover:ect-bg-cream ect-transition-colors" @click="editAutomaticOffer(row)">Edit</button>
                  <button type="button" class="ect-p-1.5 ect-rounded-full ect-text-charcoal/30 hover:ect-bg-red-50 hover:ect-text-red-500 ect-transition-colors disabled:ect-opacity-40" :disabled="automaticOfferSavingId === row.id" aria-label="Delete offer" @click="deleteAutomaticOffer(row)">
                    <svg class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              </li>
            </ul>
          </section>

          <!-- Promo codes: nothing changes on the catalog until a shopper types
               one in at checkout. -->
          <section class="ect-pt-2 ect-border-t ect-border-sand">
            <div class="ect-mb-5 ect-mt-6 ect-flex ect-flex-col ect-gap-3 sm:ect-flex-row sm:ect-items-center sm:ect-justify-between">
              <div>
                <p class="ect-font-body ect-text-micro ect-uppercase ect-tracking-label ect-text-gold-700 ect-mb-1">Campaigns</p>
                <h2 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal">Promo codes</h2>
                <p class="ect-font-body ect-text-sm ect-text-charcoal/55 ect-mt-1">Codes a shopper types in at checkout. Catalog prices stay as they are; the discount comes off the order total, on top of automatic product offers.</p>
              </div>
              <div class="ect-flex ect-flex-wrap ect-gap-2">
                <button
                  type="button"
                  class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors disabled:ect-opacity-60"
                  :disabled="promoLoading || Boolean(promoDraft)"
                  @click="startNewPromo"
                >
                  + New code
                </button>
              </div>
            </div>

            <p
              v-if="promoMessage"
              class="ect-mb-4 ect-font-body ect-text-sm"
              :class="promoMessage.endsWith('saved.') || promoMessage.endsWith('deleted.') ? 'ect-text-emerald-700' : 'ect-text-red-600'"
            >
              {{ promoMessage }}
            </p>

            <!-- Editor form, shared by "new" and "edit" so the date and type
                 pickers have room the table rows could not give them. -->
            <article v-if="promoDraft" class="ect-mb-4 ect-max-w-3xl ect-rounded-2xl ect-border ect-border-gold-400 ect-bg-white ect-p-5 ect-space-y-4">
              <div class="ect-grid ect-grid-cols-1 sm:ect-grid-cols-2 ect-gap-4">
                <div>
                  <label class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45 ect-block ect-mb-2">Code</label>
                  <input
                    v-model="promoDraft.code"
                    type="text"
                    maxlength="40"
                    placeholder="DIWALI10"
                    class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-uppercase ect-tracking-wide ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40"
                  />
                </div>
                <div>
                  <label class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45 ect-block ect-mb-2">Discount</label>
                  <div class="ect-flex ect-items-center ect-gap-2">
                    <select
                      v-model="promoDraft.type"
                      class="ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40"
                    >
                      <option value="PERCENT">%</option>
                      <option value="AMOUNT">₹</option>
                    </select>
                    <input
                      v-model.number="promoDraft.value"
                      type="number"
                      min="1"
                      :max="promoDraft.type === 'PERCENT' ? MAX_OFFER_PERCENT : undefined"
                      step="1"
                      class="ect-w-full ect-min-w-0 ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40"
                    />
                  </div>
                </div>
                <div>
                  <label class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45 ect-block ect-mb-2">Minimum order (₹, optional)</label>
                  <input
                    v-model.number="promoDraft.minOrderPaise"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40"
                  />
                </div>
                <div class="ect-flex ect-items-end">
                  <label class="ect-flex ect-items-center ect-gap-3 ect-cursor-pointer ect-pb-2">
                    <input v-model="promoDraft.active" type="checkbox" class="ect-h-4 ect-w-4 ect-rounded ect-border-charcoal/25 ect-text-gold-700 focus:ect-ring-gold-400/40" />
                    <span class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Active</span>
                  </label>
                </div>
                <div>
                  <label class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45 ect-block ect-mb-2">Starts (optional)</label>
                  <input
                    v-model="promoDraft.startsAt"
                    type="date"
                    class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40"
                  />
                </div>
                <div>
                  <label class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-label ect-text-charcoal/45 ect-block ect-mb-2">Ends (optional)</label>
                  <input
                    v-model="promoDraft.endsAt"
                    type="date"
                    class="ect-w-full ect-rounded-xl ect-border ect-border-charcoal/15 ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/40"
                  />
                </div>
              </div>

              <div class="ect-flex ect-flex-wrap ect-gap-2 ect-pt-1">
                <button
                  type="button"
                  class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors disabled:ect-opacity-60"
                  :disabled="Boolean(promoSavingId)"
                  @click="savePromoDraft"
                >
                  {{ promoSavingId ? 'Saving…' : 'Save code' }}
                </button>
                <button
                  type="button"
                  class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/20 ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-bg-cream ect-transition-colors"
                  @click="cancelPromoDraft"
                >
                  Cancel
                </button>
              </div>
            </article>

            <div v-if="promoLoading" class="ect-h-24 ect-max-w-3xl ect-rounded-2xl ect-bg-cream ect-animate-pulse" />

            <p v-else-if="!promoCodes.length" class="ect-font-body ect-text-sm ect-text-charcoal/45 ect-py-3">
              No promo codes yet. Add one, e.g. “DIWALI10 → 10% off over ₹50,000”.
            </p>

            <ul v-else class="ect-list-none ect-m-0 ect-p-0 ect-max-w-3xl ect-space-y-2">
              <li
                v-for="row in promoCodes"
                :key="row.id"
                class="ect-flex ect-flex-wrap ect-items-center ect-gap-3 ect-rounded-2xl ect-border ect-border-sand ect-bg-white ect-px-4 ect-py-3"
              >
                <span class="ect-font-body ect-text-sm ect-font-semibold ect-uppercase ect-tracking-wide ect-text-charcoal">{{ row.code }}</span>
                <span
                  class="ect-inline-flex ect-items-center ect-rounded-full ect-px-2 ect-py-0.5 ect-font-body ect-text-nano ect-font-semibold ect-uppercase ect-tracking-label"
                  :class="row.active ? 'ect-bg-emerald-50 ect-text-emerald-700' : 'ect-bg-charcoal/5 ect-text-charcoal/45'"
                >
                  {{ row.active ? 'Active' : 'Off' }}
                </span>
                <span class="ect-font-body ect-text-sm ect-text-charcoal/55">{{ promoSummary(row) }}</span>
                <span class="ect-ml-auto ect-flex ect-items-center ect-gap-1">
                  <button
                    type="button"
                    class="ect-rounded-full ect-px-3 ect-py-1.5 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 hover:ect-bg-cream ect-transition-colors"
                    @click="editPromo(row)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="ect-p-1.5 ect-rounded-full ect-text-charcoal/30 hover:ect-bg-red-50 hover:ect-text-red-500 ect-transition-colors disabled:ect-opacity-40"
                    :disabled="promoSavingId === row.id"
                    aria-label="Delete code"
                    @click="deletePromo(row)"
                  >
                    <svg class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              </li>
            </ul>
          </section>
        </div>

        <div v-else-if="activeTabId === 'products'" class="ect-overflow-x-auto">
          <div class="ect-flex ect-flex-wrap ect-items-center ect-justify-between ect-gap-2 ect-border-b ect-border-sand ect-bg-cream ect-px-4 ect-py-3">
            <div class="ect-flex ect-w-full ect-flex-wrap ect-items-center ect-gap-2 lg:ect-w-auto">
              <div class="ect-relative ect-w-full sm:ect-w-72">
                <svg class="ect-absolute ect-left-3 ect-top-1/2 -ect-translate-y-1/2 ect-w-4 ect-h-4 ect-text-charcoal/35" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/></svg>
                <input
                  v-model="productSearch"
                  type="search"
                  placeholder="Search products…"
                  class="ect-w-full ect-rounded-full ect-border ect-border-charcoal/15 ect-bg-white ect-pl-9 ect-pr-3 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/35 focus:ect-border-gold-400 focus:ect-outline-none"
                  @input="onProductSearchInput"
                />
              </div>
              <UiSelect
                v-model="productStatusFilter"
                :options="productStatusOptions"
                class="ect-w-full sm:ect-w-44"
                @update:model-value="onProductStatusChange"
              />
            </div>
            <div class="ect-flex ect-flex-wrap ect-items-center ect-gap-2">
            <button
              v-if="aiRunning"
              type="button"
              class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-red-200 ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-red-600 hover:ect-bg-red-50 ect-transition-colors"
              @click="stopAiRun"
            >
              {{ `Stop AI run (${aiProgress.done}${aiProgress.total ? '/' + aiProgress.total : ''})` }}
            </button>
            <button
              v-if="syncRunning"
              type="button"
              class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-red-200 ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-red-600 hover:ect-bg-red-50 ect-transition-colors"
              @click="stopPhotoVectorSync"
            >
              {{ `Stop photo sync (${syncProgress.done}${syncProgress.total ? '/' + syncProgress.total : ''})` }}
            </button>
            <div ref="productMoreRef" class="ect-relative">
              <button
                type="button"
                class="ect-inline-flex ect-items-center ect-justify-center ect-gap-1.5 ect-rounded-full ect-border ect-border-charcoal/15 ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-border-gold-400 hover:ect-text-gold-700 ect-transition-colors"
                aria-haspopup="menu"
                :aria-expanded="productMoreOpen"
                @click="productMoreOpen = !productMoreOpen"
              >
                More
                <svg class="ect-w-3.5 ect-h-3.5 ect-transition-transform" :class="productMoreOpen ? 'ect-rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div
                v-if="productMoreOpen"
                class="ect-absolute ect-right-0 ect-top-full ect-z-30 ect-mt-2 ect-w-56 ect-rounded-2xl ect-border ect-border-charcoal/10 ect-bg-white ect-py-1.5 ect-shadow-xl"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  :disabled="aiRunning"
                  class="ect-block ect-w-full ect-px-4 ect-py-2.5 ect-text-left ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-bg-cream hover:ect-text-gold-700 ect-transition-colors disabled:ect-opacity-50 disabled:ect-cursor-not-allowed"
                  @click="productMoreOpen = false; openAiModal()"
                >
                  {{ aiRunning ? `Running ${aiProgress.done}${aiProgress.total ? '/' + aiProgress.total : ''}…` : 'Run all through AI' }}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  :disabled="syncRunning || aiRunning"
                  title="Re-scan every product's photos (DB + S3 folder) and embed any new ones for visual search. Already-embedded photos are skipped."
                  class="ect-block ect-w-full ect-px-4 ect-py-2.5 ect-text-left ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-bg-cream hover:ect-text-gold-700 ect-transition-colors disabled:ect-opacity-50 disabled:ect-cursor-not-allowed"
                  @click="productMoreOpen = false; runPhotoVectorSync()"
                >
                  {{ syncRunning ? `Syncing ${syncProgress.done}${syncProgress.total ? '/' + syncProgress.total : ''}…` : 'Sync photo vectors' }}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  :disabled="exporting"
                  class="ect-block ect-w-full ect-px-4 ect-py-2.5 ect-text-left ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-bg-cream hover:ect-text-gold-700 ect-transition-colors disabled:ect-opacity-50 disabled:ect-cursor-not-allowed"
                  @click="productMoreOpen = false; exportProducts()"
                >
                  {{ exporting ? 'Exporting…' : 'Export products' }}
                </button>
              </div>
            </div>
            <RouterLink
              to="/internal/products/import"
              class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/15 ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-border-gold-400 hover:ect-text-gold-700 ect-transition-colors"
            >
              Mass upload
            </RouterLink>
            <RouterLink
              to="/internal/products/new"
              class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-bg-charcoal ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors"
            >
              New product
            </RouterLink>
            </div>
          </div>

          <p v-if="exportError" class="ect-mt-2 ect-font-body ect-text-sm ect-text-red-600">{{ exportError }}</p>

          <!-- Run-through-AI options modal -->
          <div
            v-if="aiModalOpen"
            class="ect-fixed ect-inset-0 ect-z-[60] ect-flex ect-items-center ect-justify-center ect-bg-charcoal/40 ect-backdrop-blur-sm ect-p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Run products through AI"
            @click.self="aiModalOpen = false"
          >
            <div class="ect-w-full ect-max-w-md ect-rounded-2xl ect-bg-white ect-p-6 ect-shadow-2xl">
              <h3 class="ect-font-display ect-text-xl ect-text-charcoal">Run products through AI</h3>
              <p class="ect-mt-1 ect-font-body ect-text-sm ect-text-charcoal/55">
                Generates the AI description and refreshes the image-search vector. Images are pulled
                from each product's S3 folder when none are stored in the database.
              </p>

              <div class="ect-mt-4 ect-space-y-2">
                <label
                  class="ect-flex ect-cursor-pointer ect-items-start ect-gap-3 ect-rounded-xl ect-border ect-p-3 ect-transition-colors"
                  :class="aiScope === 'missing' ? 'ect-border-gold-400 ect-bg-champagne/50' : 'ect-border-charcoal/15 hover:ect-border-charcoal/25'"
                >
                  <input type="radio" value="missing" v-model="aiScope" class="ect-mt-1" />
                  <span>
                    <span class="ect-block ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Only products missing an AI description</span>
                    <span class="ect-block ect-font-body ect-text-xs ect-text-charcoal/55">Cheaper. Skips products that already have one. Good for incremental runs.</span>
                  </span>
                </label>
                <label
                  class="ect-flex ect-cursor-pointer ect-items-start ect-gap-3 ect-rounded-xl ect-border ect-p-3 ect-transition-colors"
                  :class="aiScope === 'all' ? 'ect-border-gold-400 ect-bg-champagne/50' : 'ect-border-charcoal/15 hover:ect-border-charcoal/25'"
                >
                  <input type="radio" value="all" v-model="aiScope" class="ect-mt-1" />
                  <span>
                    <span class="ect-block ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">All products (overwrite existing)</span>
                    <span class="ect-block ect-font-body ect-text-xs ect-text-charcoal/55">Re-runs every active product. Overwrites existing AI descriptions — one vision call per product (costs apply).</span>
                  </span>
                </label>
              </div>

              <div class="ect-mt-6 ect-flex ect-items-center ect-justify-end ect-gap-2">
                <button
                  type="button"
                  class="ect-rounded-full ect-border ect-border-charcoal/15 ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-border-gold-400 hover:ect-text-gold-700 ect-transition-colors"
                  @click="aiModalOpen = false"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="ect-rounded-full ect-bg-charcoal ect-px-5 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir ect-transition-colors"
                  @click="runAllThroughAi"
                >
                  Start run
                </button>
              </div>
            </div>
          </div>

          <div v-if="aiError" class="ect-mx-4 ect-mt-3 ect-rounded-lg ect-bg-red-50 ect-p-3 ect-font-body ect-text-sm ect-text-red-700">
            {{ aiError }}
          </div>
          <div v-if="aiResults.length" class="ect-mx-4 ect-mt-3 ect-rounded-lg ect-border ect-border-sand ect-p-3">
            <p class="ect-font-body ect-text-sm ect-text-charcoal/70">
              Generated {{ aiTotals.generated }} · Empty {{ aiTotals.empty }} · Skipped {{ aiTotals.skipped }} · Errors {{ aiTotals.error }}
              <span v-if="!aiRunning" class="ect-text-charcoal/45"> · done</span>
            </p>
            <div class="ect-mt-2 ect-max-h-60 ect-overflow-y-auto">
              <div v-for="(r, i) in aiResults" :key="i" class="ect-flex ect-items-center ect-gap-2 ect-py-1 ect-font-body ect-text-sm">
                <span class="ect-rounded-full ect-px-2 ect-py-0.5 ect-text-xs ect-font-semibold" :class="aiStatusClass(r.status)">{{ r.status }}</span>
                <span class="ect-text-charcoal/80">{{ r.slug }}</span>
                <span class="ect-text-charcoal/50">{{ r.message }}</span>
              </div>
            </div>
          </div>
          <div v-if="syncError" class="ect-mx-4 ect-mt-3 ect-rounded-lg ect-bg-red-50 ect-p-3 ect-font-body ect-text-sm ect-text-red-700">
            {{ syncError }}
          </div>
          <div v-if="syncResults.length" class="ect-mx-4 ect-mt-3 ect-rounded-lg ect-border ect-border-sand ect-p-3">
            <p class="ect-font-body ect-text-sm ect-text-charcoal/70">
              Photo vectors — Synced {{ syncTotals.synced || 0 }} · Unchanged {{ syncTotals.unchanged || 0 }} · No images {{ syncTotals['no-images'] || 0 }} · Errors {{ syncTotals.error || 0 }}
              <span v-if="!syncRunning" class="ect-text-charcoal/45"> · done</span>
            </p>
            <div class="ect-mt-2 ect-max-h-60 ect-overflow-y-auto">
              <div v-for="(r, i) in syncResults" :key="i" class="ect-flex ect-items-center ect-gap-2 ect-py-1 ect-font-body ect-text-sm">
                <span class="ect-rounded-full ect-px-2 ect-py-0.5 ect-text-xs ect-font-semibold" :class="syncStatusClass(r.status)">{{ r.status }}</span>
                <span class="ect-text-charcoal/80">{{ r.slug }}</span>
                <span class="ect-text-charcoal/50">{{ r.message }}</span>
              </div>
            </div>
          </div>
          <table class="ect-w-full ect-min-w-[920px] ect-border-collapse">
            <thead class="ect-bg-cream"><tr><th v-for="h in ['Product', 'Category', 'Material', 'Price', 'Status', 'Created', 'Modified']" :key="h" class="ect-px-4 ect-py-3 ect-text-left ect-font-body ect-text-xs ect-uppercase ect-tracking-label ect-text-charcoal/45">{{ h }}</th></tr></thead>
            <tbody>
              <template v-if="productListLoading">
                <tr v-for="index in skeletonRows" :key="index" class="ect-border-t ect-border-sand">
                  <td v-for="width in productSkeletonWidths" :key="width" class="ect-px-4 ect-py-3">
                    <div class="ect-h-4 ect-rounded ect-bg-sand ect-animate-pulse" :class="width"></div>
                  </td>
                </tr>
              </template>
              <tr v-for="row in products" v-else :key="row.id" class="ect-border-t ect-border-sand">
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-semibold">
                  <RouterLink :to="`/internal/products/${row.slug}`" class="ect-text-charcoal hover:ect-text-gold-700 hover:ect-underline">
                    {{ row.title }}
                  </RouterLink>
                  <RouterLink :to="`/internal/products/${row.slug}`" class="ect-block ect-text-xs ect-text-charcoal/40 hover:ect-text-gold-700 hover:ect-underline">
                    {{ row.slug }}
                  </RouterLink>
                </td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm">{{ row.category }}</td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm">{{ row.material }}</td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm">
                  <span v-if="!row.hiddenForNoPrice" class="ect-text-charcoal">{{ row.price }}</span>
                  <RouterLink
                    v-else
                    :to="`/internal/products/${row.slug}`"
                    class="ect-inline-flex ect-items-center ect-rounded-full ect-bg-red-50 ect-px-2.5 ect-py-1 ect-text-xs ect-font-semibold ect-text-red-700 hover:ect-bg-red-100"
                    title="No price set — this product is hidden from the storefront"
                  >
                    No price · hidden
                  </RouterLink>
                </td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm">{{ row.active ? 'Active' : 'Hidden' }}</td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/55">{{ formatDate(row.createdAt) }}<span class="ect-block ect-text-xs ect-text-charcoal/40">by {{ row.createdBy || '—' }}</span></td>
                <td class="ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/55">{{ row.modifiedAt ? formatDate(row.modifiedAt) : formatDate(row.updatedAt) }}<span v-if="row.modifiedBy" class="ect-block ect-text-xs ect-text-charcoal/40">by {{ row.modifiedBy }}</span></td>
              </tr>
              <tr v-if="!productListLoading && !products.length" class="ect-border-t ect-border-sand">
                <td colspan="7" class="ect-px-4 ect-py-6 ect-font-body ect-text-sm ect-text-charcoal/45">No products found.</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!productListLoading && products.length" class="ect-flex ect-flex-col ect-items-center ect-gap-3 ect-border-t ect-border-sand ect-px-4 ect-py-4">
            <p class="ect-font-body ect-text-xs ect-text-charcoal/45">
              Showing {{ products.length }} of {{ productTotal }}
              <span v-if="productUnpricedTotal" class="ect-text-red-700 ect-font-semibold">
                · {{ productUnpricedTotal }} without a price, hidden from the storefront
              </span>
              <span v-else class="ect-text-charcoal/45">· every product has a price</span>
            </p>
            <button
              v-if="productHasMore"
              type="button"
              :disabled="productLoadingMore"
              class="ect-inline-flex ect-items-center ect-justify-center ect-rounded-full ect-border ect-border-charcoal/15 ect-px-5 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal/70 hover:ect-border-gold-400 hover:ect-text-gold-700 ect-transition-colors disabled:ect-opacity-50 disabled:ect-cursor-not-allowed"
              @click="loadProducts(false)"
            >
              {{ productLoadingMore ? 'Loading…' : 'Load more' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
