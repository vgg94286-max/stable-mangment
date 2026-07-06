'use server'

import { revalidatePath } from 'next/cache'
import {
  sql,
  type Horse,
  type StableGridItem,
  type ReservationDetail,
} from '@/lib/db'
import { getSession } from '@/lib/auth'

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

async function requireAdminSession() {
  const session = await requireSession()
  if (session.role !== 'admin') throw new Error('Forbidden')
  return session
}

export type ActionResult = { ok: boolean; error?: string }

// --- Reads -----------------------------------------------------------------

// Full grid of every stable joined with any active reservation + horse + rider.
export async function getStableGrid(): Promise<StableGridItem[]> {
  await requireSession()
  const rows = (await sql`
    SELECT
      s.id, s.barn, s.number, s.label, s.status, s.is_active,
      r.id AS reservation_id,
      h.id AS horse_id, h.name AS horse_name, h.gender AS gender,
      u.id AS rider_id, u.full_name AS rider_name
    FROM stables s
    LEFT JOIN reservations r ON r.stable_id = s.id AND r.status = 'active'
    LEFT JOIN horses h ON h.id = r.horse_id
    LEFT JOIN users u ON u.id = r.rider_id
    ORDER BY s.barn, s.number
  `) as StableGridItem[]
  return rows
}
export async function toggleStableActive(
  stableId: number, 
  isActive: boolean
): Promise<ActionResult> {
  await requireAdminSession()
  try {
    await sql`UPDATE stables SET is_active = ${isActive} WHERE id = ${stableId}`
    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: 'Could not update stable status.' }
  }
}

// 3. Add action to set barn visible range (Updated to protect occupied stables)
export async function setBarnVisibleRange(
  barn: string, 
  maxNumber: number
): Promise<ActionResult> {
  await requireAdminSession()
  try {
    // Sets stables to active if they are <= maxNumber OR if they are currently occupied
    await sql`
      UPDATE stables 
      SET is_active = (number <= ${maxNumber} OR status = 'occupied')
      WHERE barn = ${barn}
    `
    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: 'Could not update barn range.' }
  }
}
export async function getBarnSummary(): Promise<
  { barn: string; total: number; occupied: number }[]
> {
  await requireSession()
  return (await sql`
    SELECT barn,
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'occupied')::int AS occupied
    FROM stables GROUP BY barn ORDER BY barn
  `) as { barn: string; total: number; occupied: number }[]
}

export async function getMyHorses(): Promise<Horse[]> {
  const session = await requireSession()
  return (await sql`
    SELECT * FROM horses WHERE owner_id = ${session.userId} ORDER BY created_at DESC
  `) as Horse[]
}

// Rider's own active reservations (with stable + horse info).
export async function getMyReservations(): Promise<ReservationDetail[]> {
  const session = await requireSession()
  return (await sql`
    SELECT
      r.id AS reservation_id, r.status, r.reserved_at,
      s.id AS stable_id, s.label AS stable_label,
      h.id AS horse_id, h.name AS horse_name, h.gender AS gender,
      u.id AS rider_id, u.full_name AS rider_name, u.email AS rider_email
    FROM reservations r
    JOIN stables s ON s.id = r.stable_id
    JOIN horses h ON h.id = r.horse_id
    JOIN users u ON u.id = r.rider_id
    WHERE r.rider_id = ${session.userId} AND r.status = 'active'
    ORDER BY r.reserved_at DESC
  `) as ReservationDetail[]
}

// Admin: all active reservations.
export async function getAllReservations(): Promise<ReservationDetail[]> {
  await requireAdminSession()
  return (await sql`
    SELECT
      r.id AS reservation_id, r.status, r.reserved_at,
      s.id AS stable_id, s.label AS stable_label,
      h.id AS horse_id, h.name AS horse_name, h.gender AS gender,
      u.id AS rider_id, u.full_name AS rider_name, u.email AS rider_email
    FROM reservations r
    JOIN stables s ON s.id = r.stable_id
    JOIN horses h ON h.id = r.horse_id
    JOIN users u ON u.id = r.rider_id
    WHERE r.status = 'active'
    ORDER BY s.barn, s.number
  `) as ReservationDetail[]
}

export type RiderDirectoryRow = {
  id: number
  full_name: string
  email: string
  phone: string | null
  created_at: string
  horse_count: number
  active_reservations: number
}

