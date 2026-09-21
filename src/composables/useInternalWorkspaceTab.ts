import { computed } from 'vue'
import { useRoute } from 'vue-router'

export type InternalWorkspaceTabId = 'orders' | 'video-calls' | 'users' | 'products' | 'homepage' | 'about' | 'branding' | 'offers' | 'new'

export function useInternalWorkspaceTab() {
  const route = useRoute()
  const activeTabId = computed<InternalWorkspaceTabId>(() => {
    if (route.name === 'internal-order') return 'orders'
    if (route.name === 'internal-user') return 'users'
    if (route.name === 'internal-product' && String(route.params.slug || '') === 'new') return 'new'
    if (route.name === 'internal-product') return 'products'
    const raw = route.query.tab
    const s = Array.isArray(raw) ? raw[0] : raw
    if (s === 'orders' || s === 'video-calls' || s === 'users' || s === 'products' || s === 'homepage' || s === 'about' || s === 'branding' || s === 'offers') return s
    return 'orders'
  })
  return { activeTabId }
}
