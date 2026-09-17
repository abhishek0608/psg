<script setup lang="ts">
import { ref } from 'vue'

const name = ref('')
const email = ref('')
const message = ref('')
const submitted = ref(false)

function handleSubmit() {
  submitted.value = true
}
</script>

<template>
  <section class="ect-min-h-screen ect-bg-cream ect-pt-28 sm:ect-pt-36 ect-pb-20 ect-px-4 sm:ect-px-6">
    <div class="ect-max-w-5xl ect-mx-auto">
      <header class="ect-mb-10 sm:ect-mb-12">
        <h1 class="ect-font-display ect-text-3xl sm:ect-text-4xl ect-text-charcoal ect-mb-3">Customer support</h1>
        <p class="ect-font-body ect-text-base ect-text-charcoal/65 ect-max-w-xl">
          For help with an order, sizing, repairs or returns, call or write to us. We reply within one working day.
        </p>
      </header>

      <div class="ect-grid ect-grid-cols-1 lg:ect-grid-cols-[1fr_1.5fr] ect-gap-10 lg:ect-gap-16">
        <dl class="ect-m-0 ect-space-y-6 ect-font-body ect-text-sm">
          <div>
            <dt class="ect-text-charcoal/50 ect-mb-1">Phone</dt>
            <dd class="ect-m-0"><a href="tel:+919216399116" class="ect-text-charcoal hover:ect-text-[#1f3f37] ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6]">+91 92163 99116</a></dd>
          </div>
          <div>
            <dt class="ect-text-charcoal/50 ect-mb-1">Email</dt>
            <dd class="ect-m-0"><a href="mailto:sales@jewelet.example" class="ect-text-charcoal hover:ect-text-[#1f3f37] ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6]">sales@jewelet.example</a></dd>
          </div>
          <div>
            <dt class="ect-text-charcoal/50 ect-mb-1">Hours</dt>
            <dd class="ect-m-0 ect-text-charcoal ect-leading-relaxed">Monday to Saturday, 10am to 8pm<br />Sunday, 11am to 6pm</dd>
          </div>
          <div>
            <dt class="ect-text-charcoal/50 ect-mb-1">Office</dt>
            <dd class="ect-m-0 ect-text-charcoal ect-leading-relaxed">SEZ-2, Sitapura Industrial Area<br />Jaipur, Rajasthan 302022</dd>
          </div>
          <div>
            <dt class="ect-text-charcoal/50 ect-mb-1">Prefer to talk it through?</dt>
            <dd class="ect-m-0"><RouterLink to="/video-consultation" class="ect-text-charcoal hover:ect-text-[#1f3f37] ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6]">Book a video call</RouterLink></dd>
          </div>
        </dl>

        <div class="ect-bg-white ect-border ect-border-sand ect-rounded-lg ect-p-6 sm:ect-p-8">
          <template v-if="!submitted">
            <h2 class="ect-font-display ect-text-2xl ect-text-charcoal ect-mb-5">Send a message</h2>
            <form @submit.prevent="handleSubmit" class="ect-space-y-4">
              <label class="ect-block">
                <span class="ect-font-body ect-text-sm ect-text-charcoal/70 ect-mb-1.5 ect-block">Name</span>
                <input
                  v-model="name"
                  type="text"
                  required
                  class="ect-w-full ect-px-3.5 ect-py-2.5 ect-bg-white ect-border ect-border-sand ect-rounded-md ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-border-[#1f3f37]"
                />
              </label>
              <label class="ect-block">
                <span class="ect-font-body ect-text-sm ect-text-charcoal/70 ect-mb-1.5 ect-block">Email</span>
                <input
                  v-model="email"
                  type="email"
                  required
                  class="ect-w-full ect-px-3.5 ect-py-2.5 ect-bg-white ect-border ect-border-sand ect-rounded-md ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-border-[#1f3f37]"
                />
              </label>
              <label class="ect-block">
                <span class="ect-font-body ect-text-sm ect-text-charcoal/70 ect-mb-1.5 ect-block">Message</span>
                <textarea
                  v-model="message"
                  required
                  rows="5"
                  class="ect-w-full ect-px-3.5 ect-py-2.5 ect-bg-white ect-border ect-border-sand ect-rounded-md ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-border-[#1f3f37] ect-resize-none"
                />
              </label>
              <button
                type="submit"
                class="ect-px-6 ect-py-2.5 ect-bg-[#1f3f37] ect-text-white ect-font-body ect-text-sm ect-font-medium ect-rounded-md hover:ect-bg-[#17342d]"
              >Send</button>
            </form>
          </template>
          <template v-else>
            <h2 class="ect-font-display ect-text-2xl ect-text-charcoal ect-mb-2">Message sent</h2>
            <p class="ect-font-body ect-text-sm ect-text-charcoal/65">We'll reply to {{ email || 'your email' }} within one working day.</p>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
