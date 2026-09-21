<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSiteConfig } from '../composables/useSiteConfig'

const { aboutContent, ensureSiteConfigLoaded } = useSiteConfig()

type Tab = 'about' | 'contact'
const activeTab = ref<Tab>('about')
const name = ref('')
const email = ref('')
const message = ref('')
const submitted = ref(false)

const story = [
  'At Jewelet, we believe that every gemstone is more than just a stone – it is a story of nature, energy, and timeless beauty. Since our founding on July 22, 2009, we have grown from a passionate vision into a trusted global supplier of precious and semi-precious gemstones.',
  'Over the years, we have mastered the art of sourcing rare and natural gemstones, crafting fresh precision cuts, and delivering exceptional customer service. What began as a small passion has now transformed into Jewelet Global Co., Ltd., a company with over 17 years of proven excellence in gemstone supply.',
  'Today, we proudly serve jewelers, collectors, and enthusiasts worldwide with sustainably sourced, professionally sorted, and meticulously graded gemstones. From Bangkok, India, Hong Kong, USA, and Germany, our reach is truly international – yet our values remain rooted in authenticity, trust, and quality.',
]

const founder = [
  'Jewelet was established July 22, 2009, by Mr. Pawan Mishra, a former field worker whose passion and interest drove him to create the company.',
  'He found it intriguing that gemstones carry certain vibrations and channel good energy that can change the mental and physical outlook of the wearer.',
  'Driven by compassion, he got the motivation to start a company that caters to the need of people looking for healing and metaphysical properties of the gems.',
  'Today, Jewelet Global has a proven record of over 12 years of a consistent supply of sustainably sourced, professionally sorted, and graded gemstones.',
]

const testimonials = [
  {
    title: 'Recommend it to everyone',
    quote: 'I have never been disappointed, either for myself or as gifts, the pieces are lovely, reasonably priced, and I love the personal touches.',
    name: 'Linda Maria',
    role: 'Designer',
  },
  {
    title: 'Perfect service',
    quote: 'A great company to buy from. Excellent quality products at good value. Delivery is efficient and quick.',
    name: 'Ann Smith',
    role: 'CEO & Founder',
  },
  {
    title: 'Makes me happy',
    quote: '5-star rating 100%. So amazing and helpful. Stress-free and fun. Eileen was amazing. So wonderful.',
    name: 'Anana',
    role: 'Photographer',
  },
  {
    title: 'I love Jewelet',
    quote: 'I look forward to future transactions with your company and will gladly recommend your services to others.',
    name: 'Linda',
    role: 'Designer',
  },
]

const heroEyebrow = computed(() => aboutContent.value.heroEyebrow || 'About Us')
const heroHeadline = computed(() => aboutContent.value.heroHeadline || 'Jewelet Global Gems')
const heroSubheadline = computed(
  () =>
    aboutContent.value.heroSubheadline ||
    'Every gemstone is more than just a stone – it is a story of nature, energy, and timeless beauty.',
)

