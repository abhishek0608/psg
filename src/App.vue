<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import ChatWidget from './components/ChatWidget.vue'
import { ensureSiteConfigLoaded } from './composables/useSiteConfig'

onMounted(() => {
  void ensureSiteConfigLoaded()
})

const route = useRoute()
const isChatRoute = computed(() => route.name === 'chat')
const isInternalPath = computed(
  () => typeof route.path === 'string' && route.path.startsWith('/internal'),
)
</script>

<template>
  <AppHeader />
  <main>
    <RouterView />
  </main>
  <AppFooter v-if="!isChatRoute && !isInternalPath" />
  <ChatWidget v-if="!isChatRoute && !isInternalPath" />
</template>
