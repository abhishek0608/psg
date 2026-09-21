<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSiteConfig } from '../composables/useSiteConfig'

const { aboutContent, ensureSiteConfigLoaded } = useSiteConfig()

type Tab = 'about' | 'contact' | 'careers'
const activeTab = ref<Tab>('about')
const name = ref('')
const email = ref('')
const message = ref('')
const submitted = ref(false)

const values = [
  { title: 'Craftsmanship', desc: 'Careful setting and finishing on every piece, checked by hand before it ships.' },
  { title: 'Design', desc: 'Contemporary pieces meant to be worn often, not kept for occasions.' },
  { title: 'Service', desc: 'Help with sizing, stones and budgets, by phone, email or video call.' },
]

// Defaults until photos and copy are set from Internal → About page.
const defaultJourney = [
  {
    year: '',
    place: 'Bangkok',
    title: 'Where we started',
    desc: 'Jewelet was started in Bangkok, a city with a long jewellery trade. We design there and work with workshops we know well.',
    imageUrl: '/pendant-1.jpg',
  },
  {
    year: '',
    place: 'How we make things',
    title: 'Stone, setting, finish',
    desc: 'Each design is worked out around the stone first, then the setting, then how it sits on the hand or neck. Nothing is added that does not need to be there.',
    imageUrl: '/earring-1.jpg',
  },
  {
    year: '',
    place: 'Buying from us',
    title: 'Straightforward pricing',
    desc: 'Metal rate, making charges and taxes are listed on every product page. Gold is BIS hallmarked and stones are certified.',
    imageUrl: '/necklace-1.jpg',
  },
]

const heroEyebrow = computed(() => aboutContent.value.heroEyebrow || 'About Jewelet')
const heroHeadline = computed(() => aboutContent.value.heroHeadline || 'Gold and diamond jewellery, made to be worn')
const heroSubheadline = computed(
  () => aboutContent.value.heroSubheadline || 'Designed in Bangkok. Certified, priced openly, and shipped across India.',
)

const journey = computed(() => {
  const configured = aboutContent.value.journey.filter((step) => step.active)
  return configured.length ? configured : defaultJourney
})

const team = computed(() => aboutContent.value.team.filter((member) => member.active))

function handleSubmit() {
  submitted.value = true
}

function setTab(tab: Tab) {
  activeTab.value = tab
  window.scrollTo({ top: 0 })
}

onMounted(() => {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'contact' || hash === 'careers') activeTab.value = hash
  void ensureSiteConfigLoaded()
})
</script>