// Journey steps only render once configured from Internal → About page.
const journey = computed(() => aboutContent.value.journey.filter((step) => step.active))

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
  if (hash === 'contact') activeTab.value = hash
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
          <h1 class="ect-font-display ect-text-4xl sm:ect-text-5xl ect-leading-tight">Contact us</h1>
        </template>
      </div>
    </section>

    <!-- Tabs -->
    <nav id="about-tabs" class="ect-sticky ect-top-[calc(theme(spacing.16)+theme(spacing.8))] sm:ect-top-16 ect-z-40 ect-bg-cream/95 ect-backdrop-blur ect-border-b ect-border-sand">
      <ul class="ect-max-w-6xl ect-mx-auto ect-px-6 ect-flex ect-justify-center ect-gap-8 ect-list-none ect-m-0 ect-p-0">
        <li v-for="tab in (['about', 'contact'] as const)" :key="tab">
          <button
            type="button"
            @click="setTab(tab)"
            class="ect-relative ect-py-4 ect-font-body ect-text-sm ect-bg-transparent"
            :class="activeTab === tab ? 'ect-text-charcoal' : 'ect-text-charcoal/50 hover:ect-text-charcoal'"
          >
            {{ tab === 'about' ? 'Our story' : 'Contact' }}
            <span class="ect-absolute ect-bottom-0 ect-left-0 ect-right-0 ect-h-0.5" :class="activeTab === tab ? 'ect-bg-charcoal' : 'ect-bg-transparent'" />
          </button>
        </li>
      </ul>
    </nav>

    <!-- About -->
    <template v-if="activeTab === 'about'">
      <section class="ect-max-w-3xl ect-mx-auto ect-px-6 ect-py-16 sm:ect-py-20">
        <p
          v-for="(paragraph, i) in story"
          :key="`story-${i}`"
          class="ect-font-body ect-leading-relaxed ect-text-charcoal"
          :class="i === 0 ? 'ect-text-lg sm:ect-text-xl' : 'ect-text-base ect-text-charcoal/75 ect-mt-6'"
        >
          {{ paragraph }}
        </p>
      </section>

      <section class="ect-max-w-6xl ect-mx-auto ect-px-6 ect-pb-16 sm:ect-pb-20">
        <div class="ect-border-t ect-border-sand ect-pt-10 ect-grid ect-grid-cols-1 lg:ect-grid-cols-[minmax(0,320px)_1fr] ect-gap-10 lg:ect-gap-16 ect-items-start">
          <figure class="ect-m-0 ect-max-w-[320px]">
            <img
              src="/about/pawan-mishra-portrait.webp"
              alt="Pawan Mishra, founder of Jewelet"
              width="240"
              height="334"
              class="ect-w-full ect-h-auto ect-block ect-bg-[#f3ece0]"
              loading="lazy"
            />
            <figcaption class="ect-mt-3 ect-font-body ect-text-sm">
              <span class="ect-block ect-text-charcoal ect-font-medium">Pawan Mishra</span>
              <span class="ect-block ect-text-charcoal/55">CEO &amp; Founder, Jewelet</span>
            </figcaption>
          </figure>
          <div>
            <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-text-charcoal ect-mb-6">Our Founder</h2>
            <p
              v-for="(paragraph, i) in founder"
              :key="`founder-${i}`"
              class="ect-font-body ect-text-base ect-text-charcoal/75 ect-leading-relaxed"
              :class="i > 0 ? 'ect-mt-4' : ''"
            >
              {{ paragraph }}
            </p>
            <blockquote class="ect-mt-8 ect-pl-5 ect-border-l-2 ect-border-[#cdbfa6] ect-m-0 ect-font-display ect-text-lg sm:ect-text-xl ect-italic ect-text-charcoal ect-leading-relaxed">
              “Within each stone lies a unique energy, a story waiting to be told. As we journey through life, may we
              harness the vibrance of these gems to illuminate our path and inspire our souls.”
            </blockquote>
          </div>
        </div>
      </section>

      <section v-if="journey.length" class="ect-max-w-6xl ect-mx-auto ect-px-6 ect-pb-8">
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
        <h2 class="ect-font-display ect-text-2xl sm:ect-text-3xl ect-text-charcoal ect-mb-8 ect-border-t ect-border-sand ect-pt-10">What our customers say</h2>
        <ul class="ect-grid ect-grid-cols-1 sm:ect-grid-cols-2 lg:ect-grid-cols-4 ect-gap-6 ect-list-none ect-m-0 ect-p-0">
          <li v-for="t in testimonials" :key="t.name + t.title" class="ect-bg-white ect-border ect-border-sand ect-rounded-lg ect-p-6 ect-flex ect-flex-col">
            <h3 class="ect-font-body ect-text-base ect-font-medium ect-text-charcoal ect-mb-3">{{ t.title }}</h3>
            <blockquote class="ect-m-0 ect-font-body ect-text-sm ect-text-charcoal/70 ect-leading-relaxed ect-flex-1">“{{ t.quote }}”</blockquote>
            <footer class="ect-mt-5 ect-font-body ect-text-sm">
              <span class="ect-text-charcoal ect-font-medium">{{ t.name }}</span>
              <span class="ect-text-charcoal/50"> · {{ t.role }}</span>
            </footer>
          </li>
        </ul>
        <p class="ect-mt-10 ect-font-body ect-text-sm">
          <RouterLink to="/collections" class="ect-text-charcoal ect-underline ect-underline-offset-4 ect-decoration-[#cdbfa6] hover:ect-text-[#1f3f37]">Browse the collection</RouterLink>
        </p>
      </section>
    </template>

    <!-- Contact -->
    <section v-else class="ect-max-w-5xl ect-mx-auto ect-px-6 ect-py-14 sm:ect-py-16">
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

  </main>
</template>
