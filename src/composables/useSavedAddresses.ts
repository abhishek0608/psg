import { ref, computed } from 'vue'

const STORAGE_KEY = 'jewelet-saved-addresses-v1'

export const COUNTRY_OPTIONS = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'OTHER', name: 'Other' },
] as const

export function countryDisplayName(code: string): string {
  return COUNTRY_OPTIONS.find((c) => c.code === code)?.name ?? code
}

export interface SavedAddressEntry {
  id: string
  label: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  pincode: string
  /** Set every time the entry is used to place an order, so checkout can offer the latest one first. */
  lastUsedAt?: string
}

/** The fields that identify a delivery destination, ignoring its label. */
type AddressDetails = Pick<SavedAddressEntry, 'address' | 'city' | 'pincode' | 'phone'>

function matchKey(a: AddressDetails): string {
  return [a.address, a.city, a.pincode, a.phone]
    .map((v) => String(v || '').trim().toLocaleLowerCase().replace(/\s+/g, ' '))
    .join('|')
}

function load(): SavedAddressEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is SavedAddressEntry =>
        x &&
        typeof x === 'object' &&
        typeof (x as SavedAddressEntry).id === 'string' &&
        typeof (x as SavedAddressEntry).label === 'string'
    )
  } catch {
    return []
  }
}

const addresses = ref<SavedAddressEntry[]>(load())

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses.value))
  } catch {
    // storage full or disabled
  }
}

function generateId(): string {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function useSavedAddresses() {
  const sorted = computed(() =>
    [...addresses.value].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
  )

  // Most recently ordered-to first, so the address a shopper is likeliest to
  // reuse sits at the top of the checkout picker.
  const recent = computed(() =>
    [...addresses.value].sort(
      (a, b) =>
        (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? '') ||
        a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    )
  )

  function getById(id: string): SavedAddressEntry | undefined {
    return addresses.value.find((a) => a.id === id)
  }

  /** Finds an already-saved entry pointing at the same destination. */
  function findMatching(details: AddressDetails): SavedAddressEntry | undefined {
    const key = matchKey(details)
    return addresses.value.find((a) => matchKey(a) === key)
  }

  /** Returns a label that does not collide with an existing one. */
  function uniqueLabel(base: string): string {
    const wanted = base.trim() || 'My address'
    const taken = new Set(addresses.value.map((a) => a.label.trim().toLocaleLowerCase()))
    if (!taken.has(wanted.toLocaleLowerCase())) return wanted
    let n = 2
    while (taken.has(`${wanted} ${n}`.toLocaleLowerCase())) n += 1
    return `${wanted} ${n}`
  }

  function save(entry: Omit<SavedAddressEntry, 'id'> & { id?: string }): string {
    const id = entry.id ?? generateId()
    const idx = addresses.value.findIndex((a) => a.id === id)
    const existing = idx >= 0 ? addresses.value[idx] : undefined
    const full: SavedAddressEntry = { ...entry, id, lastUsedAt: entry.lastUsedAt ?? existing?.lastUsedAt }
    if (idx >= 0) addresses.value[idx] = full
    else addresses.value.unshift(full)
    persist()
    return id
  }

  /** Marks an entry as just used so it leads the picker next time. */
  function touch(id: string) {
    const entry = addresses.value.find((a) => a.id === id)
    if (!entry) return
    entry.lastUsedAt = new Date().toISOString()
    persist()
  }

  function remove(id: string) {
    addresses.value = addresses.value.filter((a) => a.id !== id)
    persist()
  }

  return { addresses: sorted, recentAddresses: recent, getById, findMatching, uniqueLabel, save, touch, remove }
}
