<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import { ensureSiteConfigLoaded } from './composables/useSiteConfig'

onMounted(() => {
  void ensureSiteConfigLoaded()
})

const route = useRoute()
const isInternalPath = computed(
  () => typeof route.path === 'string' && route.path.startsWith('/internal'),
)
</script>

<template>
  <AppHeader />
  <main>
    <RouterView />
  </main>
  <AppFooter v-if="!isInternalPath" />
</template>
