import type { BoardData } from '@/types/api'

function Figure({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="grid content-start gap-1 sm:border-l sm:border-board-line sm:pl-6 sm:first:border-l-0 sm:first:pl-0">
      <span className="text-sm text-board-ink/70 sm:text-base">{label}</span>
      <strong className="num text-6xl leading-none font-semibold tracking-[-0.03em] sm:text-7xl lg:text-8xl">
        {value}
      </strong>
      <span className="text-sm text-board-ink/70">{unit}</span>
    </div>
  )
}

export function BoardPanel({ data }: { data: BoardData }) {
  const current = data.currentSlot ? `${data.currentSlot.start}-${data.currentSlot.end}` : '-'
  const next = data.nextOpenSlot
    ? `${data.nextOpenSlot.start} · sisa ${data.nextOpenSlot.left}`
    : 'tidak ada'

  return (
    <div className="grid gap-7 rounded-[12px] bg-board p-5 text-board-ink sm:p-7 lg:p-9">
      <div>
        <span className="num text-sm text-board-ink/70 sm:text-[15px]">
          {data.event.place} · {data.now}
        </span>
        <h2 className="mt-1 text-2xl leading-8 font-semibold tracking-[-0.01em] sm:text-3xl sm:leading-10">
          {data.event.name}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0">
        <Figure label="Perkiraan tunggu" value={data.queue.waitMinutes} unit="menit" />
        <Figure label="Orang antre" value={data.queue.waiting} unit="orang" />
        <Figure label="Loket buka" value={data.event.counterCount} unit="loket" />
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-2.5 text-base leading-7 text-board-ink/70 sm:text-lg">
        <span>
          Melayani slot <b className="num font-semibold text-board-ink">{current}</b>
        </span>
        <span>
          Slot kosong berikutnya <b className="num font-semibold text-board-ink">{next}</b>
        </span>
      </div>

      {data.upcoming.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Slot berikutnya">
          {data.upcoming.slice(0, 4).map((slot) => (
            <div key={slot.start} className="grid gap-1 rounded-lg bg-board-ink/5 px-4 py-3.5">
              <b className="num text-2xl leading-7 font-semibold">{slot.start}</b>
              <span className="num text-sm text-board-ink/70">
                {slot.left > 0 ? `sisa ${slot.left} dari ${slot.capacity}` : 'penuh'}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {data.queue.long ? (
        <div className="rounded-[var(--radius-control)] bg-warning-bg px-5 py-4 text-base leading-6 font-semibold text-warning-ink sm:text-xl sm:leading-7">
          Antrean panjang. Petugas sedang membuka loket tambahan.
        </div>
      ) : null}
    </div>
  )
}
