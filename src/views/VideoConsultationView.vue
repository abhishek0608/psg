<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { createVideoCallBooking, type VideoCallChannel } from '../composables/useVideoCallBookings'
import { useVideoCallList } from '../composables/useVideoCallList'
import { useAuth } from '../composables/useAuth'
import { useSiteConfig } from '../composables/useSiteConfig'
import { formatInr } from '../utils/currency'

const { user, isLoggedIn } = useAuth()
const { items, count, maxItems, enabled, remove, clear } = useVideoCallList()
const { videoCallFee } = useSiteConfig()
const submitting = ref(false)
const errorMessage = ref('')
const reference = ref('')
const form = reactive({
  name: user.value?.name || '',
  email: user.value?.email || '',
  phone: '',
  channel: 'whatsapp' as VideoCallChannel,
  preferredTime: '',
  notes: '',
})

// A shopper who signs in mid-flow shouldn't have to retype what we already know.
watch(
  () => user.value,
  (current) => {
    if (!current) return
    if (!form.name.trim()) form.name = current.name
    if (!form.email.trim()) form.email = current.email
  },
)

const channels: { value: VideoCallChannel; label: string; hint: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp', hint: 'We’ll message you to fix a time.' },
  { value: 'call', label: 'Phone call', hint: 'We’ll call you to fix a time.' },
]

const listTotal = computed(() => items.reduce((sum, item) => sum + (item.priceValue || 0), 0))

