'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { 
  ArrowLeftRight, FileText, Ban, CheckCircle, Smartphone, 
  Layers, DoorClosed, History 
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { AdminActivityLog } from '@/app/actions/audit'
import { useDictionary } from '@/context/dictionary-context'

// Map action types to icons
const getActionIcon = (type: string) => {
  switch (type) {
    case 'MOVE_STABLE': return <ArrowLeftRight className="size-4 text-blue-500" />
    case 'SWAP_STABLES': return <ArrowLeftRight className="size-4 text-indigo-500" />
    case 'RELEASE_STABLE': return <DoorClosed className="size-4 text-orange-500" />
    case 'BLOCK_UNBLOCK_STABLE': 
    case 'BULK_BLOCK_UNBLOCK': return <Ban className="size-4 text-red-500" />
    case 'UPLOAD_FILE': return <FileText className="size-4 text-green-500" />
    case 'UPDATE_PHONE': return <Smartphone className="size-4 text-purple-500" />
    case 'VISIBLE_RANGE': return <Layers className="size-4 text-teal-500" />
    default: return <History className="size-4 text-gray-500" />
  }
}

export function ActivityLogTimeline({ logs }: { logs: AdminActivityLog[] }) {
  const [filterType, setFilterType] = useState('ALL')
  const { dictionary } = useDictionary()
  const t = dictionary.activityLog

  const filteredLogs = filterType === 'ALL' 
    ? logs 
    : logs.filter(log => log.action_type === filterType)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b pb-4">
         {/* Simple filter dropdown */}
         <select 
           className="border rounded p-2 text-sm bg-background"
           value={filterType} 
           onChange={(e) => setFilterType(e.target.value)}
         >
           <option value="ALL">{t.all}</option>
           <option value="MOVE_STABLE">{t.move}</option>
           <option value="SWAP_STABLES">{t.swap}</option>
           <option value="RELEASE_STABLE">{t.release}</option>
           <option value="UPLOAD_FILE">{t.uploads}</option>
         </select>
      </div>

      <div className="relative border-l border-muted-foreground/20 ml-3 space-y-6">
        {filteredLogs.map((log) => (
          <div key={log.id} className="relative pl-6">
            <div className="absolute -left-[13px] top-1 flex size-6 items-center justify-center rounded-full border bg-card">
              {getActionIcon(log.action_type)}
            </div>
            
            <Card className="p-4 flex flex-col gap-1 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-sm">{log.admin_name}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              <p className="text-sm text-foreground mt-1">
                {log.description}
              </p>
            </Card>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <p className="pl-6 text-sm text-muted-foreground">{t.empty}</p>
        )}
      </div>
    </div>
  )
}