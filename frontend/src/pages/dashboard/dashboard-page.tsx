import { Button } from '@/components/ui/button'
import { Card, CardHead } from '@/components/ui/card'
import { Empty } from '@/components/ui/pill'
import { Select } from '@/components/ui/select'
import { CreateEventForm } from '@/components/dashboard/create-event-form'
import { EventOverview } from '@/components/dashboard/event-overview'
import { SlotChart } from '@/components/dashboard/slot-chart'
import { SummaryKpis } from '@/components/dashboard/summary-kpis'
import { useAnalyticsPage } from '@/components/dashboard/use-analytics-page'
import { todayLabel } from '@/lib/format'

function Skeleton() {
  return (
    <div className="grid gap-5" role="status" aria-label="Memuat ringkasan event">
      <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface sm:grid-cols-4">
        {[0, 1, 2, 3].map((cell) => (
          <div key={cell} className="grid gap-2 p-4">
            <div className="h-3 w-16 animate-pulse rounded bg-raised" />
            <div className="h-7 w-20 animate-pulse rounded bg-raised" />
            <div className="h-2.5 w-24 animate-pulse rounded bg-raised" />
          </div>
        ))}
      </div>
      <div className="h-[260px] animate-pulse rounded-[var(--radius-card)] border border-border-soft bg-surface" />
    </div>
  )
}

function RetryCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <div className="grid justify-items-start gap-3">
        <p className="text-sm text-negative-ink">{message}</p>
        <Button variant="ghost" size="small" onClick={onRetry}>
          Coba lagi
        </Button>
      </div>
    </Card>
  )
}

function Legend() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-1 w-4 rounded-full bg-tint-200" aria-hidden="true" />
        terdaftar
      </span>
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-1 w-4 rounded-full bg-accent" aria-hidden="true" />
        sudah ditukar
      </span>
    </span>
  )
}

export function DashboardPage() {
  const page = useAnalyticsPage()
  const selected = page.events.find((event) => event.id === page.eventId)

  return (
    <div className="mx-auto grid max-w-[1180px] gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1">
          <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.01em]">Dasbor mal</h1>
          <p className="text-sm leading-5 text-muted">
            {todayLabel()}
            {selected ? ` · ${selected.name} di ${selected.place}` : ' · belum ada event terpilih'}
          </p>
        </div>
        <Select
          label="Event"
          className="sm:w-[340px]"
          value={page.eventId}
          options={page.events.map((event) => ({
            value: event.id,
            label: `${event.name} · ${event.place}`,
          }))}
          onChange={page.selectEvent}
          placeholder={page.eventsLoading ? 'Memuat event...' : 'Belum ada event'}
          disabled={page.eventsLoading || page.events.length === 0}
        />
      </div>

      {page.eventsError ? (
        <RetryCard message={page.eventsError} onRetry={page.retryEvents} />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="grid gap-5">
            {page.eventsLoading ||
            page.summaryLoading ||
            (Boolean(page.eventId) && !page.summary && !page.summaryError) ? (
              <Skeleton />
            ) : page.summaryError ? (
              <RetryCard message={page.summaryError} onRetry={page.retrySummary} />
            ) : page.summary ? (
              <>
                <SummaryKpis summary={page.summary} />
                <Card>
                  <CardHead title="Kuota per slot" meta={<Legend />} />
                  {page.summary.slots.length === 0 ? (
                    <Empty title="Belum ada slot" hint="Event ini belum punya jadwal slot." />
                  ) : (
                    <SlotChart summary={page.summary} />
                  )}
                </Card>
              </>
            ) : (
              <Card>
                <Empty
                  title="Belum ada event hari ini"
                  hint="Buat event baru lewat formulir di samping untuk melihat ringkasan kuota."
                />
              </Card>
            )}

            <EventOverview
              events={page.overview}
              loading={page.overviewLoading}
              error={page.overviewError}
              onRetry={page.retryOverview}
            />
          </div>

          <CreateEventForm onCreated={page.handleCreated} />
        </div>
      )}
    </div>
  )
}
