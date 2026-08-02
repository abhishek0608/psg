import { API_BASE } from '../config-api'

export type VideoCallStatus = 'new' | 'contacted' | 'scheduled' | 'completed' | 'cancelled'
export type VideoCallChannel = 'whatsapp' | 'call'

export interface VideoCallItem {
  slug: string
  title: string
  price: string
  imageUrl: string
}

export interface VideoCallBooking {
  reference: string
  // Null until the team agrees a time with the customer out of band.
  scheduledAt: string | null
  preferredTime: string
  timezone: string
  status: VideoCallStatus
  name: string
  email: string
  phone: string
  contactChannel: VideoCallChannel
  notes: string
  items: VideoCallItem[]
  userId: string | null
  createdAt: string
}

export interface VideoCallRequestInput {
  name: string
  email: string
  phone: string
  contactChannel: VideoCallChannel
  preferredTime: string
  notes: string
  items: VideoCallItem[]
  userId?: string | null
}

async function readError(response: Response, fallback: string) {
  try { return ((await response.json()) as { message?: string }).message || fallback } catch { return fallback }
}

export async function createVideoCallBooking(input: VideoCallRequestInput): Promise<VideoCallBooking> {
  const response = await fetch(`${API_BASE}/api/account?mode=video-call-booking`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error(await readError(response, 'Could not submit your request.'))
  return ((await response.json()) as { booking: VideoCallBooking }).booking
}

export async function fetchVideoCallBookings(userId: string): Promise<VideoCallBooking[]> {
  const params = new URLSearchParams({ resource: 'video-calls', userId })
  const response = await fetch(`${API_BASE}/api/internal?${params}`)
  if (!response.ok) throw new Error(await readError(response, 'Could not load video-call requests.'))
  const data = (await response.json()) as { bookings?: VideoCallBooking[] }
  return Array.isArray(data.bookings) ? data.bookings : []
}

export async function updateVideoCallStatus(
  userId: string,
  reference: string,
  status: VideoCallStatus,
  scheduledAt?: string | null,
) {
  const params = new URLSearchParams({ resource: 'video-calls', userId })
  const response = await fetch(`${API_BASE}/api/internal?${params}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference, status, ...(scheduledAt === undefined ? {} : { scheduledAt: scheduledAt || '' }) }),
  })
  if (!response.ok) throw new Error(await readError(response, 'Could not update the request.'))
  return ((await response.json()) as { booking: VideoCallBooking }).booking
}
