import { cn } from '@/components/ui/cn'
import type { BoardData } from '@/types/api'
import { BoardSlots } from './board-slots'

// Papan dibaca dari sekitar tiga meter, jadi ukuran ditulis dengan clamp
// berbasis lebar layar: TV 1080p dapat angka sekitar 180px, laptop tetap muat.
// Angka tunggu dibuat paling besar karena itu yang dicari orang pertama kali.
function Figure({ label, value, unit, lead = false }: { label: string; value: number; unit: string; lead?: boolean }) {
  return (
    <div className="grid content-start gap-2 border-board-line sm:border-l sm:pl-[clamp(16px,2.4vw,40px)] sm:first:border-l-0 sm:first:pl-0">
      <span className="text-[clamp(15px,1.6vw,26px)] leading-tight font-semibold text-board-dim">{label}</span>
      <strong
        className={cn(
          'num leading-[0.9] font-bold tracking-[-0.04em]',
          lead ? 'text-[clamp(72px,11vw,200px)]' : 'text-[clamp(56px,7.5vw,140px)]',
        )}
      >
        {value}
      </strong>
      <span className="text-[clamp(15px,1.6vw,26px)] text-board-dim">{unit}</span>
    </div>
  )
}

export function BoardPanel({ data }: { data: BoardData }) {
  const current = data.currentSlot ? `${data.currentSlot.start}-${data.currentSlot.end}` : '-'
  const next = data.nextOpenSlot ? `${data.nextOpenSlot.start} · sisa ${data.nextOpenSlot.left}` : 'tidak ada'

  return (
    <div className="grid gap-[clamp(24px,4vw,56px)] rounded-card bg-board p-[clamp(20px,4vw,64px)] text-board-ink">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <span className="text-[clamp(15px,1.6vw,26px)] text-board-dim">{data.event.place}</span>
          <h2 className="text-[clamp(26px,3.6vw,60px)] leading-[1.1] font-bold tracking-[-0.02em] text-balance">
            {data.event.name}
          </h2>
        </div>
        <span className="num font-mono text-[clamp(28px,3.6vw,60px)] leading-none font-semibold" aria-label={`Pukul ${data.now}`}>
          {data.now}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-[1.3fr_1fr_1fr] sm:gap-0">
        <div className="col-span-2 sm:col-span-1">
          <Figure label="Perkiraan tunggu" value={data.queue.waitMinutes} unit="menit" lead />
        </div>
        <Figure label="Orang antre" value={data.queue.waiting} unit="orang" />
        <Figure label="Loket buka" value={data.event.counterCount} unit="loket" />
      </div>

      <dl className="grid gap-x-10 gap-y-3 border-t border-board-line pt-[clamp(16px,2.4vw,32px)] text-[clamp(17px,2vw,32px)] leading-tight sm:flex sm:flex-wrap">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <dt className="text-board-dim">Melayani slot</dt>
          <dd className="num font-bold">{current}</dd>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <dt className="text-board-dim">Slot kosong berikutnya</dt>
          <dd className="num font-bold">{next}</dd>
        </div>
      </dl>

      <BoardSlots slots={data.upcoming} />

      {data.queue.long ? (
        <p className="rounded-control border-l-8 border-scarce bg-warning-bg px-[clamp(16px,2vw,32px)] py-[clamp(12px,1.6vw,24px)] text-[clamp(17px,2.2vw,36px)] leading-tight font-bold text-warning-ink">
          Antrean panjang. Petugas sedang membuka loket tambahan.
        </p>
      ) : null}
    </div>
  )
}
