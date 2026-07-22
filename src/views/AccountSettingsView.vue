<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { COUNTRY_OPTIONS, countryDisplayName, useSavedAddresses, type SavedAddressEntry } from '../composables/useSavedAddresses'

const router = useRouter()
const { user, isLoggedIn, changePassword } = useAuth()
const { addresses, save: saveAddress, remove: removeAddress } = useSavedAddresses()

if (!isLoggedIn.value) router.replace('/login')

type SectionId = 'password' | 'addresses'

const sections: { id: SectionId; label: string; description: string }[] = [
  { id: 'password', label: 'Change password', description: 'Update your account password' },
  { id: 'addresses', label: 'Manage addresses', description: 'Add or update delivery addresses' },
]
const activeSection = ref<SectionId>('password')

const currentPassword = ref('')
const newPassword = ref('')
const confirm = ref('')
const isLoading = ref(false)
const error = ref('')
const message = ref('')
const addressSearch = ref('')
const editingAddressId = ref<string | null>(null)
const showAddressForm = ref(false)
const blankAddress = (): Omit<SavedAddressEntry, 'id'> => ({
  label: '',
  name: user.value?.name ?? '',
  email: user.value?.email ?? '',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: 'IN',
  pincode: '',
})
const addressForm = ref(blankAddress())
const filteredAddresses = computed(() => {
  const needle = addressSearch.value.trim().toLocaleLowerCase()
  if (!needle) return addresses.value
  return addresses.value.filter((address) =>
    [address.label, address.name, address.address, address.city, address.state, address.pincode, countryDisplayName(address.country)]
      .join(' ')
      .toLocaleLowerCase()
      .includes(needle),
  )
})

function openNewAddress() {
  editingAddressId.value = null
  addressForm.value = blankAddress()
  showAddressForm.value = true
}

function editAddress(address: SavedAddressEntry) {
  editingAddressId.value = address.id
  addressForm.value = { ...address }
  showAddressForm.value = true
}

function closeAddressForm() {
  showAddressForm.value = false
  editingAddressId.value = null
}

function submitAddress() {
  saveAddress({ ...addressForm.value, id: editingAddressId.value ?? undefined })
  closeAddressForm()
}

