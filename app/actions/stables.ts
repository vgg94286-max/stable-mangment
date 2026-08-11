'use server'

import { revalidatePath } from 'next/cache'
import { logAdminAction } from '@/app/actions/audit'
import {
  sql,
  type Horse,
  type StableGridItem,
  type ReservationDetail,
} from '@/lib/db'
import { getSession } from '@/lib/auth'
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

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

// app/actions/stables.ts

// Fetch the admin phone number
export async function getAdminPhone(): Promise<string | null> {
  const rows = (await sql`
    SELECT value FROM settings WHERE key = 'admin_phone'
  `) as { value: string }[]
  return rows[0]?.value || null
}

// Save or update the admin phone number (Admin only)
// app/actions/stables.ts

// Save or update the admin phone number (Admin only)
export async function setAdminPhone(contactsJson: string, lang: string): Promise<ActionResult> {
  const session = await requireAdminSession()
  try {
    const oldPhoneRows = await sql`SELECT value FROM settings WHERE key = 'admin_phone'`
    const oldPhone = oldPhoneRows[0]?.value || '[]'

    await sql`
      INSERT INTO settings (key, value) 
      VALUES ('admin_phone', ${contactsJson})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `
    
    // Updated description to be cleaner for JSON arrays
    const desc = `${session.name} updated the admin contact numbers.`
    
    await logAdminAction('UPDATE_PHONE', 'Settings', 'admin_phone', desc, 
      { prev: oldPhone, new: contactsJson }
    )

    revalidatePath(`/${lang}/dashboard`)
    revalidatePath(`/${lang}/admin`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: 'Failed to update phone number.' }
  }
}
export type ActionResult = { ok: boolean; error?: string }

// --- Reads -----------------------------------------------------------------

// Full grid of every stable joined with any active reservation + horse + rider.
// app/actions/stables.ts

export async function getStableGrid(lang:string): Promise<StableGridItem[]> {
  const session = await requireSession() 
  const rows = (await sql`
    SELECT
      s.id, s.barn, s.number, s.label, s.status, s.is_active,
      r.id AS reservation_id, r.note,
      h.id AS horse_id, h.name AS horse_name, h.gender AS gender,
      u.id AS rider_id, u.full_name AS rider_name
    FROM stables s
    LEFT JOIN reservations r ON r.stable_id = s.id AND r.status = 'active'
    LEFT JOIN horses h ON h.id = r.horse_id
    LEFT JOIN users u ON u.id = r.rider_id
    ORDER BY s.barn, s.number
  `) as StableGridItem[]

  if (session.role === 'admin') return rows

  // Hide notes and details from other riders
  return rows
    .filter(s => s.is_active || s.rider_id === session.userId)
    .map(s => {
      if (s.status === 'occupied' && s.rider_id !== session.userId) {
        return {
          ...s,
          horse_name: lang === 'ar' ? 'محجوز' : 'Reserved',
          rider_name: null,
          rider_id: null,
          gender: null,
          horse_id: null,
          note: null 
        }
      }
      return s
    })
}
export async function toggleStableActive(
  stableId: number, 
  isActive: boolean,
  lang: string

): Promise<ActionResult> {
  const session = await requireAdminSession()
  try {
    const st = (await sql`SELECT label FROM stables WHERE id = ${stableId}`)[0] as { label: string }
    
    await sql`UPDATE stables SET is_active = ${isActive} WHERE id = ${stableId}`
    
    const desc = `${session.name} ${isActive ? 'unblocked' : 'blocked'} Stable ${st.label}.`
    await logAdminAction('BLOCK_UNBLOCK_STABLE', 'Stable', stableId, desc, { 
      stable: st.label, active: isActive 
    })

   revalidatePath(`/${lang}/dashboard`)
    revalidatePath(`/${lang}/admin`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: 'Could not update stable status.' }
  }
}
// app/actions/stables.ts

