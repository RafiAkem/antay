import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Label } from '@/components/ui/text'
import type { ManageSeat, SeatBlock, SeatLayout } from '@/types/seating'
import type { SeatEditorCategory } from './seat-editor'

type Props = {
  categories: SeatEditorCategory[]
  blocks: SeatBlock[]
  seatsByBlock: Record<string, ManageSeat[]>
  layout: SeatLayout
  canEdit: boolean
  busy: boolean
  onCanvasSize: (width: number, height: number) => void
}

const CANVAS_MIN = 200
const CANVAS_MAX = 5000

function CanvasSize({ layout, busy, onApply }: { layout: SeatLayout; busy: boolean; onApply: (w: number, h: number) => void }) {
  const key = `${layout.canvasWidth}x${layout.canvasHeight}`
  const [draft, setDraft] = useState<{ key: string; width: string; height: string } | null>(null)
  const width = draft?.key === key ? draft.width : String(layout.canvasWidth)
  const height = draft?.key === key ? draft.height : String(layout.canvasHeight)
  const valid = [width, height].every((value) => /^\d+$/.test(value) && +value >= CANVAS_MIN && +value <= CANVAS_MAX)
  const dirty = width !== String(layout.canvasWidth) || height !== String(layout.canvasHeight)
  const digits = (value: string) => value.replace(/[^\d]/g, '').slice(0, 4)

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (valid && dirty) onApply(Number(width), Number(height))
      }}
    >
      <label className="grid gap-1">
        <Label>Lebar kanvas</Label>
        <Input inputMode="numeric" className="w-24 font-mono" value={width} error={!valid} onChange={(event) => setDraft({ key, width: digits(event.target.value), height })} />
      </label>
      <label className="grid gap-1">
        <Label>Tinggi kanvas</Label>
        <Input inputMode="numeric" className="w-24 font-mono" value={height} error={!valid} onChange={(event) => setDraft({ key, width, height: digits(event.target.value) })} />
      </label>
      <Button type="submit" variant="ghost" disabled={!valid || !dirty || busy}>
        Terapkan
      </Button>
      {!valid ? <span className="basis-full text-xs text-negative">Lebar dan tinggi 200 sampai 5000.</span> : null}
    </form>
  )
}

// Kapasitas kategori pakai kursi sama dengan jumlah kursi aktif di denahnya,
// jadi kursi yang dimatikan tidak ikut dihitung.
export function SummaryBar({ categories, blocks, seatsByBlock, layout, canEdit, busy, onCanvasSize }: Props) {
  const rows = useMemo(() => {
    return categories.map((category) => {
      const owned = blocks.filter((block) => block.categoryId === category.id)
      const active = owned.reduce(
        (sum, block) => sum + (seatsByBlock[block.id] ?? []).filter((seat) => seat.status !== 'disabled').length,
        0,
      )
      return { id: category.id, name: category.name, blocks: owned.length, active }
    })
  }, [categories, blocks, seatsByBlock])
  const total = rows.reduce((sum, row) => sum + row.active, 0)

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-card border border-border-soft bg-surface px-4 py-3">
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        <div className="grid gap-0.5">
          <dt className="text-xs font-semibold text-muted">Total kursi aktif</dt>
          <dd className="font-mono text-lg leading-6 font-semibold">{total}</dd>
        </div>
        {rows.map((row) => (
          <div key={row.id} className="grid gap-0.5">
            <dt className="text-xs font-semibold text-muted">{row.name}</dt>
            <dd className="text-sm">
              <span className="font-mono text-lg leading-6 font-semibold">{row.active}</span>{' '}
              <span className="text-xs text-muted">{row.blocks === 0 ? 'belum ada blok' : `kursi, ${row.blocks} blok`}</span>
            </dd>
          </div>
        ))}
      </dl>
      {canEdit ? <CanvasSize layout={layout} busy={busy} onApply={onCanvasSize} /> : null}
    </div>
  )
}
