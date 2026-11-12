import { Button } from '@/components/ui/button'
import { Empty } from '@/components/ui/pill'
import { Heading, Paragraph } from '@/components/ui/text'
import type { ManageSeatStatus, SeatBlock } from '@/types/seating'
import { SeatLegend } from './seat-legend'

type IdleProps = {
  blocks: SeatBlock[]
  lockedIds: ReadonlySet<string>
  hasSeatedCategory: boolean
  adding: boolean
  onSelect: (id: string) => void
  onAdd: () => void
}

export function IdlePanel({ blocks, lockedIds, hasSeatedCategory, adding, onSelect, onAdd }: IdleProps) {
  if (!hasSeatedCategory) {
    return (
      <Empty
        title="Belum ada kategori yang memakai kursi"
        hint="Tandai minimal satu kategori sebagai pakai kursi, simpan, lalu kembali ke sini untuk membuat bloknya."
      />
    )
  }
  if (blocks.length === 0) {
    return (
      <Empty
        title="Denah masih kosong"
        hint="Tambah blok pertama. Blok muncul di tengah kanvas, lalu bisa diseret ke depan panggung dan diatur barisnya di panel ini."
        action={
          <Button size="small" className="mt-2 justify-self-start" onClick={onAdd} disabled={adding}>
            {adding ? 'Menambah...' : 'Tambah blok'}
          </Button>
        }
      />
    )
  }
  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <Heading level={3} size="md">
          Blok di denah ini
        </Heading>
        <Paragraph tone="muted" size="sm">
          Klik blok di kanvas atau di daftar ini untuk mengatur baris, kursi, dan lengkungannya. Klik panggung untuk
          mengganti label dan ukurannya.
        </Paragraph>
      </div>
      <ul className="grid gap-1.5">
        {blocks.map((block) => (
          <li key={block.id}>
            <button
              type="button"
              onClick={() => onSelect(block.id)}
              className="flex w-full items-center justify-between gap-3 rounded-control border border-border-soft px-3 py-2 text-left hover:border-control focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="grid min-w-0">
                <span className="truncate text-sm font-semibold">{block.name}</span>
                <span className="truncate text-xs text-muted">
                  <span className="font-mono">{block.code}</span> · {block.categoryName}
                  {lockedIds.has(block.id) ? ' · terkunci' : ''}
                </span>
              </span>
              <span className="flex-none font-mono text-xs text-muted">{block.seatCount} kursi</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SeatModePanel({ counts, saving }: { counts: Record<ManageSeatStatus, number>; saving: boolean }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <Heading level={3} size="md">
          Atur kursi
        </Heading>
        <Paragraph tone="muted" size="sm">
          Klik kursi untuk menandainya tidak dipakai, misalnya karena tiang atau kursi teknis. Klik lagi untuk
          memakainya kembali. Seret kotak untuk banyak kursi sekaligus: bila semua di dalam kotak sudah mati, kotak
          itu menyalakannya.
        </Paragraph>
      </div>
      <SeatLegend counts={counts} />
      <Paragraph tone="muted" size="sm">
        {saving ? 'Menyimpan status kursi...' : 'Perubahan langsung tersimpan.'} Kursi terjual atau ditahan tidak bisa
        diubah.
      </Paragraph>
    </div>
  )
}
