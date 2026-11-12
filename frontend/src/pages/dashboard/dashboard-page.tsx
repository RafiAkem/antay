import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { NoEventSummary, RetryCard, SummarySkeleton } from '@/components/dashboard/dashboard-states'
import { EventOverview } from '@/components/dashboard/event-overview'
import { SlotChartCard } from '@/components/dashboard/slot-chart-card'
import { SummaryKpis } from '@/components/dashboard/summary-kpis'
import { useAnalyticsPage } from '@/components/dashboard/use-analytics-page'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'

// Form buat event v1 dulu ada di kolom kanan halaman ini. Sejak v2 event
// dibuat di /manage/events/new, jadi kolom kanan sekarang berisi event hari ini.
export function DashboardPage() {
  const page = useAnalyticsPage()
  const summaryPending =
    page.eventsLoading || page.summaryLoading || (Boolean(page.eventId) && !page.summary && !page.summaryError)

  return (
    <Section pad="sm" labelledBy="dashboard-title">
      <Container size="wide" className="grid gap-5">
        <DashboardHeader
          events={page.events}
          eventId={page.eventId}
          loading={page.eventsLoading}
          onSelect={page.selectEvent}
        />

        {page.eventsError ? (
          <RetryCard message={page.eventsError} onRetry={page.retryEvents} />
        ) : (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid min-w-0 gap-5">
              {summaryPending ? (
                <SummarySkeleton />
              ) : page.summaryError ? (
                <RetryCard message={page.summaryError} onRetry={page.retrySummary} />
              ) : page.summary ? (
                <>
                  <SummaryKpis summary={page.summary} />
                  <SlotChartCard summary={page.summary} />
                </>
              ) : (
                <NoEventSummary />
              )}
            </div>

            <EventOverview
              events={page.overview}
              loading={page.overviewLoading}
              error={page.overviewError}
              onRetry={page.retryOverview}
            />
          </div>
        )}
      </Container>
    </Section>
  )
}
