import { CounterBar } from '@/components/operational/counter-bar'
import { Notice } from '@/components/operational/notice'
import { QueuePanel } from '@/components/operational/queue-panel'
import { TicketLookup } from '@/components/operational/ticket-lookup'
import { useTicketDesk } from '@/components/operational/use-ticket-desk'
import { WaitingList } from '@/components/operational/waiting-list'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/pill'

export function TicketDeskPage() {
  const desk = useTicketDesk()
  const { event } = desk

  return (
    <div className="grid min-w-0 gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">Loket penukaran</h1>
        <p className="mt-1 max-w-[70ch] text-sm leading-5 text-muted">
          {event
            ? `${event.place} · ${event.openTime}-${event.closeTime} · ${event.requirement}`
            : 'Pilih event untuk mulai melayani.'}
        </p>
      </div>

      {desk.eventsError ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <Notice tone="bad" title="Event gagal dimuat">
              {desk.eventsError}
            </Notice>
          </div>
          <Button variant="ghost" onClick={desk.loadEvents}>
            Muat ulang
          </Button>
        </div>
      ) : desk.eventsLoading ? (
        <p className="text-sm text-muted">Memuat event...</p>
      ) : desk.events.length === 0 ? (
        <Empty
          title="Belum ada event hari ini"
          hint="Admin bisa membuat event dari halaman Dasbor, lalu petugas melayani di sini."
        />
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

      {event ? (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
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
          <QueuePanel
            event={event}
            waitingCount={desk.waitingDraft}
            onWaitingChange={desk.setWaitingDraft}
          />
        </div>
      ) : null}
    </div>
  )
}