export async function toggleBarnsActive(
  barns: string[],
  isActive: boolean,
  lang:string
): Promise<ActionResult> {
  const session = await requireAdminSession()
  if (!barns || barns.length === 0) {
    return { ok: false, error: 'No barns selected.' }
  }

  try {
    if (isActive) {
      await sql`UPDATE stables SET is_active = true WHERE barn = ANY(${barns}::text[])`
    } else {
      await sql`
        UPDATE stables 
        SET is_active = false 
        WHERE barn = ANY(${barns}::text[]) AND status != 'occupied'
      `
    }

    const desc = `${session.name} bulk ${isActive ? 'unblocked' : 'blocked'} Barn(s): ${barns.join(', ')}.`
    await logAdminAction('BULK_BLOCK_UNBLOCK', 'Barn', barns.join(','), desc, { 
      barns, active: isActive 
    })

   revalidatePath(`/${lang}/dashboard`)
    revalidatePath(`/${lang}/admin`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: 'Could not update barns.' }
  }
}
// 3. Add action to set barn visible range (Updated to protect occupied stables)
export async function setBarnVisibleRange(
  barn: string, 
  maxNumber: number,
  lang:string
): Promise<ActionResult> {
  const session = await requireAdminSession()
  try {
    await sql`
      UPDATE stables 
      SET is_active = (number <= ${maxNumber} OR status = 'occupied')
      WHERE barn = ${barn}
    `
    
    const desc = `${session.name} changed Barn ${barn} visible range to 1–${maxNumber}.`
    await logAdminAction('VISIBLE_RANGE', 'Barn', barn, desc, { 
      barn, maxNumber 
    })

   revalidatePath(`/${lang}/dashboard`)
    revalidatePath(`/${lang}/admin`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: 'Could not update barn range.' }
  }
}
export async function getBarnSummary(): Promise<
  { barn: string; total: number; occupied: number; available: number; blocked: number }[]
