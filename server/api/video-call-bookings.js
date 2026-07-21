import { prisma } from './db.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[\d\s()-]{7,20}$/
export const VIDEO_CALL_STATUSES = ['BOOKED', 'COMPLETED', 'CANCELLED']

export function toVideoCallPayload(row) {
  return {
    reference: row.reference, scheduledAt: row.scheduledAt, timezone: row.timezone,
    status: String(row.status || 'BOOKED').toLowerCase(), name: row.name, email: row.email,
    phone: row.phone, notes: row.notes || '', createdAt: row.createdAt,
  }
}

function validateSlot(scheduledAt) {
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) return 'Please select a valid video-call slot.'
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(scheduledAt)
  const part = (type) => parts.find((item) => item.type === type)?.value || ''
  const hour = Number(part('hour'))
  const minute = Number(part('minute'))
  if (scheduledAt.getTime() < Date.now() + 15 * 60000) return 'That slot is no longer available. Please choose another.'
  if (scheduledAt.getTime() > Date.now() + 31 * 86400000) return 'Please select a slot within the next 30 days.'
  if (part('weekday') === 'Sun' || minute % 30 !== 0 || hour < 10 || hour >= 18) return 'Please select a slot between 10:00 AM and 6:00 PM IST, Monday to Saturday.'
  return ''
}

export async function getBookedVideoCallSlots() {
  const rows = await prisma.videoCallBooking.findMany({
    where: { status: { not: 'CANCELLED' }, scheduledAt: { gte: new Date() } }, select: { scheduledAt: true },
  })
  return rows.map((row) => row.scheduledAt.toISOString())
}

export async function createVideoCallBooking(body) {
  const scheduledAt = new Date(String(body?.scheduledAt || ''))
  const name = String(body?.name || '').trim().slice(0, 120)
  const email = String(body?.email || '').trim().toLowerCase().slice(0, 254)
  const phone = String(body?.phone || '').trim().slice(0, 32)
  const notes = String(body?.notes || '').trim().slice(0, 1000)
  const slotError = validateSlot(scheduledAt)
  if (slotError) return { error: slotError }
  if (!name) return { error: 'Please enter your full name.' }
  if (!EMAIL_PATTERN.test(email)) return { error: 'Please enter a valid email address.' }
  if (!PHONE_PATTERN.test(phone)) return { error: 'Please enter a valid mobile number.' }
  let sequence = (await prisma.videoCallBooking.count()) + 1
  for (let attempt = 0; attempt < 5; attempt += 1, sequence += 1) {
    try {
      const booking = await prisma.videoCallBooking.create({
        data: { reference: `VC-${String(sequence).padStart(6, '0')}`, scheduledAt, name, email, phone, notes: notes || undefined },
      })
      return { booking }
    } catch (error) {
      if (error?.code !== 'P2002') throw error
      const existing = await prisma.videoCallBooking.findFirst({
        where: { scheduledAt, status: { not: 'CANCELLED' } }, select: { id: true },
      })
      if (existing) return { error: 'That slot was just booked. Please choose another.' }
    }
  }
  return { error: 'Could not allocate a booking reference. Please try again.' }
}