export async function getRiderDirectory(): Promise<RiderDirectoryRow[]> {
  await requireAdminSession()
  return (await sql`
    SELECT
      u.id, u.full_name, u.email, u.phone, u.created_at,
      count(DISTINCT h.id)::int AS horse_count,
      count(DISTINCT r.id) FILTER (WHERE r.status = 'active')::int AS active_reservations
    FROM users u
    LEFT JOIN horses h ON h.owner_id = u.id
    LEFT JOIN reservations r ON r.rider_id = u.id
    WHERE u.role = 'rider'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `) as RiderDirectoryRow[]
}

// --- Writes ----------------------------------------------------------------

export async function createHorse(input: {
  name: string
  international_id?: number | null 
  gender?: string | null
  notes?: string | null
}): Promise<{ ok: boolean; error?: string; horseId?: number }> {
  const session = await requireSession()
  if (!input.name?.trim()) return { ok: false, error: 'Horse name is required.' }

  try {
    const rows = (await sql`
      INSERT INTO horses (owner_id, name, international_id, gender, notes)
      VALUES (
        ${session.userId}, ${input.name.trim()}, ${input.international_id?.toString() || null},
          ${input.gender || null},
        ${input.notes || null}
      )
      RETURNING id
    `) as { id: number }[]
    revalidatePath('/dashboard')
    return { ok: true, horseId: rows[0].id }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// Reserve a stable for a horse via the atomic stored function.
export async function reserveStable(
  stableId: number,
  horseId: number,
): Promise<ActionResult> {
  const session = await requireSession()

  // Ensure the horse belongs to the requesting rider.
  const owns = (await sql`
    SELECT 1 FROM horses WHERE id = ${horseId} AND owner_id = ${session.userId}
  `) as unknown[]
  if (owns.length === 0) {
    return { ok: false, error: 'You do not own this horse.' }
  }

  try {
    await sql`SELECT reserve_stable(${stableId}, ${horseId}, ${session.userId})`
    revalidatePath('/dashboard')
    revalidatePath('/admin')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: cleanPgError((e as Error).message) }
  }
}

// Cancel a reservation. Riders can only cancel their own; admins can cancel any.
export async function cancelReservation(
  reservationId: number,
): Promise<ActionResult> {
  const session = await requireSession()

  if (session.role !== 'admin') {
    const owns = (await sql`
      SELECT 1 FROM reservations WHERE id = ${reservationId} AND rider_id = ${session.userId}
    `) as unknown[]
    if (owns.length === 0) return { ok: false, error: 'Not your reservation.' }
  }

  try {
    await sql`SELECT cancel_reservation(${reservationId})`
    revalidatePath('/dashboard')
    revalidatePath('/admin')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: cleanPgError((e as Error).message) }
  }
}

// Admin-only: move a reservation to a different stable atomically.
export async function moveReservation(
  reservationId: number,
  newStableId: number,
): Promise<ActionResult> {
  await requireAdminSession()
  try {
    await sql`SELECT move_reservation(${reservationId}, ${newStableId})`
    
    await sql`UPDATE stables SET is_active = true WHERE id = ${newStableId}`
    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: cleanPgError((e as Error).message) }
  }
}

function cleanPgError(msg: string) {
  // Strip PL/pgSQL prefixes so we can surface the RAISE EXCEPTION message.
  return msg.replace(/^.*?ERROR:\s*/i, '').split('\n')[0] || 'Something went wrong.'
}

// --- Add to stables.ts ---

// Get the official document URL (used by both Admin and Rider)
export async function getOfficialDocument(): Promise<string | null> {
  const rows = (await sql`
    SELECT value FROM settings WHERE key = 'official_document'
  `) as { value: string }[]
  return rows[0]?.value || null
}

// Update the official document URL (Admin only)
export async function setOfficialDocument(url: string): Promise<ActionResult> {
  await requireAdminSession()
  try {
    await sql`
      INSERT INTO settings (key, value) 
      VALUES ('official_document', ${url})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `
    revalidatePath('/dashboard')
    revalidatePath('/admin')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: 'Failed to update document.' }
  }
}

// Add to stables.ts

export async function getRiderHorses(riderId: number): Promise<Horse[]> {
  await requireAdminSession()
  const rows = (await sql`
    SELECT * FROM horses 
    WHERE owner_id = ${riderId} 
    ORDER BY name ASC
  `) as Horse[]
  return rows
}