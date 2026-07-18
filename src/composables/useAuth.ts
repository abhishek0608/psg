import { reactive, computed } from 'vue'
import { API_BASE } from '../config-api'

const AUTH_STORAGE_KEY = 'jewelet-auth-user'

interface User {
  id: string
  name: string
  email: string
  isInternal?: boolean
  isAdmin?: boolean
}

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as User
    if (parsed?.id && parsed?.name && parsed?.email) return parsed
  } catch {
    // ignore invalid or missing storage
  }
  return null
}

const state = reactive<{ user: User | null }>({ user: loadStoredUser() })

export function useAuth() {
  const isLoggedIn = computed(() => !!state.user)
  const isInternalUser = computed(() => Boolean(state.user?.isInternal || state.user?.isAdmin))
  const isAdminUser = computed(() => Boolean(state.user?.isAdmin))
  const user = computed(() => state.user)

  function setUser(userData: User | null) {
    state.user = userData
    try {
      if (userData) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData))
      else localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      // storage full or disabled
    }
  }

  async function signin(email: string, password?: string) {
    const res = await fetch(`${API_BASE}/api/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'signin', email, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Unable to sign in.')
    setUser(data.user)
    return data.user as User
  }

  async function signup(name: string, email: string, password?: string) {
    const res = await fetch(`${API_BASE}/api/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'signup', name, email, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Unable to sign up.')
    setUser(data.user)
    return data.user as User
  }

  async function requestPasswordReset(email: string) {
    const res = await fetch(`${API_BASE}/api/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'reset-request', email }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Unable to send reset link.')
    return data?.message as string
  }

  async function resetPassword(token: string, password: string) {
    const res = await fetch(`${API_BASE}/api/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'reset-confirm', token, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Unable to reset password.')
    return data?.message as string
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!state.user?.id) throw new Error('You must be signed in to change your password.')
    const res = await fetch(`${API_BASE}/api/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'change-password',
        userId: state.user.id,
        currentPassword,
        newPassword,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Unable to change password.')
    return data?.message as string
  }

  async function refreshCurrentUser() {
    if (!state.user?.id) return null
    const res = await fetch(
      `${API_BASE}/api/account?mode=profile&userId=${encodeURIComponent(state.user.id)}`,
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Unable to refresh account.')
    setUser(data.user)
    return data.user as User
  }

  // Backward-compatible alias for older calls.
  async function login(name: string, email: string) {
    if (name?.trim()) return signup(name, email)
    return signin(email)
  }

  function logout() {
    setUser(null)
  }

  return { user, isLoggedIn, isInternalUser, isAdminUser, login, signin, signup, requestPasswordReset, resetPassword, changePassword, refreshCurrentUser, logout, setUser }
}
