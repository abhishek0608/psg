import { prisma } from './db.js'
import { getSiteConfig } from './site-config-source.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/
// NEW -> CONTACTED -> SCHEDULED -> COMPLETED, or CANCELLED at any point.
export const VIDEO_CALL_STATUSES = ['NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']
export const VIDEO_CALL_CHANNELS = ['whatsapp', 'call']
// Hard ceiling on attached pieces, whatever the configured maximum says — the
// call is a guided viewing, not a catalogue dump.
const ITEM_LIMIT = 20

function normalizeItems(raw) {
  if (!Array.isArray(raw)) return []
  const items = []
  const seen = new Set()
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const slug = String(entry.slug || '').trim().slice(0, 200)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    items.push({
      slug,
      title: String(entry.title || '').trim().slice(0, 200),
      price: String(entry.price || '').trim().slice(0, 40),
      imageUrl: String(entry.imageUrl || '').trim().slice(0, 2000),
    })
    if (items.length >= ITEM_LIMIT) break
  }
  return items
}

export function toVideoCallPayload(row) {
  return {
    reference: row.reference, scheduledAt: row.scheduledAt, preferredTime: row.preferredTime || '',
    timezone: row.timezone, status: String(row.status || 'NEW').toLowerCase(), name: row.name,
    email: row.email, phone: row.phone, contactChannel: row.contactChannel || 'whatsapp',
    notes: row.notes || '', items: Array.isArray(row.items) ? row.items : [],
    userId: row.userId || null, createdAt: row.createdAt,
  }
}

export async function createVideoCallBooking(body) {
  const name = String(body?.name || '').trim().slice(0, 120)
  const email = String(body?.email || '').trim().toLowerCase().slice(0, 254)
  const phone = String(body?.phone || '').trim().slice(0, 32)
  const notes = String(body?.notes || '').trim().slice(0, 1000)
  const preferredTime = String(body?.preferredTime || '').trim().slice(0, 200)
  const contactChannel = VIDEO_CALL_CHANNELS.includes(body?.contactChannel) ? body.contactChannel : 'whatsapp'
  const userId = String(body?.userId || '').trim() || null
  const items = normalizeItems(body?.items)

  const config = await getSiteConfig()
  if (!config.videoCallEnabled) return { error: 'Video consultations are not available right now.' }
  if (items.length > config.videoCallMaxItems) {
    return { error: `Please keep the list to ${config.videoCallMaxItems} pieces or fewer.` }
  }
  if (!name) return { error: 'Please enter your full name.' }
  if (!EMAIL_PATTERN.test(email)) return { error: 'Please enter a valid email address.' }
  if (!PHONE_PATTERN.test(phone)) return { error: 'Please enter a valid mobile number.' }

  let sequence = (await prisma.videoCallBooking.count()) + 1
  for (let attempt = 0; attempt < 5; attempt += 1, sequence += 1) {
    try {
      const booking = await prisma.videoCallBooking.create({
        data: {
          reference: `VC-${String(sequence).padStart(6, '0')}`,
          name, email, phone, contactChannel, userId,
          notes: notes || undefined,
          preferredTime: preferredTime || undefined,
          items: items.length ? items : undefined,
        },
      })
      return { booking }
    } catch (error) {
      // Only a duplicate reference is retryable; anything else is a real fault.
      if (error?.code !== 'P2002') throw error
    }
  }
  return { error: 'Could not allocate a booking reference. Please try again.' }
}