async function handleSubmit() {
  error.value = ''
  message.value = ''
  if (newPassword.value !== confirm.value) {
    error.value = 'New passwords do not match.'
    return
  }
  if (newPassword.value === currentPassword.value) {
    error.value = 'New password must be different from your current password.'
    return
  }
  isLoading.value = true
  try {
    message.value = await changePassword(currentPassword.value, newPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirm.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unable to change password.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="ect-min-h-screen ect-px-4 sm:ect-px-6 ect-pt-28 ect-pb-16 ect-bg-gradient-to-b ect-from-cream ect-via-champagne/40 ect-to-cream">
    <div class="ect-max-w-5xl ect-mx-auto">
      <header class="ect-mb-8 lg:ect-mb-10">
        <p class="ect-font-body ect-text-[11px] ect-uppercase ect-tracking-[0.18em] ect-text-bluestone-700 ect-mb-2">Jewelet</p>
        <h1 class="ect-font-display ect-text-3xl sm:ect-text-4xl ect-font-light ect-text-charcoal ect-tracking-wide">Account settings</h1>
      </header>

      <div class="ect-grid ect-grid-cols-1 lg:ect-grid-cols-[260px_1fr] ect-gap-6 lg:ect-gap-8 ect-items-start">
        <!-- Sidebar -->
        <aside class="ect-bg-white/90 ect-backdrop-blur-sm ect-rounded-2xl ect-shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] ect-border ect-border-sand ect-overflow-hidden">
          <div class="ect-px-4 ect-py-5 ect-border-b ect-border-sand ect-flex ect-items-center ect-gap-3">
            <span class="ect-inline-flex ect-items-center ect-justify-center ect-w-11 ect-h-11 ect-rounded-full ect-bg-charcoal ect-text-white ect-font-body ect-text-sm ect-font-bold ect-uppercase ect-shrink-0">{{ user?.name?.charAt(0) }}</span>
            <span class="ect-min-w-0">
              <p class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal ect-truncate">{{ user?.name }}</p>
              <p class="ect-font-body ect-text-[12px] ect-text-charcoal/50 ect-truncate">{{ user?.email }}</p>
            </span>
          </div>
          <nav class="ect-p-2">
            <button
              v-for="section in sections"
              :key="section.id"
              type="button"
              @click="activeSection = section.id"
              class="ect-w-full ect-text-left ect-px-3 ect-py-2.5 ect-rounded-xl ect-font-body ect-text-sm ect-transition-colors"
              :class="activeSection === section.id ? 'ect-bg-champagne/60 ect-text-charcoal ect-font-semibold' : 'ect-text-charcoal/70 hover:ect-bg-cream hover:ect-text-charcoal'"
            >
              <span class="ect-block">{{ section.label }}</span>
              <span class="ect-block ect-mt-0.5 ect-text-[11px] ect-font-normal ect-text-charcoal/45">{{ section.description }}</span>
            </button>
          </nav>
        </aside>

        <!-- Content panel -->
        <div class="ect-bg-white/90 ect-backdrop-blur-sm ect-rounded-2xl ect-shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] ect-border ect-border-sand ect-overflow-hidden">
          <div class="ect-h-1 ect-bg-gradient-to-r ect-from-gold-200 ect-via-gold-400 ect-to-gold-200" />

          <div v-if="activeSection === 'password'" class="ect-px-6 ect-py-8 sm:ect-px-10 sm:ect-py-10">
            <header class="ect-mb-8">
              <h2 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal ect-tracking-wide ect-mb-1">Change password</h2>
              <p class="ect-font-body ect-text-sm ect-text-charcoal/60">Choose a strong password you don't use elsewhere</p>
            </header>

            <form @submit.prevent="handleSubmit" class="ect-space-y-5 ect-max-w-md">
              <label class="ect-block">
                <span class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/70 ect-mb-1.5 ect-block">Current password</span>
                <div class="ect-relative">
                  <span class="ect-absolute ect-left-4 ect-top-1/2 -ect-translate-y-1/2 ect-text-charcoal/30 ect-pointer-events-none">
                    <svg class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </span>
                  <input
                    v-model="currentPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    class="ect-w-full ect-pl-12 ect-pr-4 ect-py-3.5 ect-bg-cream ect-border ect-border-sand ect-rounded-xl ect-font-body ect-text-base ect-text-charcoal placeholder:ect-text-charcoal/35 focus:ect-outline-none focus:ect-border-gold-400 focus:ect-ring-2 focus:ect-ring-gold-400/25 focus:ect-bg-white ect-transition-all"
                  />
                </div>
              </label>

              <label class="ect-block">
                <span class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/70 ect-mb-1.5 ect-block">New password</span>
                <div class="ect-relative">
                  <span class="ect-absolute ect-left-4 ect-top-1/2 -ect-translate-y-1/2 ect-text-charcoal/30 ect-pointer-events-none">
                    <svg class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.852-.715-1.943-1.086-3.121-1.086-3.205 0-5.67 2.592-5.67 5.99 0 .209.01.418.028.627M12 15.75c-3.453 0-6.027-2.56-6.027-5.994 0-.104.01-.209.028-.313M15.75 5.25c0-1.21-.91-2.2-2.09-2.25a2.2 2.2 0 00-2.09 2.25m0 9.75v.008v-.008m0 0h.008m-.008 0H12m0 0h.008m-.008 0H15.75" />
                    </svg>
                  </span>
                  <input
                    v-model="newPassword"
                    type="password"
                    required
                    minlength="8"
                    placeholder="••••••••"
                    class="ect-w-full ect-pl-12 ect-pr-4 ect-py-3.5 ect-bg-cream ect-border ect-border-sand ect-rounded-xl ect-font-body ect-text-base ect-text-charcoal placeholder:ect-text-charcoal/35 focus:ect-outline-none focus:ect-border-gold-400 focus:ect-ring-2 focus:ect-ring-gold-400/25 focus:ect-bg-white ect-transition-all"
                  />
                </div>
                <span class="ect-font-body ect-text-xs ect-text-charcoal/40 ect-mt-1.5 ect-block">At least 8 characters</span>
              </label>

              <label class="ect-block">
                <span class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-charcoal/70 ect-mb-1.5 ect-block">Confirm new password</span>
                <div class="ect-relative">
                  <span class="ect-absolute ect-left-4 ect-top-1/2 -ect-translate-y-1/2 ect-text-charcoal/30 ect-pointer-events-none">
                    <svg class="ect-w-5 ect-h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.852-.715-1.943-1.086-3.121-1.086-3.205 0-5.67 2.592-5.67 5.99 0 .209.01.418.028.627M12 15.75c-3.453 0-6.027-2.56-6.027-5.994 0-.104.01-.209.028-.313M15.75 5.25c0-1.21-.91-2.2-2.09-2.25a2.2 2.2 0 00-2.09 2.25m0 9.75v.008v-.008m0 0h.008m-.008 0H12m0 0h.008m-.008 0H15.75" />
                    </svg>
                  </span>
                  <input
                    v-model="confirm"
                    type="password"
                    required
                    minlength="8"
                    placeholder="••••••••"
                    class="ect-w-full ect-pl-12 ect-pr-4 ect-py-3.5 ect-bg-cream ect-border ect-border-sand ect-rounded-xl ect-font-body ect-text-base ect-text-charcoal placeholder:ect-text-charcoal/35 focus:ect-outline-none focus:ect-border-gold-400 focus:ect-ring-2 focus:ect-ring-gold-400/25 focus:ect-bg-white ect-transition-all"
                  />
                </div>
              </label>

              <button
                type="submit"
                :disabled="isLoading"
                class="ect-w-full sm:ect-w-auto ect-px-8 ect-py-4 ect-bg-charcoal ect-text-white ect-font-body ect-text-sm ect-font-semibold ect-uppercase ect-tracking-[0.15em] ect-rounded-xl hover:ect-bg-noir focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400 focus:ect-ring-offset-2 focus:ect-ring-offset-white ect-transition-colors disabled:ect-opacity-50 disabled:ect-cursor-not-allowed ect-mt-2"
              >
                {{ isLoading ? 'Updating…' : 'Update password' }}
              </button>
              <p v-if="message" class="ect-font-body ect-text-sm ect-text-green-600">{{ message }}</p>
              <p v-if="error" class="ect-font-body ect-text-sm ect-text-red-600">{{ error }}</p>
            </form>
          </div>

          <div v-else-if="activeSection === 'addresses'" class="ect-px-6 ect-py-8 sm:ect-px-10 sm:ect-py-10">
            <header class="ect-mb-7">
              <h2 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal ect-tracking-wide ect-mb-1">Manage addresses</h2>
              <p class="ect-font-body ect-text-sm ect-text-charcoal/60">Choose, update, or add a saved delivery address</p>
            </header>

            <section class="ect-border ect-border-sand ect-rounded-2xl ect-bg-cream/35 ect-overflow-hidden">
              <div class="ect-p-4 ect-border-b ect-border-sand ect-bg-white/80">
                <label class="ect-relative ect-block">
                  <span class="ect-sr-only">Search saved addresses</span>
                  <input v-model="addressSearch" type="search" placeholder="Search locations" class="ect-w-full ect-rounded-xl ect-border ect-border-sand ect-bg-white ect-py-3 ect-pl-4 ect-pr-11 ect-font-body ect-text-sm ect-text-charcoal placeholder:ect-text-charcoal/40 focus:ect-border-gold-400 focus:ect-outline-none focus:ect-ring-2 focus:ect-ring-gold-400/20" />
                  <svg class="ect-absolute ect-right-4 ect-top-1/2 ect-h-4 ect-w-4 -ect-translate-y-1/2 ect-text-charcoal/35" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                </label>
              </div>

              <div v-if="filteredAddresses.length" class="ect-max-h-[28rem] ect-space-y-3 ect-overflow-y-auto ect-p-4">
                <article v-for="address in filteredAddresses" :key="address.id" class="ect-flex ect-items-start ect-gap-4 ect-rounded-xl ect-border ect-border-sand ect-bg-white ect-p-4 ect-shadow-sm">
                  <span class="ect-mt-0.5 ect-flex ect-h-9 ect-w-9 ect-shrink-0 ect-items-center ect-justify-center ect-rounded-full ect-bg-champagne/60 ect-text-gold-700">
                    <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  </span>
                  <div class="ect-min-w-0 ect-flex-1">
                    <h3 class="ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">{{ address.label }}</h3>
                    <p class="ect-mt-1 ect-font-body ect-text-sm ect-leading-relaxed ect-text-charcoal/65">{{ address.address }}, {{ address.city }}, {{ address.state }}, {{ countryDisplayName(address.country) }} {{ address.pincode }}</p>
                    <p class="ect-mt-1 ect-font-body ect-text-xs ect-text-charcoal/45">{{ address.name }} · {{ address.phone }}</p>
                  </div>
                  <div class="ect-flex ect-shrink-0 ect-items-center ect-gap-2">
                    <button type="button" class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-wide ect-text-gold-700 hover:ect-text-gold-800" @click="editAddress(address)">Edit</button>
                    <button type="button" class="ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-wide ect-text-red-500 hover:ect-text-red-600" @click="removeAddress(address.id)">Delete</button>
                  </div>
                </article>
              </div>
              <div v-else class="ect-px-6 ect-py-12 ect-text-center">
                <p class="ect-font-body ect-text-sm ect-text-charcoal/55">{{ addresses.length ? 'No addresses match your search.' : 'No saved addresses yet.' }}</p>
              </div>
            </section>

            <button type="button" class="ect-mt-5 ect-rounded-xl ect-bg-charcoal ect-px-6 ect-py-3 ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-white hover:ect-bg-noir ect-transition-colors" @click="openNewAddress">Add new address</button>

            <form v-if="showAddressForm" class="ect-mt-6 ect-rounded-2xl ect-border ect-border-sand ect-bg-white ect-p-5 sm:ect-p-6" @submit.prevent="submitAddress">
              <div class="ect-mb-5 ect-flex ect-items-center ect-justify-between">
                <h3 class="ect-font-display ect-text-xl ect-font-light ect-text-charcoal">{{ editingAddressId ? 'Edit address' : 'Add new address' }}</h3>
                <button type="button" class="ect-font-body ect-text-xs ect-text-charcoal/50 hover:ect-text-charcoal" @click="closeAddressForm">Cancel</button>
              </div>
              <div class="ect-grid ect-grid-cols-1 sm:ect-grid-cols-2 ect-gap-4">
                <label class="ect-block"><span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-medium ect-text-charcoal/60">Address label *</span><input v-model="addressForm.label" required placeholder="Home, Office…" class="ect-w-full ect-rounded-xl ect-border ect-border-sand ect-bg-cream ect-px-4 ect-py-3 ect-font-body ect-text-sm focus:ect-border-gold-400 focus:ect-outline-none" /></label>
                <label class="ect-block"><span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-medium ect-text-charcoal/60">Full name *</span><input v-model="addressForm.name" required class="ect-w-full ect-rounded-xl ect-border ect-border-sand ect-bg-cream ect-px-4 ect-py-3 ect-font-body ect-text-sm focus:ect-border-gold-400 focus:ect-outline-none" /></label>
                <label class="ect-block"><span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-medium ect-text-charcoal/60">Email *</span><input v-model="addressForm.email" required type="email" class="ect-w-full ect-rounded-xl ect-border ect-border-sand ect-bg-cream ect-px-4 ect-py-3 ect-font-body ect-text-sm focus:ect-border-gold-400 focus:ect-outline-none" /></label>
                <label class="ect-block"><span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-medium ect-text-charcoal/60">Phone *</span><input v-model="addressForm.phone" required type="tel" class="ect-w-full ect-rounded-xl ect-border ect-border-sand ect-bg-cream ect-px-4 ect-py-3 ect-font-body ect-text-sm focus:ect-border-gold-400 focus:ect-outline-none" /></label>
                <label class="ect-block sm:ect-col-span-2"><span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-medium ect-text-charcoal/60">Street address *</span><input v-model="addressForm.address" required class="ect-w-full ect-rounded-xl ect-border ect-border-sand ect-bg-cream ect-px-4 ect-py-3 ect-font-body ect-text-sm focus:ect-border-gold-400 focus:ect-outline-none" /></label>
                <label class="ect-block"><span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-medium ect-text-charcoal/60">City *</span><input v-model="addressForm.city" required class="ect-w-full ect-rounded-xl ect-border ect-border-sand ect-bg-cream ect-px-4 ect-py-3 ect-font-body ect-text-sm focus:ect-border-gold-400 focus:ect-outline-none" /></label>
                <label class="ect-block"><span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-medium ect-text-charcoal/60">State / Province *</span><input v-model="addressForm.state" required class="ect-w-full ect-rounded-xl ect-border ect-border-sand ect-bg-cream ect-px-4 ect-py-3 ect-font-body ect-text-sm focus:ect-border-gold-400 focus:ect-outline-none" /></label>
                <label class="ect-block"><span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-medium ect-text-charcoal/60">Country *</span><select v-model="addressForm.country" required class="ect-w-full ect-rounded-xl ect-border ect-border-sand ect-bg-cream ect-px-4 ect-py-3 ect-font-body ect-text-sm focus:ect-border-gold-400 focus:ect-outline-none"><option v-for="country in COUNTRY_OPTIONS" :key="country.code" :value="country.code">{{ country.name }}</option></select></label>
                <label class="ect-block"><span class="ect-mb-1.5 ect-block ect-font-body ect-text-xs ect-font-medium ect-text-charcoal/60">Postal code *</span><input v-model="addressForm.pincode" required class="ect-w-full ect-rounded-xl ect-border ect-border-sand ect-bg-cream ect-px-4 ect-py-3 ect-font-body ect-text-sm focus:ect-border-gold-400 focus:ect-outline-none" /></label>
              </div>
              <button type="submit" class="ect-mt-5 ect-rounded-xl ect-bg-gold-600 ect-px-6 ect-py-3 ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.12em] ect-text-white hover:ect-bg-gold-700 ect-transition-colors">{{ editingAddressId ? 'Save changes' : 'Save address' }}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
