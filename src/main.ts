import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { loadPaymentConfig } from './config/payment'
import { ensureHomepageSlidesLoaded } from './composables/useHomepageSlides'
import { useContentProtection } from './composables/useContentProtection'

// Install casual image-copy deterrents (right-click, drag, save shortcuts).
// Note: this cannot block OS-level screenshots — see the composable's header.
useContentProtection()

// Kick the homepage banner fetch off immediately, in parallel with the app
// boot, so the request is already in flight before the Hero component mounts.
void ensureHomepageSlidesLoaded()

// Mount right away. Payment config is only needed at checkout, so loading it in
// the background avoids blocking first paint (and the banner) on its fetch.
void loadPaymentConfig()
createApp(App).use(router).mount('#app')
