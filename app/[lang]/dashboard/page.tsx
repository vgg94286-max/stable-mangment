import { requireRider } from '@/app/actions/auth'
import {
  getMyHorses,
  getMyReservations,
  getStableGrid,
  getBarnSummary,
  getOfficialDocument,
  getAdminPhone,
  getFacilityLocation
} from '@/app/actions/stables'
import { AppHeader } from '@/components/app-header'
import { BookingFlow } from '@/components/booking-flow'
import { RiderReservations } from '@/components/rider-reservations'
import { StableDocumentButton } from '@/components/stable-document-button'
import { Card } from '@/components/ui/card'
import { Phone } from 'lucide-react'
import { LocationModalButton } from '@/components/location-modal-button'
import { getDictionary } from '@/dictionaries/get-dictionary'
import { DictionaryProvider } from '@/context/dictionary-context'

type AdminContact = { name: string; phone: string }

// adminPhone is stored as a JSON-encoded array of {name, phone} contacts (see
// admin-phone-manager.tsx). Older data may still be a single plain phone
// string, so fall back to treating the whole value as one contact's number.
function parseAdminContacts(raw: string | null): AdminContact[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (c): c is AdminContact => !!c && typeof c === 'object' && !!c.phone,
      )
    }
  } catch {
    // Not JSON — legacy plain-string phone number.
  }
  return [{ name: 'Admin', phone: raw }]
}

export default async function DashboardPage({
  params,
}: {
  params: { lang: string }
}) {
  const resolvedParams = await params
  const lang = resolvedParams.lang 
  const dict = await getDictionary(lang)
  const t = dict.dashboard
  
  const session = await requireRider(lang)
  const [
    horses,
    reservations,
    stables,
    adminPhone,
    summary,
    officialDocUrl,
    timeTableUrl,
    doorPicUrl,
    facilityLocation,
  ] = await Promise.all([
    getMyHorses(),
    getMyReservations(),
    getStableGrid(lang),
    getAdminPhone(),
    getBarnSummary(),
    getOfficialDocument('official_document'),
    getOfficialDocument('time_table'),
    getOfficialDocument('door_pic'),
    getFacilityLocation(),
  ])

  const totalStables = summary.reduce((a, b) => a + b.total, 0)
  const occupied = summary.reduce((a, b) => a + b.occupied, 0)
  const available = summary.reduce((a, b) => a + b.available, 0)
  const adminContacts = parseAdminContacts(adminPhone)

  return (
    <DictionaryProvider dictionary={dict} lang={lang}>
      <div className="min-h-svh bg-background">
        <AppHeader name={session.name} role="rider" params={params}/>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
          {/* Header & Primary CTA */}
          <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {t.welcome}, {session.name.split(' ')[0]}
                </h1>

                {adminContacts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t.contactAdmin}:
                    </span>
                    {adminContacts.map((contact, i) => (
                      <a
                        key={`${contact.phone}-${i}`}
                        href={`tel:${contact.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <Phone className="size-3 text-primary" />
                        <span>
                          {contact.name ? `${contact.name} · ` : ''}
                          <strong>{contact.phone}</strong>
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {t.description}
              </p>
            </div>

            <div className="shrink-0 pt-1 sm:pt-0">
              <BookingFlow horses={horses} stables={stables} />
            </div>
          </div>

          {/* Quick Links / Documents Toolbar */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              {t.documents}:
            </span>
            <StableDocumentButton
              riderName={session.name}
              reservations={reservations}
              officialDocUrl={officialDocUrl}
              name={t.stablePlan}
              dict={dict}
            />
            <LocationModalButton
              imageUrl={timeTableUrl}
              mapUrl={facilityLocation}
              name={t.facilityLocation}
              dict={dict}
              
            />
            <StableDocumentButton
              riderName={session.name}
              reservations={reservations}
              officialDocUrl={doorPicUrl}
              name={t.feiSchedule}
              dict={dict}
            />
          </div>

          {/* Overview Stats (3 Grid Columns) */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label={t.yourHorses} value={horses.length} />
            <StatCard label={t.yourReservations} value={reservations.length} />
            <StatCard label={t.availableStables} value={available} />
          </div>

          {/* Reservations Section */}
          <section className="mt-8">
            <h2 className="mb-3 font-serif text-lg font-semibold text-foreground">
              {t.reservationsHeading}
            </h2>
            <RiderReservations reservations={reservations} dict = {dict}/>
          </section>
        </main>
      </div>
    </DictionaryProvider>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4 transition-colors hover:border-primary/40">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {value.toLocaleString()}
      </p>
    </Card>
  )
}