import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

// Tagged-template SQL client. Use sql`...` for parameterized queries.
export const sql = neon(process.env.DATABASE_URL)

// Shared domain types
export type UserRole = 'rider' | 'admin'

export type User = {
  id: number
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  email_verified: boolean
  created_at: string
}



export type Horse = {
  id: number
  owner_id: number
  name: string
  international_id: number | null
  gender: string | null 
  
  notes: string | null
  created_at: string
}

export type StableStatus = 'available' | 'occupied'

export type Stable = {
  id: number
  barn: string
  number: number
  label: string
  status: StableStatus
}

// Enriched stable row used by the admin grid (joined with reservation/horse/rider)
export type StableGridItem = Stable & {
  reservation_id: number | null
  horse_id: number | null
  horse_name: string | null
  is_active: boolean
  gender: string | null 
  rider_id: number | null
  rider_name: string | null
  note?: string | null
}

export type ReservationDetail = {
  reservation_id: number
  status: 'active' | 'cancelled'
  reserved_at: string
  stable_id: number
  stable_label: string
  horse_id: number
  horse_name: string
  gender: string | null // <-- Replaced horse_type
  rider_id: number
  rider_name: string
  rider_email: string
  note?: string | null
}


