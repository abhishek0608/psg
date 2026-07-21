import { API_BASE } from '../config-api'

export type VideoCallStatus = 'booked' | 'completed' | 'cancelled'
export interface VideoCallBooking {
  reference: string
  scheduledAt: string
  timezone: string
  status: VideoCallStatus
  name: string
  email: string
  phone: string
  notes: string
  createdAt: string
}

async function readError(response: Response, fallback: string) {
  try { return ((await response.json()) as { message?: string }).message || fallback } catch { return fallback }
}

export async function fetchBookedVideoCallSlots(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/api/account?mode=video-call-slots`)
  if (!response.ok) throw new Error(await readError(response, 'Could not load available slots.'))
  const data = (await response.json()) as { booked?: string[] }
  return Array.isArray(data.booked) ? data.booked : []
}

export async function createVideoCallBooking(input: { scheduledAt: string; name: string; email: string; phone: string; notes: string }): Promise<VideoCallBooking> {
  const response = await fetch(`${API_BASE}/api/account?mode=video-call-booking`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error(await readError(response, 'Could not book the video call.'))
  return ((await response.json()) as { booking: VideoCallBooking }).booking
}

export async function fetchVideoCallBookings(userId: string): Promise<VideoCallBooking[]> {
  const params = new URLSearchParams({ resource: 'video-calls', userId })
  const response = await fetch(`${API_BASE}/api/internal?${params}`)
  if (!response.ok) throw new Error(await readError(response, 'Could not load video-call bookings.'))
  const data = (await response.json()) as { bookings?: VideoCallBooking[] }
  return Array.isArray(data.bookings) ? data.bookings : []
}

export async function updateVideoCallStatus(userId: string, reference: string, status: VideoCallStatus) {
  const params = new URLSearchParams({ resource: 'video-calls', userId })
  const response = await fetch(`${API_BASE}/api/internal?${params}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference, status }),
  })
  if (!response.ok) throw new Error(await readError(response, 'Could not update the booking.'))
  return ((await response.json()) as { booking: VideoCallBooking }).booking
}
