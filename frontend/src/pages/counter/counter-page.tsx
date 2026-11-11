import { CounterBar } from '@/components/counter/counter-bar'
import { CounterEventsError, CounterNoEvents, CounterSkeleton } from '@/components/counter/counter-states'
import { QueuePanel } from '@/components/counter/queue-panel'
import { TicketLookup } from '@/components/counter/ticket-lookup'
import { useTicketDesk } from '@/components/counter/use-ticket-desk'
import { WaitingList } from '@/components/counter/waiting-list'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Heading, Paragraph } from '@/components/ui/text'

export function CounterPage() {
  const desk = useTicketDesk()
  const { event } = desk

  return (
    <Section pad="sm" labelledBy="counter-title">
      <Container size="wide" className="grid min-w-0 gap-4">
        <div className="grid gap-1">
          <Heading level={1} id="counter-title">
            Loket penukaran
          </Heading>
          <Paragraph tone="muted" className="max-w-[70ch]">
            {event
              ? `${event.place} · ${event.openTime}-${event.closeTime} · ${event.requirement}`
              : 'Pilih event untuk mulai melayani.'}
          </Paragraph>
        </div>

        {desk.eventsError ? (
          <CounterEventsError message={desk.eventsError} onRetry={desk.loadEvents} />
        ) : desk.eventsLoading ? (
          <CounterSkeleton />
        ) : desk.events.length === 0 ? (
          <CounterNoEvents />
        ) : (
          <CounterBar
            events={desk.events}
            event={event}
            counter={desk.counter}
            busy={desk.counterBusy}
            onEventChange={desk.setEventId}
            onCounterChange={desk.setCounter}
            onCountersChange={desk.onCountersChange}
          />
        )}

        {event && !desk.eventsLoading ? (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid min-w-0 gap-4">
              <TicketLookup
                code={desk.code}
                item={event.item}
                checking={desk.checking}
                redeeming={desk.redeeming}
                ktpChecked={desk.ktpChecked}
                result={desk.result}
                error={desk.lookupError}
                onCodeChange={desk.onCodeChange}
                onCheck={desk.onCheck}
                onKtpChange={desk.onKtpChange}
                onRedeem={desk.onRedeem}
                onCancel={desk.onCancel}
              />
              <WaitingList
                slots={desk.waitingSlots}
                tickets={desk.waiting}
                search={desk.search}
                onSearchChange={desk.setSearch}
                onPick={desk.onPick}
              />
            </div>
            <QueuePanel event={event} waitingCount={desk.waitingDraft} onWaitingChange={desk.setWaitingDraft} />
          </div>
        ) : null}
      </Container>
    </Section>
  )
}