async function submit() {
  errorMessage.value = ''
  if (!form.name.trim()) return void (errorMessage.value = 'Please enter your full name.')
  if (!/^\+?[\d\s()-]{7,20}$/.test(form.phone.trim())) return void (errorMessage.value = 'Please enter a valid mobile number.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return void (errorMessage.value = 'Please enter a valid email address.')
  submitting.value = true
  try {
    const booking = await createVideoCallBooking({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      contactChannel: form.channel,
      preferredTime: form.preferredTime.trim(),
      notes: form.notes.trim(),
      items: items.map((item) => ({ slug: item.slug, title: item.title, price: item.price, imageUrl: item.imageUrl })),
      userId: user.value?.id || null,
    })
    reference.value = booking.reference
    // The request now owns the shortlist; leaving it behind would have the next
    // request silently re-send the same pieces.
    clear()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not submit your request.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="ect-min-h-screen ect-bg-cream ect-pt-28 lg:ect-pt-32 ect-pb-16">
    <section class="ect-bg-charcoal ect-px-6 ect-py-14 sm:ect-py-20 ect-text-cream">
      <div class="ect-mx-auto ect-max-w-5xl ect-text-center">
        <p class="ect-mb-4 ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.2em] ect-text-gold-400">Personal jewellery guidance</p>
        <h1 class="ect-mb-5 ect-font-display ect-text-4xl sm:ect-text-6xl ect-font-light">Meet your jewellery expert online</h1>
        <p class="ect-mx-auto ect-max-w-2xl ect-font-body ect-text-base ect-leading-relaxed ect-text-cream/60">Shortlist the pieces you’d like to see, leave your number, and a jewellery specialist will reach out to set up a private video call.</p>
      </div>
    </section>

    <section v-if="!enabled" class="ect-mx-auto ect-max-w-3xl ect-px-5 ect-py-16 ect-text-center">
      <h2 class="ect-mb-3 ect-font-display ect-text-3xl ect-font-light ect-text-charcoal">Video consultations are paused</h2>
      <p class="ect-font-body ect-text-sm ect-text-charcoal/60">We’re not taking new consultation requests right now. Please check back soon.</p>
    </section>

    <section v-else class="ect-mx-auto ect-grid ect-max-w-6xl ect-gap-8 ect-px-5 ect-py-10 lg:ect-grid-cols-[1.05fr_0.95fr] lg:ect-py-14">
      <!-- Shortlist: the pieces the advisor will bring to the call -->
      <aside class="ect-self-start ect-rounded-3xl ect-bg-white ect-p-6 sm:ect-p-7 ect-ring-1 ect-ring-sand">
        <div class="ect-mb-5 ect-flex ect-items-baseline ect-justify-between ect-gap-3">
          <div>
            <p class="ect-mb-1 ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.16em] ect-text-gold-700">Your shortlist</p>
            <h2 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal">Pieces for this call</h2>
          </div>
          <span class="ect-shrink-0 ect-rounded-full ect-bg-cream ect-px-3 ect-py-1 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/60">{{ count }} / {{ maxItems }}</span>
        </div>

        <ul v-if="items.length" class="ect-grid ect-gap-3">
          <li v-for="item in items" :key="item.slug" class="ect-flex ect-items-center ect-gap-3 ect-rounded-2xl ect-border ect-border-sand ect-p-3">
            <RouterLink :to="`/product/${item.slug}`" class="ect-h-16 ect-w-16 ect-shrink-0 ect-overflow-hidden ect-rounded-xl ect-bg-champagne">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.title" loading="lazy" class="ect-h-full ect-w-full ect-object-cover" />
            </RouterLink>
            <div class="ect-min-w-0 ect-flex-1">
              <RouterLink :to="`/product/${item.slug}`" class="ect-block ect-truncate ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal hover:ect-text-gold-700">{{ item.title }}</RouterLink>
              <p class="ect-font-body ect-text-xs ect-text-charcoal/50">{{ item.priceValue > 0 ? item.price : 'Price on request' }}</p>
            </div>
            <button type="button" class="ect-rounded-full ect-p-2 ect-text-charcoal/30 hover:ect-bg-red-50 hover:ect-text-red-500 ect-transition-colors" :aria-label="`Remove ${item.title}`" @click="remove(item.slug)">
              <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </li>
        </ul>

        <p v-else class="ect-rounded-2xl ect-bg-cream ect-px-4 ect-py-6 ect-text-center ect-font-body ect-text-sm ect-text-charcoal/55">
          No pieces added yet. Browse the catalogue and use “Add to video call” on any product — you can bring up to {{ maxItems }}.
        </p>

        <div class="ect-mt-5 ect-flex ect-flex-wrap ect-items-center ect-gap-3 ect-border-t ect-border-sand ect-pt-5">
          <RouterLink to="/collections" class="ect-rounded-full ect-border ect-border-charcoal/15 ect-px-5 ect-py-2.5 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal hover:ect-border-gold-400 hover:ect-text-gold-700 ect-transition-colors">
            {{ items.length ? 'Add more pieces' : 'Browse the catalogue' }}
          </RouterLink>
          <button v-if="items.length" type="button" class="ect-font-body ect-text-sm ect-text-charcoal/45 hover:ect-text-red-600" @click="clear()">Clear all</button>
          <span v-if="listTotal > 0" class="ect-ml-auto ect-font-body ect-text-xs ect-text-charcoal/45">Shortlist value {{ formatInr(listTotal) }}</span>
        </div>

        <ul class="ect-mt-6 ect-grid ect-gap-3 ect-border-t ect-border-sand ect-pt-5 ect-font-body ect-text-sm ect-leading-relaxed ect-text-charcoal/65">
          <li><strong class="ect-block ect-text-charcoal">One-to-one guidance</strong>A specialist walks you through each piece live.</li>
          <li><strong class="ect-block ect-text-charcoal">No fixed slot to pick</strong>We contact you and fit the call around your day.</li>
          <li><strong class="ect-block ect-text-charcoal">Secure meeting link</strong>Sent to you once the time is agreed.</li>
        </ul>
      </aside>

      <!-- Request form: contact-first, no slot to choose -->
      <article class="ect-self-start ect-rounded-3xl ect-bg-white ect-p-6 sm:ect-p-8 ect-ring-1 ect-ring-sand">
        <div v-if="reference" class="ect-py-10 ect-text-center">
          <div class="ect-mx-auto ect-mb-5 ect-grid ect-h-16 ect-w-16 ect-place-items-center ect-rounded-full ect-bg-emerald-50 ect-text-3xl ect-text-emerald-700">✓</div>
          <p class="ect-mb-2 ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.18em] ect-text-gold-700">Request received</p>
          <h2 class="ect-mb-3 ect-font-display ect-text-3xl ect-text-charcoal">We’ll be in touch shortly</h2>
          <p class="ect-mb-6 ect-font-body ect-text-sm ect-text-charcoal/50">Reference: <strong class="ect-text-charcoal">{{ reference }}</strong></p>
          <p class="ect-mx-auto ect-max-w-md ect-font-body ect-text-sm ect-leading-relaxed ect-text-charcoal/60">
            A jewellery specialist will {{ form.channel === 'whatsapp' ? `message you on WhatsApp at ${form.phone}` : `call you on ${form.phone}` }} to agree a time, and the meeting link goes to {{ form.email }}.
          </p>
          <RouterLink to="/collections" class="ect-mt-7 ect-inline-flex ect-rounded-full ect-bg-charcoal ect-px-7 ect-py-3 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir">Continue browsing</RouterLink>
        </div>

        <form v-else class="ect-grid ect-gap-6" @submit.prevent="submit">
          <div>
            <h2 class="ect-font-display ect-text-2xl ect-font-light ect-text-charcoal">Request a call back</h2>
            <p class="ect-mt-1 ect-font-body ect-text-sm ect-text-charcoal/55">Tell us how to reach you and we’ll set up the consultation.</p>
            <p v-if="videoCallFee > 0" class="ect-mt-2 ect-font-body ect-text-sm ect-font-semibold ect-text-gold-700">Consultation fee {{ formatInr(videoCallFee) }}, adjusted against your purchase.</p>
          </div>

          <p v-if="!isLoggedIn" class="ect-rounded-2xl ect-bg-cream ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-charcoal/60">
            No account needed — just leave your details.
            <RouterLink to="/login" class="ect-font-semibold ect-text-gold-700 hover:ect-underline">Sign in</RouterLink> if you’d like the request saved to your account.
          </p>

          <fieldset :disabled="submitting" class="ect-grid sm:ect-grid-cols-2 ect-gap-4">
            <label class="ect-grid ect-gap-1.5 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70">Full name<input v-model="form.name" required autocomplete="name" class="ect-rounded-xl ect-border ect-border-sand ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-normal focus:ect-border-gold-400 focus:ect-outline-none" /></label>
            <label class="ect-grid ect-gap-1.5 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70">{{ form.channel === 'whatsapp' ? 'WhatsApp number' : 'Mobile number' }}<input v-model="form.phone" required autocomplete="tel" inputmode="tel" placeholder="+91 98765 43210" class="ect-rounded-xl ect-border ect-border-sand ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-normal focus:ect-border-gold-400 focus:ect-outline-none" /></label>
            <label class="ect-grid ect-gap-1.5 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 sm:ect-col-span-2">Email address<input v-model="form.email" required type="email" autocomplete="email" class="ect-rounded-xl ect-border ect-border-sand ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-normal focus:ect-border-gold-400 focus:ect-outline-none" /><span class="ect-font-normal ect-text-charcoal/45">We send the meeting link here.</span></label>

            <div class="sm:ect-col-span-2">
              <span class="ect-mb-2 ect-block ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70">How should we reach you?</span>
              <div class="ect-grid ect-gap-2 sm:ect-grid-cols-2">
                <button v-for="channel in channels" :key="channel.value" type="button" class="ect-rounded-xl ect-border ect-px-4 ect-py-3 ect-text-left ect-transition-colors" :class="form.channel === channel.value ? 'ect-border-charcoal ect-bg-charcoal ect-text-white' : 'ect-border-sand hover:ect-border-gold-400'" @click="form.channel = channel.value">
                  <span class="ect-block ect-font-body ect-text-sm ect-font-semibold">{{ channel.label }}</span>
                  <span class="ect-block ect-font-body ect-text-xs ect-opacity-60">{{ channel.hint }}</span>
                </button>
              </div>
            </div>

            <label class="ect-grid ect-gap-1.5 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 sm:ect-col-span-2">When are you usually free? (optional)<input v-model="form.preferredTime" maxlength="200" placeholder="Weekday evenings after 7 PM" class="ect-rounded-xl ect-border ect-border-sand ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-normal focus:ect-border-gold-400 focus:ect-outline-none" /></label>
            <label class="ect-grid ect-gap-1.5 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 sm:ect-col-span-2">What would you like to discuss? (optional)<textarea v-model="form.notes" rows="3" maxlength="1000" class="ect-resize-none ect-rounded-xl ect-border ect-border-sand ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-normal focus:ect-border-gold-400 focus:ect-outline-none" placeholder="A custom design, product advice, sizing…" /></label>
          </fieldset>

          <p class="ect-font-body ect-text-xs ect-text-charcoal/45">
            {{ count ? `${count} ${count === 1 ? 'piece' : 'pieces'} will be shared with your specialist before the call.` : 'You can request a call without shortlisting anything — we’ll help you find pieces on the call.' }}
          </p>

          <p v-if="errorMessage" role="alert" class="ect-rounded-xl ect-bg-red-50 ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-red-700">{{ errorMessage }}</p>
          <button type="submit" :disabled="submitting" class="ect-justify-self-end ect-rounded-full ect-bg-charcoal ect-px-8 ect-py-3.5 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir disabled:ect-opacity-50">{{ submitting ? 'Sending…' : 'Request a video call' }}</button>
        </form>
      </article>
    </section>
  </main>
</template>
