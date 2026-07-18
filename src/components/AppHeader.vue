<script setup lang="ts">

import { computed, ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useSearch } from '../composables/useSearch'
import { useCart } from '../composables/useCart'
import { useWishlist } from '../composables/useWishlist'
import { useOrders } from '../composables/useOrders'
import { fetchServiceRequests, type ServiceRequest } from '../composables/useServiceRequests'
import { COLLECTION_LINKS, type CollectionLink } from '../data/collections'
import { MEGA_MENUS, MEGA_PRICE_RANGES } from '../data/megaMenu'
import { useSiteConfig } from '../composables/useSiteConfig'

const router = useRouter()
const route = useRoute()
const { collectionImages, ensureSiteConfigLoaded, logoSrc } = useSiteConfig()
const brandName = 'Jewelet'
const { user, isLoggedIn, isInternalUser, refreshCurrentUser, logout } = useAuth()
const { query, searchByImage, submitTextSearch } = useSearch()
const { totalItems } = useCart()
const { count: wishlistCount } = useWishlist()
const { orders } = useOrders()
const menuOpen = ref(false)
const notificationOpen = ref(false)
const mobileNavOpen = ref(false)
const activeDropdown = ref<string | null>(null)
const mobileActiveAccordion = ref<string | null>(null)
const searchFocused = ref(false)
const imageFileInput = ref<HTMLInputElement | null>(null)
const serviceRequests = ref<ServiceRequest[]>([])

// Service requests are server-backed; only internal users on /internal pages
// see them in the bell, so skip the API call everywhere else.
async function loadServiceRequests() {
  const userId = user.value?.id
  if (!userId || !isInternalUser.value || !isInternalPath.value) {
    serviceRequests.value = []
    return
  }
  try {
    serviceRequests.value = await fetchServiceRequests(userId)
  } catch {
    // Notifications are best-effort; keep whatever we showed last.
  }
}
const isInternalPath = computed(
  () => typeof route.path === 'string' && route.path.startsWith('/internal'),
)
const internalNotifications = computed(() => {
  if (!isInternalPath.value) return []
  const orderItems = orders.value.slice(0, 4).map((order) => ({
    id: `order-${order.id}`,
    type: 'Order',
    title: order.id,
    meta: `${order.itemCount} items · ${order.formattedTotal}`,
    to: { name: 'internal-order', params: { id: order.id } },
  }))
  const serviceItems = serviceRequests.value.slice(0, 4).map((request) => ({
    id: `service-${request.reference}`,
    type: 'Service',
    title: request.reference,
    meta: `${request.customerName} · ${request.serviceTitle || 'Service request'}`,
    to: { name: 'internal-service', params: { reference: request.reference } },
  }))
  return [...serviceItems, ...orderItems].slice(0, 6)
})
const notificationCount = computed(() => internalNotifications.value.length)

function openImagePicker() {
  imageFileInput.value?.click()
}

function onImageFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  mobileNavOpen.value = false
  query.value = ''
  router.push({ path: '/search' })
  searchByImage(file)
  ;(e.target as HTMLInputElement).value = ''
}

interface ServiceItem {
  id: string
  label: string
}

const collectionItems: CollectionLink[] = COLLECTION_LINKS

// Bluestone-style mega menu: the dark category bar opens a full-width panel
// for the hovered collection.
const activeMegaItem = computed(
  () => collectionItems.find((c) => c.slug === activeDropdown.value) ?? null,
)
const activeMegaMenu = computed(() =>
  activeMegaItem.value ? MEGA_MENUS[activeMegaItem.value.slug] ?? null : null,
)

// Tile image for the "Browse By Collections" card: configured image first,
// bundled category photo as fallback.
const megaTileImage = (slug: string) =>
  collectionImages.value[slug] || MEGA_MENUS[slug]?.fallbackImage || ''

const serviceItems: ServiceItem[] = [
  { id: 'cad', label: 'CAD' },
  { id: 'wax', label: 'Wax' },
  { id: 'casting', label: 'Casting' },
  { id: 'final', label: 'Complete package (final product)' },
]

// Mobile menu collection cards: first four in a 2-col grid, necklace as the full-width signature card.
const gridCollections = collectionItems.filter((c) => c.slug !== 'necklaces')
const signatureCollection = collectionItems.find((c) => c.slug === 'necklaces')

// Brushed-gold diagonal-stripe treatment for the collection cards.
const cardStripe =
  'repeating-linear-gradient(135deg, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 1.5px, transparent 1.5px, transparent 13px)'
const cardGold = 'linear-gradient(135deg, #e8d49a 0%, #cfb064 45%, #b7923f 100%)'
const cardGoldDark = 'linear-gradient(135deg, #8a6b2a 0%, #5f4a1d 100%)'

// The configured per-collection image (if any). Rendered as an <img> overlay
// over the gold card, not a CSS background-image — iOS/mobile Safari refuses to
// paint background-images past a decoded-size threshold, so large uploads would
// show only the gradient on phones. <img> decodes progressively and isn't capped.
const collectionImage = (slug: string) => collectionImages.value[slug] || ''

async function goToCollection(slug: string) {
  activeDropdown.value = null
  mobileNavOpen.value = false
  mobileActiveAccordion.value = null
  await router.push(`/collections/${slug}`)
}

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
  menuOpen.value = false
  notificationOpen.value = false
  activeDropdown.value = null
  mobileActiveAccordion.value = null
  void loadServiceRequests()
})

// Keep the bar in sync with the URL on /search (back/forward, shared links,
// submits made from the search page itself).
watch(() => route.query.q, (v) => {
  if (route.path !== '/search') return
  const next = String(v || '')
  if (next !== query.value) query.value = next
})

onMounted(() => {
  void ensureSiteConfigLoaded()
  void loadServiceRequests()
  if (!isLoggedIn.value) return
  refreshCurrentUser().catch(() => {
    // Keep the existing local session if the profile refresh fails.
  })
})

function handleLogout() {
  menuOpen.value = false
  mobileNavOpen.value = false
  logout()
  router.push('/')
}

async function handleSearch() {
  const q = query.value.trim()
  if (q) {
    mobileNavOpen.value = false
    // Commit the navigation first so the search page reads the new ?q= when the
    // submit signal below fires. Typing alone never navigates or searches.
    await router.push({ path: '/search', query: { q } })
    submitTextSearch()
  }
}

