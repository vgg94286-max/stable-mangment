'use server'

import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function logAdminAction(
  actionType: string,
  entityType: string,
  entityId: string | number | null,
  description: string,
  metadata: Record<string, any>
) {
  const session = await getSession()
  if (session?.role !== 'admin') return

  try {
    await sql`
      INSERT INTO admin_activity_logs 
        (admin_id, action_type, entity_type, entity_id, description, metadata)
      VALUES (
        ${session.userId}, ${actionType}, ${entityType}, 
        ${entityId?.toString() || null}, ${description}, ${JSON.stringify(metadata)}
      )
    `
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}

export type AdminActivityLog = {
  id: number
  admin_id: number
  admin_name: string
  action_type: string
  entity_type: string
  description: string
  metadata: any
  created_at: string
}

export async function getAdminLogs(filters?: { actionType?: string; adminId?: number }): Promise<AdminActivityLog[]> {
  const session = await getSession()
  if (session?.role !== 'admin') throw new Error('Unauthorized')

  // Building query dynamically based on filters (pseudo-implementation)
  let query = sql`
    SELECT a.*, u.full_name as admin_name 
    FROM admin_activity_logs a
    LEFT JOIN users u ON u.id = a.admin_id
    WHERE 1=1
  `
  if (filters?.actionType) {
    query = sql`${query} AND a.action_type = ${filters.actionType}`
  }
  if (filters?.adminId) {
    query = sql`${query} AND a.admin_id = ${filters.adminId}`
  }
  
  query = sql`${query} ORDER BY a.created_at DESC LIMIT 200`
  
  return (await query) as AdminActivityLog[]
}