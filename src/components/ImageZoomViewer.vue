<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ImageWatermark from './ImageWatermark.vue'

// Full-screen product image viewer built for touch: pinch to zoom, double-tap
// to toggle zoom, drag to pan, swipe to move between images. The desktop
// hover-lens on the product page can't work on a phone (there is no hover), so
// this is how mobile customers inspect a piece up close.
const props = withDefaults(
  defineProps<{
    open: boolean
    images: string[]
    /** Index of the image currently on screen. */
    index: number
    alt?: string
  }>(),
  { alt: '' },
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:index', value: number): void
}>()

const MIN_SCALE = 1
const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.5
// A tap is a tap until the finger travels this far; beyond it the gesture is a
// pan or a swipe and must not also fire zoom/close.
const TAP_SLOP = 8
const DOUBLE_TAP_MS = 300
const SWIPE_DISTANCE = 50

const stageRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)

const scale = ref(1)
const tx = ref(0)
const ty = ref(0)
// Horizontal drag offset while swiping between images at 1x, kept apart from
// `tx` so the pan clamp never fights the swipe.
const swipeX = ref(0)
const animating = ref(false)

const zoomed = computed(() => scale.value > 1.01)
const src = computed(() => props.images[props.index] || '')
const hasMultiple = computed(() => props.images.length > 1)
const transform = computed(
  () => `translate3d(${tx.value + swipeX.value}px, ${ty.value}px, 0) scale(${scale.value})`,
)

type Point = { x: number; y: number }

const pointers = new Map<number, Point>()
let pinchStartDistance = 0
let pinchStartScale = 1
let lastMidpoint: Point | null = null
let panStart: Point | null = null
let panOrigin: Point = { x: 0, y: 0 }
let gestureStart: (Point & { time: number }) | null = null
let lastTap = { time: 0, x: 0, y: 0 }
let movedBeyondTap = false
const controlPointers = new Set<number>()
let gestureFromControl = false
let pressedControl: string | null = null
// Chrome eats the click that follows a quick flick (it reads the tap as
// "stop the fling"), which would leave the close button dead right after a
// swipe. The controls therefore fire from our own pointerup, and the click
// that may or may not follow is ignored for a moment afterwards.
let lastPointerActivation = 0

const CONTROL_ACTIONS: Record<string, () => void> = {
  close: () => emit('close'),
  previous: () => showPrevious(),
  next: () => showNext(),
  zoom: () => toggleZoom(),
}

function controlNameAt(target: HTMLElement | null): string | null {
  return target?.closest('[data-viewer-control]')?.getAttribute('data-viewer-control') || null
}

function onControlClick(name: string) {
  // Keyboard activation and plain mouse clicks land here; a tap that already
  // ran from pointerup does not run twice.
  if (performance.now() - lastPointerActivation < 500) return
  CONTROL_ACTIONS[name]?.()
}
// Whether the press landed on the photo itself; a tap on the surrounding
// backdrop dismisses the viewer, a tap on the photo may become a double-tap.
let pressedOnPhoto = false

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

function resetTransform(animate = false) {
  animating.value = animate
  scale.value = 1
  tx.value = 0
  ty.value = 0
  swipeX.value = 0
}

// Keep the image from being dragged off screen: at scale s it can only travel
// as far as the overflow beyond the stage on each axis.
function clampTranslate() {
  const img = imgRef.value
  const stage = stageRef.value
  if (!img || !stage) return
  const maxX = Math.max(0, (img.clientWidth * scale.value - stage.clientWidth) / 2)
  const maxY = Math.max(0, (img.clientHeight * scale.value - stage.clientHeight) / 2)
  tx.value = clamp(tx.value, -maxX, maxX)
  ty.value = clamp(ty.value, -maxY, maxY)
}

// Scale about `anchor` (a viewport point) so whatever is under the fingers —
// or under the double-tapped spot — stays under them.
function zoomTo(next: number, anchor: Point, animate = false) {
  const stage = stageRef.value
  const target = clamp(next, MIN_SCALE, MAX_SCALE)
  animating.value = animate
  if (!stage) {
    scale.value = target
    return
  }
  const rect = stage.getBoundingClientRect()
  const ax = anchor.x - (rect.left + rect.width / 2)
  const ay = anchor.y - (rect.top + rect.height / 2)
  const ratio = target / scale.value
  tx.value = ax - (ax - tx.value) * ratio
  ty.value = ay - (ay - ty.value) * ratio
  scale.value = target
  if (target === MIN_SCALE) {
    tx.value = 0
    ty.value = 0
  }
  clampTranslate()
}

function showImage(index: number) {
  if (!props.images.length) return
  const last = props.images.length - 1
  const next = index < 0 ? last : index > last ? 0 : index
  if (next !== props.index) emit('update:index', next)
  resetTransform()
}

function showPrevious() {
  showImage(props.index - 1)
}

function showNext() {
  showImage(props.index + 1)
}

function onPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement
  // A finger that lands on a control (close, arrows) belongs to that button —
  // it starts no pan and no tap-to-close. It is still tracked, because touch
  // targets are generous and a pinch shouldn't die just because one finger
  // strayed onto an arrow.
  const control = controlNameAt(target)
  const onControl = Boolean(control)
  // The viewer covers the whole screen, so no pointer capture is needed to
  // follow a drag — and capturing here makes Chrome swallow the click of the
  // *next* tap on a control, which loses the close button after a swipe.
  // Dropping a stale pointer on the first finger down keeps the gesture state
  // honest if a pointerup was ever missed.
  if (event.isPrimary) {
    pointers.clear()
    controlPointers.clear()
  }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (onControl) controlPointers.add(event.pointerId)
  animating.value = false

  if (pointers.size === 1) {
    movedBeyondTap = false
    gestureFromControl = onControl
    pressedControl = control
    pressedOnPhoto = target === imgRef.value
    panStart = onControl ? null : { x: event.clientX, y: event.clientY }
    panOrigin = { x: tx.value, y: ty.value }
    gestureStart = onControl ? null : { x: event.clientX, y: event.clientY, time: performance.now() }
    return
  }

  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()] as [Point, Point]
    pinchStartDistance = distance(a, b)
    pinchStartScale = scale.value
    lastMidpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    movedBeyondTap = true
    panStart = null
    gestureStart = null
    swipeX.value = 0
  }
}

function onPointerMove(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (pointers.size >= 2) {
    const [a, b] = [...pointers.values()] as [Point, Point]
    const spread = distance(a, b)
    const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    if (!pinchStartDistance) {
      pinchStartDistance = spread
      pinchStartScale = scale.value
      lastMidpoint = midpoint
      return
    }
    zoomTo(pinchStartScale * (spread / pinchStartDistance), midpoint)
    // Two fingers moving together drag the image as well as pinch it.
    if (lastMidpoint) {
      tx.value += midpoint.x - lastMidpoint.x
      ty.value += midpoint.y - lastMidpoint.y
      clampTranslate()
    }
    lastMidpoint = midpoint
    return
  }

  if (!panStart) return
  const dx = event.clientX - panStart.x
  const dy = event.clientY - panStart.y
  if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) movedBeyondTap = true

  if (zoomed.value) {
    tx.value = panOrigin.x + dx
    ty.value = panOrigin.y + dy
    clampTranslate()
  } else if (hasMultiple.value) {
    // Rubber-band the image with the finger so the swipe feels connected.
    swipeX.value = dx * 0.6
  }
}

function onPointerUp(event: PointerEvent) {
  if (!pointers.delete(event.pointerId)) return
  controlPointers.delete(event.pointerId)
  if (pointers.size < 2) {
    pinchStartDistance = 0
    lastMidpoint = null
  }
  if (pointers.size > 0) {
    // A finger is still down — treat it as the start of a fresh drag.
    const [remainingId, remaining] = [...pointers.entries()][0] as [number, Point]
    if (remaining && !controlPointers.has(remainingId)) {
      panStart = { ...remaining }
      panOrigin = { x: tx.value, y: ty.value }
    }
    return
  }

  const start = gestureStart
  panStart = null
  gestureStart = null

  if (!zoomed.value && start && hasMultiple.value) {
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) showNext()
      else showPrevious()
    }
  }

  animating.value = true
  swipeX.value = 0
  if (scale.value <= MIN_SCALE) {
    tx.value = 0
    ty.value = 0
  }

  if (gestureFromControl) {
    // Only when the finger lifted on the same control it pressed.
    if (pressedControl && controlNameAt(event.target as HTMLElement) === pressedControl) {
      lastPointerActivation = performance.now()
      CONTROL_ACTIONS[pressedControl]?.()
    }
  } else if (!movedBeyondTap) {
    handleTap(event)
  }
  gestureFromControl = false
  pressedControl = null
}

function handleTap(event: PointerEvent) {
  const now = performance.now()
  const isDoubleTap =
    now - lastTap.time < DOUBLE_TAP_MS && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 40
  lastTap = { time: now, x: event.clientX, y: event.clientY }

  if (isDoubleTap) {
    lastTap.time = 0
    if (zoomed.value) resetTransform(true)
    else zoomTo(DOUBLE_TAP_SCALE, { x: event.clientX, y: event.clientY }, true)
    return
  }

  // A single tap on the backdrop dismisses; taps on the photo itself are left
  // alone so they can turn into a double-tap zoom.
  if (!pressedOnPhoto) emit('close')
}

function onWheel(event: WheelEvent) {
  const factor = Math.exp(-event.deltaY / 320)
  zoomTo(scale.value * factor, { x: event.clientX, y: event.clientY })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
  else if (event.key === 'ArrowLeft') showPrevious()
  else if (event.key === 'ArrowRight') showNext()
  else if (event.key === '+' || event.key === '=') zoomStep(1)
  else if (event.key === '-') zoomStep(-1)
}

// Keyboard/button zoom works from the centre of the stage.
function zoomStep(direction: 1 | -1) {
  const rect = stageRef.value?.getBoundingClientRect()
  const anchor = rect
    ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    : { x: 0, y: 0 }
  zoomTo(scale.value * (direction === 1 ? 1.6 : 1 / 1.6), anchor, true)
}