function clearSearch() {
  query.value = ''
  if (route.path === '/search') router.replace('/search')
}

function toggleInternalUi() {
  if (!isInternalUser.value) return
  menuOpen.value = false
  notificationOpen.value = false
  mobileNavOpen.value = false
  router.push(isInternalPath.value ? '/' : { path: '/internal', query: { tab: 'orders' } })
}

function toggleNotifications() {
  notificationOpen.value = !notificationOpen.value
  menuOpen.value = false
}
</script>

<template>
  <!-- Hidden file input for image search (shared by desktop + mobile camera buttons) -->
  <input
    ref="imageFileInput"
    type="file"
    accept="image/*"
    class="ect-hidden"
    @change="onImageFileChange"
  />

  <header class="ect-fixed ect-top-0 ect-left-0 ect-right-0 ect-z-50">
    <!-- Announcement bar (mobile only — on desktop the dark category bar
         below the logo row takes its place, matching the Bluestone layout) -->
    <section class="lg:ect-hidden ect-bg-bluestone-800 ect-text-champagne ect-text-center ect-py-1.5 ect-px-4">
      <p class="ect-font-body ect-text-[10px] sm:ect-text-[11px] ect-tracking-[0.18em] sm:ect-tracking-[0.22em] ect-uppercase ect-whitespace-nowrap ect-text-cream/85">
        <span class="sm:ect-hidden">Free shipping &middot; Certified jewellery</span>
        <span class="ect-hidden sm:ect-inline">Free insured shipping &middot; Certified gold and diamond jewellery &middot; Lifetime exchange</span>
      </p>
    </section>

    <!-- Main nav -->
    <nav class="ect-bg-white/95 ect-backdrop-blur-xl lg:ect-border-b lg:ect-border-sand">
      <section class="ect-max-w-7xl ect-mx-auto ect-px-5 ect-flex ect-items-center ect-justify-between ect-h-16">
        <!-- Left: mobile hamburger + logo (mobile) / logo only (desktop) -->
        <section class="ect-flex ect-items-center ect-gap-3 ect-shrink-0">
          <button
            class="lg:ect-hidden ect-p-0.5 ect-text-charcoal/70 hover:ect-text-charcoal ect-transition-colors"
            aria-label="Toggle menu"
            @click="mobileNavOpen = !mobileNavOpen"
          >
            <svg v-if="!mobileNavOpen" class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <svg v-else class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <!-- On mobile the logo lives inside the search pill; internal pages have
               no search so the logo stays here at every width. -->
          <RouterLink
            :to="isInternalPath ? { path: '/internal', query: { tab: 'orders' } } : '/'"
            class="ect-items-center ect-gap-2.5 ect-shrink-0"
            :class="isInternalPath ? 'ect-flex' : 'ect-hidden lg:ect-flex'"
          >
            <img :src="logoSrc" :alt="`${brandName} logo`" class="ect-h-10 ect-w-auto ect-max-w-[180px] ect-object-contain" />
          </RouterLink>
        </section>

        <!-- Mobile search pill in the top bar; the logo doubles as the home link -->
        <form
          v-if="!isInternalPath"
          @submit.prevent="handleSearch"
          class="lg:ect-hidden ect-flex-1 ect-min-w-0 ect-mx-2.5 ect-flex ect-items-center ect-rounded-full ect-bg-cream ect-ring-1 ect-ring-charcoal/[0.08] focus-within:ect-ring-gold-400/50 focus-within:ect-bg-white ect-transition-all ect-duration-200"
        >
          <RouterLink to="/" :aria-label="`${brandName} home`" class="ect-ml-1 ect-p-0.5 ect-shrink-0">
            <img :src="logoSrc" :alt="`${brandName} logo`" class="ect-h-8 ect-w-auto ect-max-w-[120px] ect-object-contain" />
          </RouterLink>
          <input
            v-model="query"
            type="text"
            placeholder="Search jewellery…"
            class="ect-flex-1 ect-min-w-0 ect-px-2 ect-py-2 ect-bg-transparent ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/35 focus:ect-outline-none"
          />
          <button
            v-if="query"
            type="button"
            aria-label="Clear search"
            class="ect-p-1.5 ect-rounded-full ect-text-charcoal/35 hover:ect-text-charcoal ect-transition-colors ect-shrink-0"
            @click="clearSearch"
          >
            <svg class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            type="button"
            title="Search by image"
            aria-label="Search by image"
            class="ect-mr-1 ect-p-1.5 ect-rounded-full ect-text-charcoal/35 hover:ect-text-gold-700 hover:ect-bg-gold-100/60 ect-transition-colors ect-shrink-0"
            @click="openImagePicker"
          >
            <svg class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </button>
        </form>

        <!-- Desktop: internal workspace link (category links live in the dark bar below) -->
        <ul v-if="isInternalPath" class="ect-hidden lg:ect-flex ect-items-center ect-gap-6 ect-list-none ect-m-0 ect-p-0">
          <li>
            <RouterLink
              :to="{ path: '/internal', query: { tab: 'orders' } }"
              class="ect-font-body ect-text-[13px] ect-font-medium ect-uppercase ect-tracking-[0.12em] ect-text-gold-700 hover:ect-text-gold-800 ect-transition-colors ect-py-1"
            >
              Internal workspace
            </RouterLink>
          </li>
        </ul>

        <!-- Desktop right actions -->
        <section class="ect-hidden lg:ect-flex ect-items-center ect-gap-5">
          <!-- Search -->
          <form v-if="!isInternalPath" @submit.prevent="handleSearch" class="ect-flex ect-items-center ect-rounded-full ect-transition-all ect-duration-300" :class="searchFocused ? 'ect-bg-white ect-shadow-sm ect-ring-1 ect-ring-gold-400/40' : 'ect-bg-champagne/50'">
            <button
              type="submit"
              title="Search"
              aria-label="Search"
              class="ect-ml-1.5 ect-p-1.5 ect-rounded-full ect-text-charcoal/30 hover:ect-text-gold-700 hover:ect-bg-champagne ect-transition-colors ect-shrink-0"
            >
              <svg class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
            <input
              v-model="query"
              type="text"
              placeholder="Search for jewellery…"
              class="ect-w-44 focus:ect-w-64 ect-px-2.5 ect-py-2 ect-bg-transparent ect-font-body ect-text-xs ect-text-charcoal placeholder:ect-text-charcoal/35 focus:ect-outline-none ect-transition-all ect-duration-300"
              @focus="searchFocused = true"
              @blur="searchFocused = false"
            />
            <button
              type="button"
              title="Search by image"
              aria-label="Search by image"
              class="ect-mr-1.5 ect-p-1.5 ect-rounded-full ect-text-charcoal/30 hover:ect-text-gold-700 hover:ect-bg-champagne ect-transition-colors ect-shrink-0"
              @click="openImagePicker"
            >
              <svg class="ect-w-3.5 ect-h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </button>
          </form>

          <!-- Video call -->
          <RouterLink v-if="!isInternalPath" to="/chat" class="ect-group ect-flex ect-flex-col ect-items-center ect-gap-0.5 ect-px-0.5" aria-label="Video call">
            <svg class="ect-w-[19px] ect-h-[19px] ect-text-charcoal/60 group-hover:ect-text-gold-700 ect-transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span class="ect-font-body ect-text-[10px] ect-text-charcoal/55 group-hover:ect-text-charcoal ect-transition-colors">Video call</span>
          </RouterLink>

          <!-- Wishlist -->
          <RouterLink v-if="!isInternalPath" to="/wishlist" class="ect-relative ect-group ect-flex ect-flex-col ect-items-center ect-gap-0.5 ect-px-0.5" aria-label="Wishlist">
            <svg class="ect-w-[19px] ect-h-[19px] ect-text-charcoal/60 group-hover:ect-text-rose-500 ect-transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <span class="ect-font-body ect-text-[10px] ect-text-charcoal/55 group-hover:ect-text-charcoal ect-transition-colors">Wishlist</span>
            <span v-if="wishlistCount > 0" class="ect-absolute -ect-top-1.5 ect-left-1/2 ect-ml-1 ect-min-w-[18px] ect-h-[18px] ect-bg-rose-500 ect-text-white ect-rounded-full ect-font-body ect-text-[9px] ect-font-bold ect-flex ect-items-center ect-justify-center ect-px-1">{{ wishlistCount }}</span>
          </RouterLink>

          <!-- Cart -->
          <RouterLink v-if="!isInternalPath" to="/cart" class="ect-relative ect-group ect-flex ect-flex-col ect-items-center ect-gap-0.5 ect-px-0.5" aria-label="Cart">
            <svg class="ect-w-[19px] ect-h-[19px] ect-text-charcoal/60 group-hover:ect-text-charcoal ect-transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span class="ect-font-body ect-text-[10px] ect-text-charcoal/55 group-hover:ect-text-charcoal ect-transition-colors">Cart</span>
            <span v-if="totalItems > 0" class="ect-absolute -ect-top-1.5 ect-left-1/2 ect-ml-1 ect-min-w-[18px] ect-h-[18px] ect-bg-rose-500 ect-text-white ect-rounded-full ect-font-body ect-text-[9px] ect-font-bold ect-flex ect-items-center ect-justify-center ect-px-1">{{ totalItems }}</span>
          </RouterLink>

          <!-- Internal notifications -->
          <section v-if="isInternalUser && isInternalPath" class="ect-relative">
            <button
              type="button"
              class="ect-relative ect-group ect-p-1.5"
              aria-label="Internal notifications"
              :aria-expanded="notificationOpen"
              @click="toggleNotifications"
            >
              <svg class="ect-w-[18px] ect-h-[18px] ect-text-charcoal/60 group-hover:ect-text-gold-700 ect-transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span v-if="notificationCount > 0" class="ect-absolute -ect-top-0.5 -ect-right-0.5 ect-min-w-[18px] ect-h-[18px] ect-bg-rose-500 ect-text-white ect-rounded-full ect-font-body ect-text-[9px] ect-font-bold ect-flex ect-items-center ect-justify-center ect-px-1">{{ notificationCount }}</span>
            </button>

            <Transition
              enter-active-class="ect-transition ect-duration-150 ect-ease-out"
              enter-from-class="ect-opacity-0 ect-translate-y-1"
              enter-to-class="ect-opacity-100 ect-translate-y-0"
              leave-active-class="ect-transition ect-duration-100 ect-ease-in"
              leave-from-class="ect-opacity-100 ect-translate-y-0"
              leave-to-class="ect-opacity-0 ect-translate-y-1"
            >
              <section
                v-if="notificationOpen"
                class="ect-absolute ect-right-0 ect-mt-3 ect-w-80 ect-overflow-hidden ect-rounded-lg ect-bg-white ect-shadow-xl ect-shadow-charcoal/[0.08] ect-ring-1 ect-ring-charcoal/[0.05]"
              >
                <header class="ect-flex ect-items-center ect-justify-between ect-gap-3 ect-border-b ect-border-charcoal/[0.06] ect-px-4 ect-py-3">
                  <p class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Notifications</p>
                </header>
                <div v-if="internalNotifications.length" class="ect-max-h-80 ect-overflow-y-auto">
                  <RouterLink
                    v-for="item in internalNotifications"
                    :key="item.id"
                    :to="item.to"
                    class="ect-block ect-border-b ect-border-charcoal/[0.05] ect-px-4 ect-py-3 hover:ect-bg-champagne/40 ect-transition-colors"
                  >
                    <span class="ect-font-body ect-text-[11px] ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-gold-700">{{ item.type }}</span>
                    <span class="ect-block ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal ect-mt-0.5">{{ item.title }}</span>
                    <span class="ect-block ect-font-body ect-text-xs ect-text-charcoal/50 ect-mt-0.5 ect-truncate">{{ item.meta }}</span>
                  </RouterLink>
                </div>
                <p v-else class="ect-px-4 ect-py-6 ect-text-center ect-font-body ect-text-sm ect-text-charcoal/45">No order or service notifications yet.</p>
              </section>
            </Transition>
          </section>

          <!-- User / Sign in -->
          <section v-if="isLoggedIn" class="ect-relative">
            <button
              @click="menuOpen = !menuOpen"
              class="ect-flex ect-items-center ect-gap-2 ect-group"
            >
              <span class="ect-inline-flex ect-items-center ect-justify-center ect-w-8 ect-h-8 ect-rounded-full ect-bg-charcoal ect-text-white ect-font-body ect-text-[11px] ect-font-bold ect-uppercase group-hover:ect-bg-noir ect-transition-colors">{{ user?.name?.charAt(0) }}</span>
              <svg class="ect-w-3.5 ect-h-3.5 ect-text-charcoal/40 ect-transition-transform ect-duration-200" :class="{ 'ect-rotate-180': menuOpen }" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
              </svg>
            </button>

            <Transition
              enter-active-class="ect-transition ect-duration-150 ect-ease-out"
              enter-from-class="ect-opacity-0 ect-translate-y-1"
              enter-to-class="ect-opacity-100 ect-translate-y-0"
              leave-active-class="ect-transition ect-duration-100 ect-ease-in"
              leave-from-class="ect-opacity-100 ect-translate-y-0"
              leave-to-class="ect-opacity-0 ect-translate-y-1"
            >
              <ul
                v-if="menuOpen"
                class="ect-absolute ect-right-0 ect-mt-3 ect-w-52 ect-bg-white ect-rounded-lg ect-shadow-xl ect-shadow-charcoal/[0.08] ect-ring-1 ect-ring-charcoal/[0.05] ect-py-1.5 ect-list-none ect-m-0 ect-p-0 ect-overflow-hidden"
              >
                <li class="ect-px-4 ect-py-3 ect-border-b ect-border-charcoal/[0.06]">
                  <p class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal ect-truncate">{{ user?.name }}</p>
                  <p class="ect-font-body ect-text-[11px] ect-text-charcoal/40 ect-truncate">{{ user?.email }}</p>
                  <button
                    v-if="isInternalUser"
                    type="button"
                    class="ect-w-full ect-mt-3 ect-flex ect-items-center ect-justify-between ect-gap-3 ect-rounded-lg ect-px-3 ect-py-2 ect-font-body ect-text-sm ect-font-semibold ect-transition-colors"
                    :class="isInternalPath ? 'ect-bg-champagne/60 ect-text-charcoal' : 'ect-bg-charcoal/5 ect-text-charcoal/65 hover:ect-bg-charcoal/10'"
                    :aria-pressed="isInternalPath"
                    aria-label="Toggle internal workspace"
                    @click="toggleInternalUi"
                  >
                    <span>Internal</span>
                    <span
                      class="ect-relative ect-inline-flex ect-h-5 ect-w-9 ect-items-center ect-rounded-full ect-transition-colors"
                      :class="isInternalPath ? 'ect-bg-gold-500' : 'ect-bg-charcoal/25'"
                    >
                      <span
                        class="ect-inline-block ect-h-4 ect-w-4 ect-transform ect-rounded-full ect-bg-white ect-shadow ect-transition-transform"
                        :class="isInternalPath ? 'ect-translate-x-4' : 'ect-translate-x-0.5'"
                      />
                    </span>
                  </button>
                </li>
                <li>
                  <RouterLink to="/orders" class="ect-block ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal/70 hover:ect-bg-champagne/40 hover:ect-text-charcoal ect-transition-colors">My Orders</RouterLink>
                </li>
                <li>
                  <RouterLink to="/account" class="ect-block ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-text-charcoal/70 hover:ect-bg-champagne/40 hover:ect-text-charcoal ect-transition-colors">Account Settings</RouterLink>
                </li>
                <li class="ect-border-t ect-border-charcoal/[0.06] ect-mt-1 ect-pt-1">
                  <button
                    @click="handleLogout"
                    class="ect-w-full ect-text-left ect-px-4 ect-py-2 ect-font-body ect-text-sm ect-text-red-500 hover:ect-bg-red-50 ect-transition-colors"
                  >Sign out</button>
                </li>
              </ul>
            </Transition>
          </section>

          <RouterLink v-else to="/login" class="ect-group ect-flex ect-flex-col ect-items-center ect-gap-0.5 ect-px-0.5" aria-label="Sign in">
            <svg class="ect-w-[19px] ect-h-[19px] ect-text-charcoal/60 group-hover:ect-text-charcoal ect-transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="ect-font-body ect-text-[10px] ect-text-charcoal/55 group-hover:ect-text-charcoal ect-transition-colors">Sign in</span>
          </RouterLink>
        </section>

        <!-- Mobile right: wishlist, cart (sign-in lives in the drawer) -->
        <section class="lg:ect-hidden ect-flex ect-items-center ect-gap-1.5">
          <RouterLink v-if="!isInternalPath" to="/wishlist" class="ect-relative ect-p-1.5 ect-text-charcoal/60 hover:ect-text-rose-500 ect-transition-colors" aria-label="Wishlist">
            <svg class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <span v-if="wishlistCount > 0" class="ect-absolute -ect-top-1 -ect-right-1 ect-min-w-[18px] ect-h-[18px] ect-bg-rose-500 ect-text-white ect-rounded-full ect-font-body ect-text-[9px] ect-font-bold ect-flex ect-items-center ect-justify-center ect-px-1">{{ wishlistCount }}</span>
          </RouterLink>
          <RouterLink v-if="!isInternalPath" to="/cart" class="ect-relative ect-p-1.5 ect-text-charcoal/60 hover:ect-text-charcoal ect-transition-colors" aria-label="Cart">
            <svg class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span v-if="totalItems > 0" class="ect-absolute -ect-top-1 -ect-right-1 ect-min-w-[18px] ect-h-[18px] ect-bg-charcoal ect-text-white ect-rounded-full ect-font-body ect-text-[9px] ect-font-bold ect-flex ect-items-center ect-justify-center ect-px-1">{{ totalItems }}</span>
          </RouterLink>
          <section v-if="isInternalUser && isInternalPath" class="ect-relative">
            <button
              type="button"
              class="ect-relative ect-p-1.5 ect-text-charcoal/60 hover:ect-text-gold-700 ect-transition-colors"
              aria-label="Internal notifications"
              :aria-expanded="notificationOpen"
              @click="toggleNotifications"
            >
              <svg class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span v-if="notificationCount > 0" class="ect-absolute -ect-top-1 -ect-right-1 ect-min-w-[18px] ect-h-[18px] ect-bg-rose-500 ect-text-white ect-rounded-full ect-font-body ect-text-[9px] ect-font-bold ect-flex ect-items-center ect-justify-center ect-px-1">{{ notificationCount }}</span>
            </button>
            <Transition
              enter-active-class="ect-transition ect-duration-150 ect-ease-out"
              enter-from-class="ect-opacity-0 ect-translate-y-1"
              enter-to-class="ect-opacity-100 ect-translate-y-0"
              leave-active-class="ect-transition ect-duration-100 ect-ease-in"
              leave-from-class="ect-opacity-100 ect-translate-y-0"
              leave-to-class="ect-opacity-0 ect-translate-y-1"
            >
              <section
                v-if="notificationOpen"
                class="ect-absolute ect-right-0 ect-mt-3 ect-w-[min(20rem,calc(100vw-2rem))] ect-overflow-hidden ect-rounded-lg ect-bg-white ect-shadow-xl ect-shadow-charcoal/[0.08] ect-ring-1 ect-ring-charcoal/[0.05]"
              >
                <header class="ect-flex ect-items-center ect-justify-between ect-gap-3 ect-border-b ect-border-charcoal/[0.06] ect-px-4 ect-py-3">
                  <p class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">Notifications</p>
                </header>
                <div v-if="internalNotifications.length" class="ect-max-h-80 ect-overflow-y-auto">
                  <RouterLink
                    v-for="item in internalNotifications"
                    :key="item.id"
                    :to="item.to"
                    class="ect-block ect-border-b ect-border-charcoal/[0.05] ect-px-4 ect-py-3 hover:ect-bg-champagne/40 ect-transition-colors"
                  >
                    <span class="ect-font-body ect-text-[11px] ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-gold-700">{{ item.type }}</span>
                    <span class="ect-block ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal ect-mt-0.5">{{ item.title }}</span>
                    <span class="ect-block ect-font-body ect-text-xs ect-text-charcoal/50 ect-mt-0.5 ect-truncate">{{ item.meta }}</span>
                  </RouterLink>
                </div>
                <p v-else class="ect-px-4 ect-py-6 ect-text-center ect-font-body ect-text-sm ect-text-charcoal/45">No order or service notifications yet.</p>
              </section>
            </Transition>
          </section>
        </section>
      </section>
    </nav>

    <!-- Desktop category bar + Bluestone-style mega menu -->
    <nav
      v-if="!isInternalPath"
      class="ect-hidden lg:ect-block ect-relative ect-bg-bluestone-800"
      @mouseleave="activeDropdown = null"
    >
      <ul class="ect-max-w-7xl ect-mx-auto ect-px-5 ect-flex ect-items-stretch ect-list-none ect-m-0 ect-p-0">
        <li v-for="item in collectionItems" :key="item.slug" @mouseenter="activeDropdown = item.slug">
          <RouterLink
            :to="`/collections/${item.slug}`"
            class="ect-flex ect-items-center ect-h-11 ect-px-4 ect-font-body ect-text-[12px] ect-font-medium ect-uppercase ect-tracking-[0.14em] ect-transition-colors"
            :class="activeDropdown === item.slug ? 'ect-bg-white ect-text-bluestone-800' : 'ect-text-cream/85 hover:ect-text-white'"
            @click="activeDropdown = null"
          >
            {{ item.title }}
          </RouterLink>
        </li>
        <li @mouseenter="activeDropdown = null">
          <RouterLink
            to="/collections"
            class="ect-flex ect-items-center ect-h-11 ect-px-4 ect-font-body ect-text-[12px] ect-font-medium ect-uppercase ect-tracking-[0.14em] ect-text-cream/85 hover:ect-text-white ect-transition-colors"
          >
            All Jewellery
          </RouterLink>
        </li>

        <li class="ect-relative ect-ml-auto" @mouseenter="activeDropdown = 'services'">
          <button class="ect-flex ect-items-center ect-gap-1 ect-h-11 ect-px-4 ect-font-body ect-text-[12px] ect-font-medium ect-uppercase ect-tracking-[0.14em] ect-transition-colors" :class="activeDropdown === 'services' ? 'ect-bg-white ect-text-bluestone-800' : 'ect-text-cream/85 hover:ect-text-white'">
            Services
            <svg class="ect-w-3 ect-h-3 ect-transition-transform ect-duration-200" :class="activeDropdown === 'services' ? 'ect-rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
          </button>
          <Transition enter-active-class="ect-transition ect-duration-200 ect-ease-out" enter-from-class="ect-opacity-0 ect-translate-y-1" enter-to-class="ect-opacity-100 ect-translate-y-0" leave-active-class="ect-transition ect-duration-150 ect-ease-in" leave-from-class="ect-opacity-100 ect-translate-y-0" leave-to-class="ect-opacity-0 ect-translate-y-1">
            <ul v-if="activeDropdown === 'services'" class="ect-absolute ect-top-full ect-right-0 ect-w-72 ect-bg-white ect-shadow-2xl ect-shadow-charcoal/[0.15] ect-ring-1 ect-ring-charcoal/[0.06] ect-p-2 ect-list-none ect-m-0 ect-z-10">
              <li v-for="svc in serviceItems" :key="svc.id">
                <RouterLink :to="{ name: 'services', hash: '#' + svc.id }" class="ect-block ect-px-3 ect-py-2.5 ect-font-body ect-text-sm ect-font-medium ect-text-charcoal/80 hover:ect-bg-champagne/40 hover:ect-text-charcoal ect-transition-colors" @click="activeDropdown = null">
                  {{ svc.label }}
                </RouterLink>
              </li>
            </ul>
          </Transition>
        </li>
        <li @mouseenter="activeDropdown = null">
          <RouterLink
            to="/about"
            class="ect-flex ect-items-center ect-h-11 ect-px-4 ect-font-body ect-text-[12px] ect-font-medium ect-uppercase ect-tracking-[0.14em] ect-text-cream/85 hover:ect-text-white ect-transition-colors"
          >
            About Us
          </RouterLink>
        </li>
      </ul>

      <!-- Full-width mega panel for the hovered collection -->
      <Transition enter-active-class="ect-transition ect-duration-200 ect-ease-out" enter-from-class="ect-opacity-0 -ect-translate-y-1" enter-to-class="ect-opacity-100 ect-translate-y-0" leave-active-class="ect-transition ect-duration-150 ect-ease-in" leave-from-class="ect-opacity-100 ect-translate-y-0" leave-to-class="ect-opacity-0 -ect-translate-y-1">
        <section
          v-if="activeMegaMenu && activeMegaItem"
          class="ect-absolute ect-top-full ect-left-0 ect-right-0 ect-bg-white ect-shadow-2xl ect-shadow-charcoal/[0.18] ect-border-t ect-border-sand"
        >
          <div class="ect-max-w-7xl ect-mx-auto ect-px-5 ect-py-7 ect-grid ect-grid-cols-[1.35fr_1fr_1fr_1.15fr] ect-gap-x-10">
            <!-- Popular types -->
            <section>
              <h3 class="ect-font-body ect-text-[13px] ect-font-semibold ect-text-charcoal ect-tracking-[0.04em] ect-mb-4">{{ activeMegaMenu.typesHeading }}</h3>
              <ul class="ect-grid ect-grid-cols-2 ect-gap-x-6 ect-list-none ect-m-0 ect-p-0">
                <li v-for="t in activeMegaMenu.types" :key="t.label">
                  <RouterLink
                    :to="{ path: `/collections/${activeMegaItem.slug}`, query: t.query }"
                    class="ect-block ect-py-1.5 ect-font-body ect-text-sm ect-text-charcoal/65 hover:ect-text-gold-700 ect-transition-colors"
                    @click="activeDropdown = null"
                  >
                    {{ t.label }}
                  </RouterLink>
                </li>
              </ul>
              <RouterLink
                :to="`/collections/${activeMegaItem.slug}`"
                class="ect-mt-5 ect-inline-flex ect-w-full ect-items-center ect-justify-center ect-py-2.5 ect-border ect-border-bluestone-800/30 ect-font-body ect-text-[12px] ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-bluestone-800 hover:ect-bg-bluestone-800 hover:ect-text-white ect-transition-colors"
                @click="activeDropdown = null"
              >
                View All {{ activeMegaItem.title }}
              </RouterLink>
            </section>

            <!-- Price ranges -->
            <section class="ect-border-l ect-border-sand/70 ect-pl-8">
              <h3 class="ect-font-body ect-text-[13px] ect-font-semibold ect-text-charcoal ect-tracking-[0.04em] ect-mb-4">By Price Range</h3>
              <ul class="ect-list-none ect-m-0 ect-p-0">
                <li v-for="pr in MEGA_PRICE_RANGES" :key="pr.label">
                  <RouterLink
                    :to="{ path: `/collections/${activeMegaItem.slug}`, query: pr.query }"
                    class="ect-block ect-py-1.5 ect-font-body ect-text-sm ect-text-charcoal/65 hover:ect-text-gold-700 ect-transition-colors"
                    @click="activeDropdown = null"
                  >
                    {{ pr.label }}
                  </RouterLink>
                </li>
              </ul>
            </section>

            <!-- Metals & stones -->
            <section class="ect-border-l ect-border-sand/70 ect-pl-8">
              <h3 class="ect-font-body ect-text-[13px] ect-font-semibold ect-text-charcoal ect-tracking-[0.04em] ect-mb-4">By Metals &amp; Stones</h3>
              <ul class="ect-list-none ect-m-0 ect-p-0">
                <li v-for="m in activeMegaMenu.metals" :key="m.label">
                  <RouterLink
                    :to="{ path: `/collections/${activeMegaItem.slug}`, query: m.query }"
                    class="ect-block ect-py-1.5 ect-font-body ect-text-sm ect-text-charcoal/65 hover:ect-text-gold-700 ect-transition-colors"
                    @click="activeDropdown = null"
                  >
                    {{ m.label }} {{ activeMegaItem.title }}
                  </RouterLink>
                </li>
              </ul>
            </section>

            <!-- Browse by collections -->
            <section class="ect-border-l ect-border-sand/70 ect-pl-8">
              <header class="ect-flex ect-items-center ect-justify-between ect-mb-4">
                <h3 class="ect-font-body ect-text-[13px] ect-font-semibold ect-text-charcoal ect-tracking-[0.04em]">Browse By Collections</h3>
                <RouterLink to="/collections" class="ect-inline-flex ect-items-center ect-gap-1 ect-font-body ect-text-[12px] ect-font-semibold ect-text-bluestone-600 hover:ect-text-bluestone-800 ect-transition-colors" @click="activeDropdown = null">
                  View All
                  <svg class="ect-w-3.5 ect-h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12l-7.5 7.5M21 12H3"/></svg>
                </RouterLink>
              </header>
              <RouterLink
                :to="`/collections/${activeMegaItem.slug}`"
                class="ect-group ect-relative ect-block ect-h-44 ect-overflow-hidden ect-ring-1 ect-ring-charcoal/[0.06]"
                @click="activeDropdown = null"
              >
                <img
                  v-if="megaTileImage(activeMegaItem.slug)"
                  :src="megaTileImage(activeMegaItem.slug)"
                  :alt="activeMegaItem.title"
                  class="ect-absolute ect-inset-0 ect-w-full ect-h-full ect-object-cover group-hover:ect-scale-105 ect-transition-transform ect-duration-500"
                />
                <span class="ect-absolute ect-inset-0 ect-bg-[linear-gradient(180deg,transparent_45%,rgba(13,36,54,0.55)_100%)]" />
                <span class="ect-absolute ect-bottom-3 ect-left-4 ect-right-4">
                  <span class="ect-block ect-font-display ect-text-xl ect-font-light ect-text-white ect-leading-tight">{{ activeMegaItem.title }}</span>
                  <span class="ect-block ect-font-body ect-text-[10px] ect-font-semibold ect-uppercase ect-tracking-[0.2em] ect-text-white/75 ect-mt-0.5">The Jewelet Edit</span>
                </span>
              </RouterLink>
            </section>
          </div>
        </section>
      </Transition>
    </nav>

    <!-- Mobile drawer overlay: dimmed backdrop + 90%-width panel. Always
         rendered (never v-if'd away) so the collection images stay fetched
         and decoded — tearing the drawer down made them visibly reload on
         every open. Class-driven transitions instead of <Transition> because
         nested Transitions over v-show leave the panel stuck off-screen when
         an open interrupts a close. -->
      <section
        class="lg:ect-hidden ect-fixed ect-inset-0 ect-z-[60] ect-bg-charcoal/40 ect-backdrop-blur-sm ect-transition-opacity"
        :class="mobileNavOpen ? 'ect-opacity-100 ect-duration-300 ect-ease-out' : 'ect-opacity-0 ect-pointer-events-none ect-duration-200 ect-ease-in'"
        :inert="!mobileNavOpen"
        @click.self="mobileNavOpen = false"
      >
          <section
            class="ect-w-[90%] ect-h-full ect-bg-pearl ect-flex ect-flex-col ect-shadow-luxe ect-transition-transform"
            :class="mobileNavOpen ? 'ect-translate-x-0 ect-duration-300 ect-ease-out' : '-ect-translate-x-full ect-duration-200 ect-ease-in'"
          >
        <!-- Drawer top bar: close + brand -->
        <header class="ect-relative ect-flex ect-items-center ect-justify-center ect-h-16 ect-px-5 ect-shrink-0">
          <button
            class="ect-absolute ect-left-3.5 ect-p-2 ect-text-charcoal/70 hover:ect-text-charcoal ect-transition-colors"
            aria-label="Close menu"
            @click="mobileNavOpen = false"
          >
            <svg class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span class="ect-flex ect-items-center ect-gap-2">
            <img :src="logoSrc" :alt="`${brandName} logo`" class="ect-h-10 ect-w-auto ect-max-w-[180px] ect-object-contain" />
          </span>
        </header>

        <!-- Scrollable body -->
        <div class="ect-flex-1 ect-overflow-y-auto ect-px-5 ect-pb-10">
          <!-- Search -->
          <form
            v-if="!isInternalPath"
            @submit.prevent="handleSearch"
            class="ect-flex ect-items-center ect-rounded-full ect-bg-cream ect-ring-1 ect-ring-charcoal/[0.08] focus-within:ect-ring-gold-400/50 focus-within:ect-bg-white ect-transition-all ect-duration-200 ect-mb-7"
          >
            <button
              type="submit"
              title="Search"
              aria-label="Search"
              class="ect-ml-1.5 ect-p-2 ect-rounded-full ect-text-charcoal/35 hover:ect-text-gold-700 hover:ect-bg-gold-100/60 ect-transition-colors ect-shrink-0"
            >
              <svg class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
            <input
              v-model="query"
              type="text"
              placeholder="Search for jewellery…"
              class="ect-flex-1 ect-px-3 ect-py-2.5 ect-bg-transparent ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/35 focus:ect-outline-none"
            />
            <button
              type="button"
              title="Search by image"
              aria-label="Search by image"
              class="ect-mr-1.5 ect-p-2 ect-rounded-full ect-text-charcoal/35 hover:ect-text-gold-700 hover:ect-bg-gold-100/60 ect-transition-colors ect-shrink-0"
              @click="openImagePicker"
            >
              <svg class="ect-w-4 ect-h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </button>
          </form>

          <RouterLink
            v-if="isInternalPath"
            :to="{ path: '/internal', query: { tab: 'orders' } }"
            class="ect-flex ect-items-center ect-justify-between ect-py-4 ect-font-body ect-text-[13px] ect-font-semibold ect-uppercase ect-tracking-[0.14em] ect-text-gold-700 hover:ect-text-gold-800 ect-transition-colors ect-border-b ect-border-charcoal/[0.08]"
            @click="mobileNavOpen = false"
          >
            <span>Internal workspace</span>
            <svg class="ect-w-4 ect-h-4 ect-text-charcoal/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
          </RouterLink>

          <!-- Collection cards -->
          <section v-if="!isInternalPath" class="ect-mb-7">
            <p class="ect-flex ect-items-center ect-gap-3 ect-mb-3.5">
              <span class="ect-font-body ect-text-[11px] ect-font-semibold ect-uppercase ect-tracking-[0.18em] ect-text-charcoal/55">Shop by category</span>
              <span class="ect-flex-1 ect-h-px ect-bg-charcoal/10"></span>
            </p>

            <div class="ect-grid ect-grid-cols-2 ect-gap-3">
              <button
                v-for="item in gridCollections"
                :key="item.slug"
                type="button"
                @click="goToCollection(item.slug)"
                class="ect-relative ect-h-24 ect-rounded-2xl ect-overflow-hidden ect-flex ect-items-end ect-p-3.5 ect-text-left ect-shadow-card hover:ect-shadow-luxe-sm hover:-ect-translate-y-0.5 ect-transition-all ect-duration-200"
                :style="{ backgroundImage: cardStripe + ', ' + cardGold }"
              >
                <!-- Eager load: the drawer is display:none until opened, so a lazy
                     image would never intersect and only start loading on first open. -->
                <img
                  v-if="collectionImage(item.slug)"
                  :src="collectionImage(item.slug)"
                  :alt="item.label"
                  decoding="async"
                  class="ect-pointer-events-none ect-absolute ect-inset-0 ect-w-full ect-h-full ect-object-cover"
                />
                <span class="ect-pointer-events-none ect-absolute ect-inset-0 ect-bg-[linear-gradient(180deg,transparent_45%,rgba(20,17,15,0.35)_100%)]" />
                <span class="ect-relative ect-font-display ect-text-lg ect-font-light ect-leading-tight ect-text-cream ect-tracking-wide [text-shadow:0_1px_3px_rgba(27,25,23,0.35)]">{{ item.label }}</span>
              </button>
            </div>

            <button
              v-if="signatureCollection"
              type="button"
              @click="goToCollection(signatureCollection.slug)"
              class="ect-relative ect-w-full ect-h-28 ect-mt-3 ect-rounded-2xl ect-overflow-hidden ect-flex ect-flex-col ect-justify-end ect-p-4 ect-text-left ect-shadow-card hover:ect-shadow-luxe-sm hover:-ect-translate-y-0.5 ect-transition-all ect-duration-200"
              :style="{ backgroundImage: cardStripe + ', ' + cardGoldDark }"
            >
              <img
                v-if="collectionImage(signatureCollection.slug)"
                :src="collectionImage(signatureCollection.slug)"
                :alt="signatureCollection.label"
                decoding="async"
                class="ect-pointer-events-none ect-absolute ect-inset-0 ect-w-full ect-h-full ect-object-cover"
              />
              <span class="ect-pointer-events-none ect-absolute ect-inset-0 ect-bg-[linear-gradient(180deg,transparent_40%,rgba(20,17,15,0.45)_100%)]" />
              <span class="ect-relative ect-font-display ect-text-2xl ect-font-light ect-leading-tight ect-text-cream ect-tracking-wide [text-shadow:0_1px_3px_rgba(27,25,23,0.4)]">{{ signatureCollection.label }}</span>
              <span class="ect-relative ect-font-body ect-text-[10px] ect-font-semibold ect-uppercase ect-tracking-[0.22em] ect-text-cream/70 ect-mt-1">The Signature Line</span>
            </button>
          </section>

          <!-- Link rows -->
          <nav v-if="!isInternalPath" class="ect-border-t ect-border-charcoal/[0.08]">
            <RouterLink
              :to="{ name: 'services' }"
              @click="mobileNavOpen = false"
              class="ect-flex ect-items-center ect-justify-between ect-py-4 ect-border-b ect-border-charcoal/[0.08] ect-font-body ect-text-[15px] ect-text-charcoal hover:ect-text-gold-700 ect-transition-colors"
            >
              <span>Video Consultation</span>
              <svg class="ect-w-4 ect-h-4 ect-text-charcoal/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </RouterLink>
            <RouterLink
              to="/chat"
              @click="mobileNavOpen = false"
              class="ect-flex ect-items-center ect-justify-between ect-py-4 ect-border-b ect-border-charcoal/[0.08] ect-font-body ect-text-[15px] ect-text-charcoal hover:ect-text-gold-700 ect-transition-colors"
            >
              <span>Chat with Expert</span>
              <svg class="ect-w-4 ect-h-4 ect-text-charcoal/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </RouterLink>
            <RouterLink
              to="/about"
              @click="mobileNavOpen = false"
              class="ect-flex ect-items-center ect-justify-between ect-py-4 ect-border-b ect-border-charcoal/[0.08] ect-font-body ect-text-[15px] ect-text-charcoal hover:ect-text-gold-700 ect-transition-colors"
            >
              <span>About Us</span>
              <svg class="ect-w-4 ect-h-4 ect-text-charcoal/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </RouterLink>
          </nav>

          <!-- Account -->
          <template v-if="isLoggedIn">
            <RouterLink
              to="/account"
              @click="mobileNavOpen = false"
              class="ect-mt-6 ect-flex ect-items-center ect-gap-3.5 ect-rounded-2xl ect-bg-white ect-border ect-border-charcoal/[0.08] ect-shadow-card ect-px-4 ect-py-4 hover:ect-border-gold-300 hover:ect-shadow-luxe-sm ect-transition-all ect-duration-200"
            >
              <span class="ect-inline-flex ect-items-center ect-justify-center ect-w-11 ect-h-11 ect-rounded-full ect-bg-charcoal ect-text-white ect-font-body ect-text-sm ect-font-bold ect-uppercase ect-shrink-0">{{ user?.name?.charAt(0) }}</span>
              <span class="ect-min-w-0 ect-flex-1">
                <span class="ect-block ect-font-body ect-text-[15px] ect-font-semibold ect-text-charcoal ect-truncate">{{ user?.name }}</span>
                <span class="ect-block ect-font-body ect-text-[12px] ect-text-charcoal/55 ect-truncate">{{ user?.email }}</span>
              </span>
              <svg class="ect-w-4 ect-h-4 ect-text-charcoal/30 ect-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </RouterLink>

            <button
              v-if="isInternalUser"
              type="button"
              class="ect-w-full ect-mt-3 ect-flex ect-items-center ect-justify-between ect-gap-3 ect-py-3.5 ect-px-4 ect-rounded-2xl ect-font-body ect-text-[15px] ect-font-semibold ect-transition-colors"
              :class="isInternalPath ? 'ect-bg-white ect-text-gold-700 ect-border ect-border-gold-300' : 'ect-bg-cream ect-text-charcoal ect-border ect-border-charcoal/[0.08] hover:ect-bg-white'"
              :aria-pressed="isInternalPath"
              aria-label="Toggle internal workspace"
              @click="toggleInternalUi"
            >
              <span>Internal</span>
              <span
                class="ect-relative ect-inline-flex ect-h-5 ect-w-9 ect-items-center ect-rounded-full ect-transition-colors"
                :class="isInternalPath ? 'ect-bg-gold-500' : 'ect-bg-charcoal/25'"
              >
                <span
                  class="ect-inline-block ect-h-4 ect-w-4 ect-transform ect-rounded-full ect-bg-white ect-shadow ect-transition-transform"
                  :class="isInternalPath ? 'ect-translate-x-4' : 'ect-translate-x-0.5'"
                />
              </span>
            </button>

            <RouterLink
              to="/orders"
              @click="mobileNavOpen = false"
              class="ect-mt-3 ect-flex ect-items-center ect-gap-3 ect-py-4 ect-px-1 ect-font-body ect-text-[15px] ect-text-charcoal hover:ect-text-gold-700 ect-transition-colors"
            >
              <svg class="ect-w-5 ect-h-5 ect-text-gold-600 ect-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
              </svg>
              <span>My Orders</span>
              <svg class="ect-w-4 ect-h-4 ect-text-charcoal/30 ect-ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </RouterLink>

            <RouterLink
              v-if="!isInternalPath"
              to="/wishlist"
              @click="mobileNavOpen = false"
              class="ect-flex ect-items-center ect-gap-3 ect-py-4 ect-px-1 ect-border-t ect-border-charcoal/[0.08] ect-font-body ect-text-[15px] ect-text-charcoal hover:ect-text-gold-700 ect-transition-colors"
            >
              <svg class="ect-w-5 ect-h-5 ect-text-gold-600 ect-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <span>Wishlist</span>
              <span v-if="wishlistCount > 0" class="ect-ml-auto ect-min-w-[20px] ect-h-5 ect-px-1.5 ect-rounded-full ect-bg-rose-500 ect-text-white ect-font-body ect-text-xs ect-font-bold ect-flex ect-items-center ect-justify-center">{{ wishlistCount }}</span>
              <svg v-else class="ect-w-4 ect-h-4 ect-text-charcoal/30 ect-ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </RouterLink>

            <button @click="handleLogout" class="ect-w-full ect-mt-6 ect-py-3.5 ect-px-4 ect-rounded-full ect-font-body ect-text-[12px] ect-font-semibold ect-uppercase ect-tracking-[0.16em] ect-text-charcoal/70 ect-bg-transparent ect-border ect-border-charcoal/15 hover:ect-bg-charcoal hover:ect-text-white hover:ect-border-charcoal ect-transition-colors">
              Sign out
            </button>
          </template>

          <RouterLink
            v-else
            to="/login"
            @click="mobileNavOpen = false"
            class="ect-mt-6 ect-flex ect-items-center ect-justify-center ect-gap-2 ect-w-full ect-py-3.5 ect-rounded-full ect-bg-charcoal ect-text-white ect-font-body ect-text-[12px] ect-font-semibold ect-uppercase ect-tracking-[0.16em] hover:ect-bg-noir ect-transition-colors"
          >
            Sign in
          </RouterLink>
        </div>
          </section>
      </section>
  </header>

</template>