<template>
  <main class="ect-min-h-screen ect-bg-cream ect-pt-28 lg:ect-pt-44">

    <!-- Page header -->
    <section class="ect-bg-[#1a1613] ect-text-cream ect-px-6 ect-py-16 sm:ect-py-20">
      <div class="ect-max-w-4xl ect-mx-auto ect-text-center">
        <template v-if="activeTab === 'about'">
          <p class="ect-font-body ect-text-sm ect-text-cream/60 ect-mb-4">{{ heroEyebrow }}</p>
          <h1 class="ect-font-display ect-text-4xl sm:ect-text-5xl ect-leading-tight ect-mb-5">{{ heroHeadline }}</h1>
          <p class="ect-font-body ect-text-base ect-text-cream/70 ect-max-w-xl ect-mx-auto ect-leading-relaxed">{{ heroSubheadline }}</p>
        </template>
        <template v-else>
          <h1 class="ect-font-display ect-text-4xl sm:ect-text-5xl ect-leading-tight">
            {{ activeTab === 'contact' ? 'Contact us' : 'Careers' }}
          </h1>
        </template>
      </div>
    </section>

    <!-- Tabs -->
    <nav id="about-tabs" class="ect-sticky ect-top-[calc(theme(spacing.16)+theme(spacing.8))] sm:ect-top-16 ect-z-40 ect-bg-cream/95 ect-backdrop-blur ect-border-b ect-border-sand">
      <ul class="ect-max-w-6xl ect-mx-auto ect-px-6 ect-flex ect-justify-center ect-gap-8 ect-list-none ect-m-0 ect-p-0">
        <li v-for="tab in (['about', 'contact', 'careers'] as const)" :key="tab">
          <button
            type="button"
            @click="setTab(tab)"
            class="ect-relative ect-py-4 ect-font-body ect-text-sm ect-bg-transparent"
            :class="activeTab === tab ? 'ect-text-charcoal' : 'ect-text-charcoal/50 hover:ect-text-charcoal'"
          >
            {{ tab === 'about' ? 'Our story' : tab === 'contact' ? 'Contact' : 'Careers' }}
            <span class="ect-absolute ect-bottom-0 ect-left-0 ect-right-0 ect-h-0.5" :class="activeTab === tab ? 'ect-bg-charcoal' : 'ect-bg-transparent'" />
          </button>
        </li>
      </ul>
    </nav>

    <!-- About -->
    <template v-if="activeTab === 'about'">
      <section class="ect-max-w-3xl ect-mx-auto ect-px-6 ect-py-16 sm:ect-py-20">
        <p class="ect-font-body ect-text-lg sm:ect-text-xl ect-leading-relaxed ect-text-charcoal">
          Jewelet is a small jewellery business. We design gold and diamond pieces for everyday wear and for occasions,
          sell them online, and talk to customers directly when they want help choosing. Prices are broken down on every
          product page, gold is BIS hallmarked, and stones come with certificates.
        </p>
      </section>

      <section class="ect-max-w-6xl ect-mx-auto ect-px-6 ect-pb-8">
        <article
          v-for="(step, i) in journey"
          :key="`${step.title}-${i}`"
          class="ect-grid ect-grid-cols-1 lg:ect-grid-cols-2 ect-gap-8 lg:ect-gap-16 ect-items-center ect-mb-16 sm:ect-mb-20"
        >
          <figure class="ect-relative ect-overflow-hidden ect-aspect-[4/3] ect-bg-[#f3ece0] ect-m-0" :class="i % 2 === 1 ? 'lg:ect-order-2' : ''">
            <img v-if="step.imageUrl" :src="step.imageUrl" :alt="step.title" class="ect-w-full ect-h-full ect-object-cover" loading="lazy" />
            <figcaption v-if="step.year" class="ect-absolute ect-bottom-0 ect-left-0 ect-bg-[#1a1613] ect-text-cream ect-font-body ect-text-sm ect-px-4 ect-py-2">
              {{ step.year }}
            </figcaption>
          </figure>
          <div :class="i % 2 === 1 ? 'lg:ect-order-1' : ''">
            <p v-if="step.place" class="ect-font-body ect-text-sm ect-text-charcoal/50 ect-mb-2">{{ step.place }}</p>
            <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-text-charcoal ect-mb-4">{{ step.title }}</h2>
            <p class="ect-font-body ect-text-base ect-text-charcoal/70 ect-leading-relaxed">{{ step.desc }}</p>
          </div>
        </article>
      </section>

      <section v-if="team.length" class="ect-max-w-6xl ect-mx-auto ect-px-6 ect-pb-16 sm:ect-pb-20">
        <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-text-charcoal ect-mb-8">The team</h2>
        <ul class="ect-grid ect-grid-cols-2 sm:ect-grid-cols-3 lg:ect-grid-cols-4 ect-gap-x-6 ect-gap-y-10 ect-list-none ect-m-0 ect-p-0">
          <li v-for="(member, i) in team" :key="`${member.name}-${i}`">
            <figure class="ect-overflow-hidden ect-aspect-[3/4] ect-bg-[#f3ece0] ect-m-0 ect-mb-3">
              <img v-if="member.imageUrl" :src="member.imageUrl" :alt="member.name || 'Team member'" class="ect-w-full ect-h-full ect-object-cover" loading="lazy" />
            </figure>
            <h3 class="ect-font-body ect-text-base ect-font-medium ect-text-charcoal">{{ member.name }}</h3>
            <p v-if="member.role" class="ect-font-body ect-text-sm ect-text-charcoal/55">{{ member.role }}</p>
          </li>
        </ul>
      </section>

      <section class="ect-max-w-6xl ect-mx-auto ect-px-6 ect-pb-20 sm:ect-pb-24">
        <ul class="ect-grid ect-grid-cols-1 sm:ect-grid-cols-3 ect-gap-8 ect-list-none ect-m-0 ect-p-0 ect-border-t ect-border-sand ect-pt-8">
          <li v-for="v in values" :key="v.title">
            <h3 class="ect-font-body ect-text-base ect-font-medium ect-text-charcoal ect-mb-2">{{ v.title }}</h3>
            <p class="ect-font-body ect-text-sm ect-text-charcoal/65 ect-leading-relaxed">{{ v.desc }}</p>
          </li>
        </ul>
        <p class="ect-mt-10 ect-font-body ect-text-sm">
          <RouterLink to="/collections" class="ect-text-charcoal ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6] hover:ect-text-[#1f3f37]">Browse the collection</RouterLink>
        </p>
      </section>
    </template>

    <!-- Contact -->
    <section v-else-if="activeTab === 'contact'" class="ect-max-w-5xl ect-mx-auto ect-px-6 ect-py-14 sm:ect-py-16">
      <div class="ect-grid ect-grid-cols-1 lg:ect-grid-cols-[1fr_1.5fr] ect-gap-10 lg:ect-gap-16">
        <dl class="ect-m-0 ect-space-y-6 ect-font-body ect-text-sm">
          <div>
            <dt class="ect-text-charcoal/50 ect-mb-1">Phone</dt>
            <dd class="ect-m-0"><a href="tel:+919216399116" class="ect-text-charcoal ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6] hover:ect-text-[#1f3f37]">+91 92163 99116</a></dd>
          </div>
          <div>
            <dt class="ect-text-charcoal/50 ect-mb-1">Email</dt>
            <dd class="ect-m-0"><a href="mailto:sales@jewelet.example" class="ect-text-charcoal ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6] hover:ect-text-[#1f3f37]">sales@jewelet.example</a></dd>
          </div>
          <div>
            <dt class="ect-text-charcoal/50 ect-mb-1">Hours</dt>
            <dd class="ect-m-0 ect-text-charcoal ect-leading-relaxed">Monday to Saturday, 10am to 8pm<br />Sunday, 11am to 6pm</dd>
          </div>
          <div>
            <dt class="ect-text-charcoal/50 ect-mb-1">Office</dt>
            <dd class="ect-m-0 ect-text-charcoal ect-leading-relaxed">SEZ-2, Sitapura Industrial Area<br />Jaipur, Rajasthan 302022</dd>
          </div>
        </dl>

        <div class="ect-bg-white ect-border ect-border-sand ect-rounded-lg ect-p-6 sm:ect-p-8">
          <template v-if="!submitted">
            <h2 class="ect-font-display ect-text-2xl ect-text-charcoal ect-mb-5">Send a message</h2>
            <form @submit.prevent="handleSubmit" class="ect-space-y-4">
              <label class="ect-block">
                <span class="ect-font-body ect-text-sm ect-text-charcoal/70 ect-mb-1.5 ect-block">Name</span>
                <input v-model="name" type="text" required class="ect-w-full ect-px-3.5 ect-py-2.5 ect-border ect-border-sand ect-rounded-md ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-border-[#1f3f37]" />
              </label>
              <label class="ect-block">
                <span class="ect-font-body ect-text-sm ect-text-charcoal/70 ect-mb-1.5 ect-block">Email</span>
                <input v-model="email" type="email" required class="ect-w-full ect-px-3.5 ect-py-2.5 ect-border ect-border-sand ect-rounded-md ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-border-[#1f3f37]" />
              </label>
              <label class="ect-block">
                <span class="ect-font-body ect-text-sm ect-text-charcoal/70 ect-mb-1.5 ect-block">Message</span>
                <textarea v-model="message" required rows="5" class="ect-w-full ect-px-3.5 ect-py-2.5 ect-border ect-border-sand ect-rounded-md ect-font-body ect-text-sm ect-text-charcoal focus:ect-outline-none focus:ect-border-[#1f3f37] ect-resize-none" />
              </label>
              <button type="submit" class="ect-px-6 ect-py-2.5 ect-bg-[#1f3f37] ect-text-white ect-font-body ect-text-sm ect-font-medium ect-rounded-md hover:ect-bg-[#17342d]">Send</button>
            </form>
          </template>
          <template v-else>
            <h2 class="ect-font-display ect-text-2xl ect-text-charcoal ect-mb-2">Message sent</h2>
            <p class="ect-font-body ect-text-sm ect-text-charcoal/65">We'll reply within one working day.</p>
          </template>
        </div>
      </div>
    </section>

    <!-- Careers -->
    <section v-else class="ect-max-w-3xl ect-mx-auto ect-px-6 ect-py-14 sm:ect-py-16">
      <p class="ect-font-body ect-text-base ect-text-charcoal/75 ect-leading-relaxed ect-mb-4">
        We don't have open roles listed right now. If you work in jewellery design, production, photography or
        e-commerce and would like to work with us, send a short note and your CV to
        <a href="mailto:sales@jewelet.example" class="ect-text-charcoal ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6] hover:ect-text-[#1f3f37]">sales@jewelet.example</a>.
      </p>
      <p class="ect-font-body ect-text-sm ect-text-charcoal/55">We read everything and reply to everyone.</p>
    </section>

  </main>
</template>
