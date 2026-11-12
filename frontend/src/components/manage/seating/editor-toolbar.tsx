import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import type { EditorMode } from './seating-labels'

type Props = {
  mode: EditorMode
  canAdd: boolean
  adding: boolean
  status: string | null
  onMode: (mode: EditorMode) => void
  onAdd: () => void
}

export function EditorToolbar({ mode, canAdd, adding, status, onMode, onAdd }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Mode editor" className="flex gap-1.5">
        <Chip selected={mode === 'layout'} onClick={() => onMode('layout')}>
          Atur blok
        </Chip>
        <Chip selected={mode === 'seats'} onClick={() => onMode('seats')}>
          Atur kursi
        </Chip>
      </div>
      <span className="ml-auto text-xs text-muted" aria-live="polite">
        {status}
      </span>
      <Button
        size="small"
        onClick={onAdd}
        disabled={!canAdd || adding}
        title={canAdd ? undefined : 'Tandai minimal satu kategori sebagai pakai kursi dulu.'}
      >
        {adding ? 'Menambah...' : 'Tambah blok'}
      </Button>
    </div>
  )
}
