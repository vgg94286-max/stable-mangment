import { requireRider } from '@/app/actions/auth'
import {
  getMyHorses,
  getMyReservations,
  getStableGrid,
  getBarnSummary,
  getOfficialDocument
} from '@/app/actions/stables'
import { AppHeader } from '@/components/app-header'
import { BookingFlow } from '@/components/booking-flow'
import { RiderReservations } from '@/components/rider-reservations'
import { StableDocumentButton } from '@/components/stable-document-button'
import { Card } from '@/components/ui/card'

export default async function DashboardPage() {
  const session = await requireRider()
  const [horses, reservations, stables, summary , officialDocUrl] = await Promise.all([
    getMyHorses(),
    getMyReservations(),
    getStableGrid(),
    getBarnSummary(),
    getOfficialDocument()
  ])

  const totalStables = summary.reduce((a, b) => a + b.total, 0)
  const occupied = summary.reduce((a, b) => a + b.occupied, 0)
  const available = totalStables - occupied

  return (
    <div className="min-h-svh bg-background">
      <AppHeader name={session.name} role="rider" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-balance font-serif text-2xl font-semibold text-foreground">
              Welcome, {session.name.split(' ')[0]}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your horses and stable reservations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StableDocumentButton riderName={session.name} reservations={reservations} officialDocUrl={officialDocUrl}/>
            <BookingFlow horses={horses} stables={stables} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Your horses" value={horses.length} />
          <StatCard label="Your reservations" value={reservations.length} />
          <StatCard label="Available stables" value={available} />
          <StatCard label="Total stables" value={totalStables} />
        </div>

        <section className="mt-8">
          <h2 className="mb-3 font-serif text-lg font-semibold text-foreground">
            Your reservations
          </h2>
          <RiderReservations reservations={reservations} />
        </section>
      </main>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold text-foreground">
        {value.toLocaleString()}
      </p>
    </Card>
  )
}
