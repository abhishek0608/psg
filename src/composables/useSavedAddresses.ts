import { ref, computed, watch } from 'vue'
import { useAuth } from './useAuth'
import { API_BASE } from '../config-api'

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

// Signed-in shoppers keep their addresses on the account so they are there on
// every device; guests fall back to this browser's storage. `accountId` says
// which of the two the in-memory list currently represents.
const accountId = ref<string | null>(null)
let syncBound = false

function persist() {
  // Never mirror an account's addresses into shared browser storage — the next
  // guest on this device would inherit them.
  if (accountId.value) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses.value))
  } catch {
    // storage full or disabled
  }
}

function generateId(): string {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function readAddressList(data: unknown): SavedAddressEntry[] {
  const list = (data as { addresses?: unknown })?.addresses
  return Array.isArray(list) ? (list as SavedAddressEntry[]) : []
}

async function fetchFromServer(userId: string): Promise<SavedAddressEntry[]> {
  const res = await fetch(
    `${API_BASE}/api/account?mode=addresses&userId=${encodeURIComponent(userId)}`,
  )
  if (!res.ok) throw new Error('Unable to load saved addresses.')
  return readAddressList(await res.json())
}

async function postToServer(userId: string, payload: Record<string, unknown>): Promise<SavedAddressEntry[]> {
  const res = await fetch(`${API_BASE}/api/account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'addresses', userId, ...payload }),
  })
  if (!res.ok) throw new Error('Unable to save address.')
  return readAddressList(await res.json())
}

/**
 * Moves addresses saved on this device before signing in onto the account, so
 * signing in adds to the list rather than appearing to lose it. Destinations
 * the account already holds are skipped.
 */
async function uploadGuestAddresses(userId: string, serverList: SavedAddressEntry[]) {
  const guests = load()
  if (!guests.length) return serverList
  const known = new Set(serverList.map(matchKey))
  let list = serverList
  for (const entry of guests.slice(0, 10)) {
    if (known.has(matchKey(entry))) continue
    known.add(matchKey(entry))
    const { id: _id, ...rest } = entry
    list = await postToServer(userId, { action: 'save', address: rest })
  }
  return list
}

async function syncFromServer(userId: string) {
  let list = await fetchFromServer(userId)
  list = await uploadGuestAddresses(userId, list)
  // A later sign-in may have won the race; only apply what still matches.
  if (accountId.value === userId) addresses.value = list
}

export function useSavedAddresses() {
  const { user } = useAuth()

  // One watcher for the whole app: swap the list whenever the signed-in user
  // changes, and fall back to the guest list on sign-out.
  if (!syncBound) {
    syncBound = true
    watch(
      () => user.value?.id || null,
      async (userId) => {
        accountId.value = userId
        if (!userId) {
          addresses.value = load()
          return
        }
        try {
          await syncFromServer(userId)
        } catch (err) {
          // Checkout still works off whatever is cached locally.
          console.error('Saved address sync failed:', err)
        }
      },
      { immediate: true },
    )
  }

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

  function saveLocally(entry: Omit<SavedAddressEntry, 'id'> & { id?: string }): string {
    const id = entry.id ?? generateId()
    const idx = addresses.value.findIndex((a) => a.id === id)
    const existing = idx >= 0 ? addresses.value[idx] : undefined
    const full: SavedAddressEntry = { ...entry, id, lastUsedAt: entry.lastUsedAt ?? existing?.lastUsedAt }
    if (idx >= 0) addresses.value[idx] = full
    else addresses.value.unshift(full)
    persist()
    return id
  }

  async function save(entry: Omit<SavedAddressEntry, 'id'> & { id?: string }): Promise<void> {
    const userId = accountId.value
    if (!userId) {
      saveLocally(entry)
      return
    }
    // Show the row straight away, then let the server's copy (with its real id)
    // replace it. On failure the optimistic row is rolled back.
    const optimisticId = saveLocally({ ...entry, id: entry.id ?? generateId() })
    try {
      const { id: _id, ...rest } = entry
      addresses.value = await postToServer(userId, {
        action: 'save',
        addressId: entry.id ?? '',
        address: rest,
      })
    } catch (err) {
      if (!entry.id) addresses.value = addresses.value.filter((a) => a.id !== optimisticId)
      throw err
    }
  }

  /** Marks an entry as just used so it leads the picker next time. */
  async function touch(id: string): Promise<void> {
    const entry = addresses.value.find((a) => a.id === id)
    if (!entry) return
    entry.lastUsedAt = new Date().toISOString()
    persist()
    const userId = accountId.value
    if (!userId) return
    addresses.value = await postToServer(userId, { action: 'touch', addressId: id })
  }

  async function remove(id: string): Promise<void> {
    addresses.value = addresses.value.filter((a) => a.id !== id)
    persist()
    const userId = accountId.value
    if (!userId) return
    addresses.value = await postToServer(userId, { action: 'remove', addressId: id })
  }

  return {
    addresses: sorted,
    recentAddresses: recent,
    isAccountSynced: computed(() => !!accountId.value),
    getById,
    findMatching,
    uniqueLabel,
    save,
    touch,
    remove,
  }
}