> {
  await requireSession()
  return (await sql`
    SELECT barn,
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'occupied')::int AS occupied,
      count(*) FILTER (WHERE status != 'occupied' AND is_active = true)::int AS available,
      count(*) FILTER (WHERE is_active = false)::int AS blocked
    FROM stables GROUP BY barn ORDER BY barn
  `) as { barn: string; total: number; occupied: number; available: number; blocked: number }[]
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
  lang: string
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
    revalidatePath(`/${input.lang}/dashboard`)
   
    return { ok: true, horseId: rows[0].id }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// Reserve a stable for a horse via the atomic stored function.
export async function reserveStable(
  stableId: number,
  horseId: number,
  lang:string,
  note?: string,
  
): Promise<ActionResult> {
  const session = await requireSession()

  const owns = (await sql`
    SELECT 1 FROM horses WHERE id = ${horseId} AND owner_id = ${session.userId}
  `) as unknown[]
  if (owns.length === 0) return { ok: false, error: 'You do not own this horse.' }

  try {
    // Run the atomic booking
    await sql`SELECT reserve_stable(${stableId}, ${horseId}, ${session.userId})`
    
    // Attach the note to the active reservation if provided
    if (note && note.trim()) {
      await sql`
        UPDATE reservations 
        SET note = ${note.trim()} 
        WHERE stable_id = ${stableId} 
          AND horse_id = ${horseId} 
          AND status = 'active'
      `
    }
    
   revalidatePath(`/${lang}/dashboard`)
    revalidatePath(`/${lang}/admin`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: cleanPgError((e as Error).message) }
  }
}

// Cancel a reservation. Riders can only cancel their own; admins can cancel any.
export async function cancelReservation(
  reservationId: number,
  lang: string
): Promise<ActionResult> {
  const session = await requireSession()
  let prev: any = null

  // If admin, fetch details before cancelling for the log
  if (session.role === 'admin') {
    prev = (await sql`
      SELECT h.name as horse_name, u.full_name as rider_name, s.barn, s.number as stable_number 
      FROM reservations r
      JOIN horses h ON r.horse_id = h.id
      JOIN users u ON r.rider_id = u.id
      JOIN stables s ON r.stable_id = s.id
      WHERE r.id = ${reservationId}
    `)[0]
  } else {
    const owns = (await sql`
      SELECT 1 FROM reservations WHERE id = ${reservationId} AND rider_id = ${session.userId}
    `) as unknown[]
    if (owns.length === 0) return { ok: false, error: 'Not your reservation.' }
  }

  try {
    await sql`SELECT cancel_reservation(${reservationId})`
    
    if (session.role === 'admin' && prev) {
      const desc = `${session.name} released horse ${prev.horse_name} (Rider: ${prev.rider_name}) from Barn ${prev.barn}-${prev.stable_number}.`
      await logAdminAction('RELEASE_STABLE', 'Reservation', reservationId, desc, { 
        horse: prev.horse_name, rider: prev.rider_name, stable: `Barn ${prev.barn}-${prev.stable_number}` 
      })
    }

    revalidatePath(`/${lang}/dashboard`)
    revalidatePath(`/${lang}/admin`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: cleanPgError((e as Error).message) }
  }
}

// Admin-only: move a reservation to a different stable atomically.
export async function moveReservation(
  reservationId: number,
  newStableId: number,
  lang: string
): Promise<ActionResult> {
  const session = await requireAdminSession()
  try {
    // 1. Fetch current state BEFORE moving to construct the log
    const prev = (await sql`
      SELECT s.barn, s.number as stable_number, h.name as horse_name, u.full_name as rider_name 
      FROM reservations r
      JOIN stables s ON s.id = r.stable_id
      JOIN horses h ON h.id = r.horse_id
      JOIN users u ON u.id = r.rider_id
      WHERE r.id = ${reservationId}
    `)[0] as any

    const next = (await sql`SELECT barn, number FROM stables WHERE id = ${newStableId}`)[0] as any

    // 2. Perform original action
    await sql`SELECT move_reservation(${reservationId}, ${newStableId})`
    await sql`UPDATE stables SET is_active = true WHERE id = ${newStableId}`

    // 3. Log the activity
    const desc = `${session.name} moved horse ${prev.horse_name} (Rider: ${prev.rider_name}) from Barn ${prev.barn} - Stable ${prev.stable_number} to Barn ${next.barn} - Stable ${next.number}.`
    
    await logAdminAction('MOVE_STABLE', 'Reservation', reservationId, desc, {
      horse: prev.horse_name, rider: prev.rider_name, 
      from: `Barn ${prev.barn}-${prev.stable_number}`, to: `Barn ${next.barn}-${next.number}`
    })

    revalidatePath(`/${lang}/dashboard`)
    revalidatePath(`/${lang}/admin`)
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
export async function getOfficialDocument(docKey: string = 'official_document'): Promise<string | null> {
  const rows = (await sql`
    SELECT value FROM settings WHERE key = ${docKey}
  `) as { value: string }[]
  return rows[0]?.value || null
}
// app/actions/stables.ts

// app/actions/stables.ts

// app/actions/stables.ts

export async function swapReservations(
  res1Id: number,
  stable1Id: number,
  res2Id: number,
  stable2Id: number,
  lang: string
): Promise<ActionResult> {
  const session = await requireAdminSession()
  try {
    // 1. Fetch previous state for both reservations
    const r1 = (await sql`
      SELECT h.name as horse_name, u.full_name as rider_name, s.barn, s.number as stable_number 
      FROM reservations r JOIN horses h ON r.horse_id = h.id JOIN users u ON r.rider_id = u.id JOIN stables s ON r.stable_id = s.id 
      WHERE r.id = ${res1Id}
    `)[0] as any
    const r2 = (await sql`
      SELECT h.name as horse_name, u.full_name as rider_name, s.barn, s.number as stable_number 
      FROM reservations r JOIN horses h ON r.horse_id = h.id JOIN users u ON r.rider_id = u.id JOIN stables s ON r.stable_id = s.id 
      WHERE r.id = ${res2Id}
    `)[0] as any

    await sql`UPDATE reservations SET status = 'cancelled' WHERE id = ${res1Id}`
    await sql`UPDATE reservations SET stable_id = ${stable1Id} WHERE id = ${res2Id}`
    await sql`UPDATE reservations SET stable_id = ${stable2Id}, status = 'active' WHERE id = ${res1Id}`
    await sql`UPDATE stables SET is_active = true WHERE id IN (${stable1Id}, ${stable2Id})`
    
    const desc = `${session.name} swapped ${r1.horse_name} (Barn ${r1.barn}-${r1.stable_number}) with ${r2.horse_name} (Barn ${r2.barn}-${r2.stable_number}).`
    await logAdminAction('SWAP_STABLES', 'Reservation', res1Id, desc, { 
      res1: r1, res2: r2 
    })

   revalidatePath(`/${lang}/dashboard`)
    revalidatePath(`/${lang}/admin`)
    return { ok: true }
  } catch (e) {
    console.error('Error swapping reservations:', e)
    return { ok: false, error: 'Could not swap reservations.' }
  }
}

// Update the official document URL (Admin only)

export async function setOfficialDocument(url: string, docKey: string = 'official_document' ,lang: string): Promise<ActionResult> {
  const session = await requireAdminSession()
  try {
    const oldDocRows = await sql`SELECT value FROM settings WHERE key = ${docKey}`
    const oldDocUrl = oldDocRows[0]?.value || 'None'

    await sql`
      INSERT INTO settings (key, value) 
      VALUES (${docKey}, ${url})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `
    
    const desc = `${session.name} uploaded a new ${docKey} document.`
    await logAdminAction('UPLOAD_FILE', 'Settings', docKey, desc, { 
      prev: oldDocUrl, new: url, docKey 
    })

    revalidatePath(`/${lang}/dashboard`)
    revalidatePath(`/${lang}/admin`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: 'Failed to update document.' }
  }
}
export async function deleteDocument(url: string, docKey: string, lang: string): Promise<ActionResult> {
  const session = await requireAdminSession()
  try {
    const fileKey = url.split('/').pop(); 
    if (fileKey) {
      await utapi.deleteFiles(fileKey);
    }

    await sql`DELETE FROM settings WHERE key = ${docKey}`
    
    const desc = `${session.name} deleted the ${docKey} document.`
    await logAdminAction('DELETE_FILE', 'Settings', docKey, desc, { 
      url, docKey 
    })

    revalidatePath(`/${lang}/dashboard`)
    revalidatePath(`/${lang}/admin`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: 'Failed to delete document.' }
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

// app/actions/stables.ts (Add these functions)

export async function getFacilityLocation(): Promise<string | null> {
  const rows = (await sql`
    SELECT value FROM settings WHERE key = 'facility_location'
  `) as { value: string }[]
  return rows[0]?.value || null
}

export async function setFacilityLocation(url: string,lang:string): Promise<ActionResult> {
  const session = await requireAdminSession()
  try {
    // Validate that it's a properly formatted URL
    try {
      new URL(url.trim());
    } catch (_) {
      return { ok: false, error: 'Invalid URL format. Please provide a valid link.' }
    }

    const oldLocationRows = await sql`SELECT value FROM settings WHERE key = 'facility_location'`
    const oldLocation = oldLocationRows[0]?.value || 'None'

    await sql`
      INSERT INTO settings (key, value) 
      VALUES ('facility_location', ${url.trim()})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `

    await logAdminAction('UPDATE_LOCATION', 'Settings', 'facility_location', 
      `${session.name} changed facility location link.`, 
      { prev: oldLocation, new: url.trim() }
    )

    revalidatePath(`/${lang}/dashboard`)
    revalidatePath(`/${lang}/admin`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: 'Failed to update facility location.' }
  }
}