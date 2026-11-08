import { Pill } from '@/components/ui/pill'

// Contoh tiket memakai potongan UI yang sama dengan tiket sungguhan.
// Pengunjung jadi tahu bentuk kode dan jam datang tanpa harus memesan dulu.
export function SampleTicket() {
  return (
    <figure className="grid min-w-0 gap-2">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-tint-100 bg-tint-50 px-5 py-3.5">
          <div className="grid min-w-0 gap-0.5">
            <span className="text-xs text-accent-ink">Tiket penukaran</span>
            <b className="truncate text-sm font-semibold">Pengambilan Race Pack Lari</b>
          </div>
          <span className="flex-none rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
            Contoh
          </span>
        </div>

        <div className="grid gap-4 p-5">
          <div className="grid gap-0.5">
            <span className="text-xs text-muted">Kode tiket</span>
            <span className="font-mono text-2xl font-semibold tracking-[0.04em]">RF-7K2Q</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid gap-0.5">
              <span className="text-[13px] text-muted">Jam datang</span>
              <strong className="num text-2xl font-semibold tracking-[-0.01em]">18:00-18:30</strong>
            </div>
            <Pill tone="brand">Datang 18:00</Pill>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-control px-5 py-3 text-[13px] text-muted">
          <span>Atrium utama</span>
          <span className="num">sisa 12 kuota</span>
        </div>
      </div>
      <figcaption className="text-xs leading-[17px] text-muted">
        Contoh tiket. Kode dan angka di atas bukan tiket sungguhan.
      </figcaption>
    </figure>
  )
}
