import { requireAdmin } from '@/app/actions/auth'
import { getOfficialDocument, getAdminPhone } from '@/app/actions/stables'
import { GenericDocumentManager } from '@/components/generic-document-manager'
import { AdminLocationManager } from '@/components/admin-location-manager'
import {
  getStableGrid,
  getBarnSummary,
  getRiderDirectory,
  getFacilityLocation
} from '@/app/actions/stables'
import { AppHeader } from '@/components/app-header'
import { AdminGridManager } from '@/components/admin-grid-manager'
import { RiderDirectory } from '@/components/rider-directory'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarnRangeManager } from '@/components/barn-range-manager'
import { AdminPhoneManager } from '@/components/admin-phone-manager'
import { ActivityLogTimeline } from '@/components/activity-log-timeline'
import { getAdminLogs } from '@/app/actions/audit'
import { getDictionary } from '@/dictionaries/get-dictionary'
import { DictionaryProvider } from '@/context/dictionary-context'

export default async function AdminPage({
  params,
}: {
  params: { lang: string }
}) {
  const resolvedParams = await params
  const lang = resolvedParams.lang 
  const dict = await getDictionary(lang)
  const t = dict.admin

  const session = await requireAdmin(lang)
  const [stables, summary, riders, logs, officialDocUrl, timeTableUrl, doorPicUrl, adminPhone, facilityLocation] = await Promise.all([
    getStableGrid(lang),
    getBarnSummary(),
    getRiderDirectory(),
    getAdminLogs(),
    getOfficialDocument('official_document'),
    getOfficialDocument('time_table'),
    getOfficialDocument('door_pic'),
    getAdminPhone(),
    getFacilityLocation(),
  ])

  const totalStables = summary.reduce((a, b) => a + b.total, 0)
  const occupied = summary.reduce((a, b) => a + b.occupied, 0)
  const available = summary.reduce((a, b) => a + b.available, 0)
  const occupancy = totalStables ? Math.round((occupied / totalStables) * 100) : 0
  
  // Extract just the unique barn names from the summary data
  const uniqueBarns = summary.map((s) => s.barn)

  return (
    <DictionaryProvider dictionary={dict} lang={lang}>
      <div className="min-h-svh bg-background">
        <AppHeader name={session.name} role="admin" params={params}/>
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div>
            <h1 className="text-balance font-serif text-2xl font-semibold text-foreground">
              {t.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.description}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label={t.totalStables} value={totalStables} />
            <StatCard label={t.occupied} value={occupied} />
            <StatCard label={t.available} value={available} />
            <StatCard label={t.occupancy} value={`${occupancy}%`} />
          </div>

          <Tabs defaultValue="grid" className="mt-8">
            <div className="overflow-x-auto">
              <TabsList className="inline-flex w-max min-w-full sm:w-auto">
                <TabsTrigger value="grid" className="shrink-0">
                  {t.tabs.grid}
                </TabsTrigger>
                <TabsTrigger value="riders" className="shrink-0">
                  {t.tabs.riders} ({riders.length})
                </TabsTrigger>
                <TabsTrigger value="barns" className="shrink-0">
                  {t.tabs.barns}
                </TabsTrigger>
                <TabsTrigger value="audit" className="shrink-0">
                  {t.tabs.audit}
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="grid" className="mt-4">
              <AdminGridManager stables={stables} />
            </TabsContent>
            
            <TabsContent value="riders" className="mt-4">
              <RiderDirectory riders={riders} dict ={dict}/>
            </TabsContent>
            
            <TabsContent value="barns" className="mt-4 flex flex-col gap-6">
              <AdminPhoneManager initialPhone={adminPhone} />
              <AdminLocationManager initialUrl={facilityLocation} />
           
              <GenericDocumentManager 
                currentUrl={officialDocUrl} 
                docKey="official_document"
                title={t.docs.stablePlan} 
                description={t.docs.stablePlanDesc}
                endpoint="facilityDocument"
                dict ={dict}
              />
              <GenericDocumentManager 
                currentUrl={timeTableUrl} 
                docKey="time_table"
                title={t.docs.locationPhoto} 
                description={t.docs.locationPhotoDesc}
                endpoint="timeTableDocument"
                type="image"
                dict ={dict}
              />
              <GenericDocumentManager 
                currentUrl={doorPicUrl} 
                docKey="door_pic"
                title={t.docs.feiSchedule} 
                description={t.docs.feiScheduleDesc}
                endpoint="doorPicDocument"
                dict ={dict}
              />
              <BarnRangeManager barns={uniqueBarns} />
            </TabsContent>
            
            <TabsContent value="audit" className="mt-4">
              <ActivityLogTimeline logs={logs} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </DictionaryProvider>
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