function toggleZoom() {
  if (zoomed.value) resetTransform(true)
  else zoomStep(1)
}

let previousOverflow = ''

watch(
  () => props.open,
  (open) => {
    resetTransform()
    pointers.clear()
    controlPointers.clear()
    gestureFromControl = false
    if (typeof document === 'undefined') return
    if (open) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeydown)
    } else {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeydown)
    }
  },
)

watch(() => props.index, () => resetTransform())

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && src"
      class="image-zoom-viewer ect-fixed ect-inset-0 ect-z-[80] ect-bg-charcoal ect-select-none"
      role="dialog"
      aria-modal="true"
      :aria-label="alt || 'Product image'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
    >
      <div
        ref="stageRef"
        class="image-zoom-stage ect-absolute ect-inset-0 ect-flex ect-items-center ect-justify-center ect-overflow-hidden"
      >
        <img
          ref="imgRef"
          :src="src"
          :alt="alt"
          draggable="false"
          decoding="async"
          class="image-zoom-photo ect-max-h-full ect-max-w-full ect-object-contain"
          :class="animating ? 'image-zoom-photo--animating' : ''"
          :style="{ transform }"
        />
        <ImageWatermark :opacity="0.45" :scale="0.12" />
      </div>

      <button
        type="button"
        data-viewer-control="close"
        aria-label="Close image viewer"
        class="ect-absolute ect-top-4 ect-right-4 ect-z-10 ect-inline-flex ect-h-11 ect-w-11 ect-items-center ect-justify-center ect-rounded-full ect-bg-white/90 ect-text-charcoal ect-shadow-md ect-transition hover:ect-bg-white"
        @click="onControlClick('close')"
      >
        <svg class="ect-h-5 ect-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <button
        type="button"
        data-viewer-control="zoom"
        :aria-label="zoomed ? 'Zoom out' : 'Zoom in'"
        class="ect-absolute ect-top-4 ect-left-4 ect-z-10 ect-inline-flex ect-h-11 ect-w-11 ect-items-center ect-justify-center ect-rounded-full ect-bg-white/90 ect-text-charcoal ect-shadow-md ect-transition hover:ect-bg-white"
        @click="onControlClick('zoom')"
      >
        <svg class="ect-h-5 ect-w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            :d="zoomed
              ? 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM7.5 10.5h6'
              : 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6'"
          />
        </svg>
      </button>

      <template v-if="hasMultiple">
        <span
          class="ect-pointer-events-none ect-absolute ect-top-6 ect-left-1/2 ect--translate-x-1/2 ect-z-10 ect-rounded-full ect-bg-white/88 ect-px-3 ect-py-1 ect-font-body ect-text-micro ect-font-semibold ect-text-charcoal"
        >
          {{ index + 1 }} / {{ images.length }}
        </span>

        <!-- Only the arrows themselves take pointer events; the rail between
             them sits over the middle of the photo, where the pinch happens. -->
        <div class="ect-pointer-events-none ect-absolute ect-inset-x-0 ect-top-1/2 ect-z-10 ect-flex ect--translate-y-1/2 ect-items-center ect-justify-between ect-px-3">
          <button
            type="button"
            data-viewer-control="previous"
            aria-label="Show previous image"
            class="ect-pointer-events-auto ect-inline-flex ect-h-11 ect-w-11 ect-items-center ect-justify-center ect-rounded-full ect-bg-white/88 ect-text-charcoal ect-shadow-md ect-transition hover:ect-bg-white"
            @click="onControlClick('previous')"
          >
            <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            type="button"
            data-viewer-control="next"
            aria-label="Show next image"
            class="ect-pointer-events-auto ect-inline-flex ect-h-11 ect-w-11 ect-items-center ect-justify-center ect-rounded-full ect-bg-white/88 ect-text-charcoal ect-shadow-md ect-transition hover:ect-bg-white"
            @click="onControlClick('next')"
          >
            <svg class="ect-h-4 ect-w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </template>

      <p
        v-if="!zoomed"
        class="ect-pointer-events-none ect-absolute ect-bottom-6 ect-left-1/2 ect--translate-x-1/2 ect-z-10 ect-m-0 ect-rounded-full ect-bg-white/88 ect-px-4 ect-py-1.5 ect-font-body ect-text-micro ect-text-charcoal"
      >
        Pinch or double-tap to zoom{{ hasMultiple ? ' · swipe for more' : '' }}
      </p>
    </div>
  </Teleport>
</template>

<style scoped>
.image-zoom-viewer {
  /* Own every touch gesture inside the viewer so the browser doesn't scroll or
     page-zoom instead of us. */
  touch-action: none;
  overscroll-behavior: contain;
}

.image-zoom-stage {
  cursor: zoom-in;
}

.image-zoom-photo {
  will-change: transform;
}

.image-zoom-photo--animating {
  transition: transform 0.22s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .image-zoom-photo--animating {
    transition: none;
  }
}
</style>
