<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { createVideoCallBooking, fetchBookedVideoCallSlots } from '../composables/useVideoCallBookings'

const TZ = 'Asia/Kolkata'
const selectedDate = ref('')
const selectedSlot = ref('')
const booked = ref(new Set<string>())
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const reference = ref('')
const form = reactive({ name: '', email: '', phone: '', notes: '' })
const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

function dateKey(date: Date) {
  const parts = dateFormatter.formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

const dates = computed(() => {
  const start = new Date(`${dateKey(new Date())}T00:00:00+05:30`)
  return Array.from({ length: 14 }, (_, offset) => new Date(start.getTime() + offset * 86400000))
    .filter((date) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(date) !== 'Sun')
    .map((date) => ({
      value: dateKey(date),
      day: new Intl.DateTimeFormat('en-IN', { timeZone: TZ, weekday: 'short' }).format(date),
      label: new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short' }).format(date),
      full: new Intl.DateTimeFormat('en-IN', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(date),
    }))
})

const slots = computed(() => {
  if (!selectedDate.value) return []
  return Array.from({ length: 16 }, (_, index) => {
    const hour = 10 + Math.floor(index / 2)
    const minute = index % 2 ? 30 : 0
    const value = new Date(`${selectedDate.value}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`).toISOString()
    return {
      value,
      label: new Intl.DateTimeFormat('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value)),
      disabled: booked.value.has(value) || new Date(value).getTime() < Date.now() + 15 * 60000,
    }
  })
})

const selectedDateLabel = computed(() => dates.value.find((date) => date.value === selectedDate.value)?.full || '')
const selectedTimeLabel = computed(() => slots.value.find((slot) => slot.value === selectedSlot.value)?.label || '')

async function loadAvailability() {
  loading.value = true
  try {
    booked.value = new Set(await fetchBookedVideoCallSlots())
    for (const date of dates.value) {
      selectedDate.value = date.value
      if (slots.value.some((slot) => !slot.disabled)) break
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not load available slots.'
  } finally {
    loading.value = false
  }
}

async function submit() {
  errorMessage.value = ''
  if (!selectedSlot.value) return void (errorMessage.value = 'Please select an available time slot.')
  if (!form.name.trim()) return void (errorMessage.value = 'Please enter your full name.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return void (errorMessage.value = 'Please enter a valid email address.')
  if (!/^\+?[\d\s()-]{7,20}$/.test(form.phone.trim())) return void (errorMessage.value = 'Please enter a valid mobile number.')
  submitting.value = true
  try {
    const booking = await createVideoCallBooking({
      scheduledAt: selectedSlot.value,
      name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), notes: form.notes.trim(),
    })
    reference.value = booking.reference
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not book the video call.'
    await loadAvailability()
  } finally {
    submitting.value = false
  }
}

void loadAvailability()
</script>

<template>
  <main class="ect-min-h-screen ect-bg-cream ect-pt-28 lg:ect-pt-32 ect-pb-16">
    <section class="ect-bg-charcoal ect-px-6 ect-py-14 sm:ect-py-20 ect-text-cream">
      <div class="ect-mx-auto ect-max-w-5xl ect-text-center">
        <p class="ect-mb-4 ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.2em] ect-text-gold-400">Personal jewellery guidance</p>
        <h1 class="ect-mb-5 ect-font-display ect-text-4xl sm:ect-text-6xl ect-font-light">Meet your jewellery expert online</h1>
        <p class="ect-mx-auto ect-max-w-2xl ect-font-body ect-text-base ect-leading-relaxed ect-text-cream/60">A private 30-minute video consultation for design advice, customisation, sizing, gifting, or help choosing the perfect piece.</p>
      </div>
    </section>

    <section class="ect-mx-auto ect-grid ect-max-w-6xl ect-gap-8 ect-px-5 ect-py-10 lg:ect-grid-cols-[0.72fr_1.28fr] lg:ect-py-14">
      <aside class="ect-self-start ect-rounded-3xl ect-bg-white ect-p-7 ect-ring-1 ect-ring-sand lg:ect-sticky lg:ect-top-32">
        <p class="ect-mb-4 ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.16em] ect-text-gold-700">What to expect</p>
        <h2 class="ect-mb-5 ect-font-display ect-text-3xl ect-font-light ect-text-charcoal">Expert advice, from wherever you are</h2>
        <ul class="ect-grid ect-gap-4 ect-font-body ect-text-sm ect-leading-relaxed ect-text-charcoal/65">
          <li><strong class="ect-block ect-text-charcoal">One-to-one guidance</strong>Talk privately with a jewellery specialist.</li>
          <li><strong class="ect-block ect-text-charcoal">30 focused minutes</strong>Discuss products, designs, sizing, and custom requests.</li>
          <li><strong class="ect-block ect-text-charcoal">Secure meeting link</strong>We’ll email your video-call link before the appointment.</li>
        </ul>
        <p class="ect-mt-6 ect-border-t ect-border-sand ect-pt-5 ect-font-body ect-text-xs ect-text-charcoal/45">Available Monday–Saturday, 10:00 AM–6:00 PM IST. No payment required.</p>
      </aside>

      <article class="ect-rounded-3xl ect-bg-white ect-p-6 sm:ect-p-8 ect-ring-1 ect-ring-sand">
        <div v-if="reference" class="ect-py-12 ect-text-center">
          <div class="ect-mx-auto ect-mb-5 ect-grid ect-h-16 ect-w-16 ect-place-items-center ect-rounded-full ect-bg-emerald-50 ect-text-3xl ect-text-emerald-700">✓</div>
          <p class="ect-mb-2 ect-font-body ect-text-xs ect-font-semibold ect-uppercase ect-tracking-[0.18em] ect-text-gold-700">Booking confirmed</p>
          <h2 class="ect-mb-3 ect-font-display ect-text-3xl ect-text-charcoal">Your video consultation is booked</h2>
          <p class="ect-font-body ect-text-sm ect-text-charcoal/65">{{ selectedDateLabel }} at {{ selectedTimeLabel }} IST</p>
          <p class="ect-mb-6 ect-font-body ect-text-sm ect-text-charcoal/50">Reference: <strong class="ect-text-charcoal">{{ reference }}</strong></p>
          <p class="ect-mx-auto ect-max-w-md ect-font-body ect-text-sm ect-leading-relaxed ect-text-charcoal/60">We’ll send the video-call link to {{ form.email }} before your appointment.</p>
        </div>

        <form v-else class="ect-grid ect-gap-8" @submit.prevent="submit">
          <fieldset :disabled="loading || submitting">
            <legend class="ect-mb-3 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">1. Choose a date</legend>
            <div class="ect-grid ect-grid-cols-3 sm:ect-grid-cols-6 ect-gap-2">
              <button v-for="date in dates" :key="date.value" type="button" class="ect-rounded-xl ect-border ect-px-2 ect-py-3 ect-transition-colors" :class="selectedDate === date.value ? 'ect-border-charcoal ect-bg-charcoal ect-text-white' : 'ect-border-sand hover:ect-border-gold-400'" @click="selectedDate = date.value; selectedSlot = ''">
                <span class="ect-block ect-font-body ect-text-[11px] ect-uppercase ect-opacity-60">{{ date.day }}</span><span class="ect-block ect-font-body ect-text-sm ect-font-semibold">{{ date.label }}</span>
              </button>
            </div>
          </fieldset>

          <fieldset :disabled="loading || submitting">
            <legend class="ect-mb-3 ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">2. Choose a time</legend>
            <p v-if="loading" class="ect-font-body ect-text-sm ect-text-charcoal/45">Loading available times…</p>
            <div v-else class="ect-grid ect-grid-cols-3 sm:ect-grid-cols-4 ect-gap-2">
              <button v-for="slot in slots" :key="slot.value" type="button" :disabled="slot.disabled" class="ect-rounded-xl ect-border ect-px-2 ect-py-2.5 ect-font-body ect-text-sm ect-font-semibold disabled:ect-cursor-not-allowed disabled:ect-bg-cream disabled:ect-text-charcoal/25" :class="selectedSlot === slot.value ? 'ect-border-charcoal ect-bg-charcoal ect-text-white' : 'ect-border-sand hover:ect-border-gold-400'" @click="selectedSlot = slot.value">{{ slot.label }}</button>
            </div>
          </fieldset>

          <fieldset :disabled="submitting" class="ect-grid sm:ect-grid-cols-2 ect-gap-4">
            <legend class="ect-col-span-full ect-font-body ect-text-sm ect-font-semibold ect-text-charcoal">3. Your details</legend>
            <label class="ect-grid ect-gap-1.5 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70">Full name<input v-model="form.name" required autocomplete="name" class="ect-rounded-xl ect-border ect-border-sand ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-normal focus:ect-border-gold-400 focus:ect-outline-none" /></label>
            <label class="ect-grid ect-gap-1.5 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70">Mobile number<input v-model="form.phone" required autocomplete="tel" inputmode="tel" class="ect-rounded-xl ect-border ect-border-sand ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-normal focus:ect-border-gold-400 focus:ect-outline-none" /></label>
            <label class="ect-grid ect-gap-1.5 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 sm:ect-col-span-2">Email address<input v-model="form.email" required type="email" autocomplete="email" class="ect-rounded-xl ect-border ect-border-sand ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-normal focus:ect-border-gold-400 focus:ect-outline-none" /></label>
            <label class="ect-grid ect-gap-1.5 ect-font-body ect-text-xs ect-font-semibold ect-text-charcoal/70 sm:ect-col-span-2">What would you like to discuss? (optional)<textarea v-model="form.notes" rows="3" maxlength="1000" class="ect-resize-none ect-rounded-xl ect-border ect-border-sand ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-font-normal focus:ect-border-gold-400 focus:ect-outline-none" placeholder="A custom design, product advice, sizing…" /></label>
          </fieldset>

          <p v-if="errorMessage" role="alert" class="ect-rounded-xl ect-bg-red-50 ect-px-4 ect-py-3 ect-font-body ect-text-sm ect-text-red-700">{{ errorMessage }}</p>
          <button type="submit" :disabled="loading || submitting" class="ect-justify-self-end ect-rounded-full ect-bg-charcoal ect-px-8 ect-py-3.5 ect-font-body ect-text-sm ect-font-semibold ect-text-white hover:ect-bg-noir disabled:ect-opacity-50">{{ submitting ? 'Booking…' : 'Confirm booking' }}</button>
        </form>
      </article>
    </section>
  </main>
</template>
