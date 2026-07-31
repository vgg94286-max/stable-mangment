import { requireAdmin } from '@/app/actions/auth'
import { getOfficialDocument,getAdminPhone } from '@/app/actions/stables'
import { GenericDocumentManager } from '@/components/generic-document-manager'
import {
  getStableGrid,
  getBarnSummary,
  getRiderDirectory,
} from '@/app/actions/stables'
import { AppHeader } from '@/components/app-header'
import { AdminGridManager } from '@/components/admin-grid-manager'
import { RiderDirectory } from '@/components/rider-directory'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarnRangeManager } from '@/components/barn-range-manager'
import { LanguageSwitcher } from '@/components/language-switcher'
import { AdminPhoneManager } from '@/components/admin-phone-manager'

export default async function AdminPage() {
  const session = await requireAdmin()
  const [stables, summary, riders, officialDocUrl, timeTableUrl, doorPicUrl, adminPhone] = await Promise.all([
    getStableGrid(),
    getBarnSummary(),
    getRiderDirectory(),
    getOfficialDocument('official_document'),
    getOfficialDocument('time_table'),
    getOfficialDocument('door_pic'),
    getAdminPhone(),
  ])

  const totalStables = summary.reduce((a, b) => a + b.total, 0)
  const occupied = summary.reduce((a, b) => a + b.occupied, 0)
  const available = totalStables - occupied
  const occupancy = totalStables ? Math.round((occupied / totalStables) * 100) : 0
  // Extract just the unique barn names from the summary data
  const uniqueBarns = summary.map((s) => s.barn)

  return (
    <div className="min-h-svh bg-background">
      <AppHeader name={session.name} role="admin" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div>
          <h1 className="text-balance font-serif text-2xl font-semibold text-foreground">
            Administration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Oversee stable occupancy, reassign horses, and manage riders.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total stables" value={totalStables} />
          <StatCard label="Occupied" value={occupied} />
          <StatCard label="Available" value={available} />
          <StatCard label="Occupancy" value={`${occupancy}%`} />
        </div>

        <Tabs defaultValue="grid" className="mt-8">
          <TabsList>
            <TabsTrigger value="grid">Stable grid</TabsTrigger>
            <TabsTrigger value="riders">Riders ({riders.length})</TabsTrigger>
            <TabsTrigger value="barns">Barn range</TabsTrigger>
          </TabsList>
          <TabsContent value="grid" className="mt-4">
            <AdminGridManager stables={stables} />
          </TabsContent>
          <TabsContent value="riders" className="mt-4">
            <RiderDirectory riders={riders} />
          </TabsContent>
          <TabsContent value="barns" className="mt-4 flex flex-col gap-6">
            <AdminPhoneManager initialPhone={adminPhone} />
           <GenericDocumentManager 
                currentUrl={officialDocUrl} 
                docKey="official_document"
                title="Official Facility Document"
                description="Upload Facility Rules or Map."
                endpoint="facilityDocument"
              />
              <GenericDocumentManager 
                currentUrl={timeTableUrl} 
                docKey="time_table"
                title="Time Table"
                description="Upload the current rider or stable schedule."
                endpoint="timeTableDocument"
              />
              <GenericDocumentManager 
                currentUrl={doorPicUrl} 
                docKey="door_pic"
                title="Door Picture"
                description="Upload a reference picture of the stable door."
                endpoint="doorPicDocument"
              />
            <BarnRangeManager barns={uniqueBarns} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-foreground">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </Card>
  )
}
