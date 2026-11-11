import { Empty } from '@/components/ui/pill'
import { SeatEditor } from '@/components/manage/seating/seat-editor'
import type { ManagedEvent } from '@/types/manage'
import { bySortOrder } from '../shared/manage-labels'
import type { EditorTab } from './editor-labels'

type SeatingPanelProps = {
  event: ManagedEvent
  editable: boolean
  onOpenTab: (tab: EditorTab) => void
}

export function SeatingPanel({ event, editable, onOpenTab }: SeatingPanelProps) {
  const categories = bySortOrder(event.categories ?? []).map(({ id, name, isSeated }) => ({ id, name, isSeated }))
  const seated = categories.some((category) => category.isSeated)

  if (!seated) {
    return (
      <Empty
        title="Belum ada kategori yang pakai kursi"
        hint="Denah hanya untuk kategori dengan kursi bernomor. Aktifkan opsi Pakai kursi bernomor di salah satu kategori dulu."
        action={
          <button
            type="button"
            onClick={() => onOpenTab('tickets')}
            className="mt-1 justify-self-start text-sm font-semibold text-accent hover:underline"
          >
            Buka tab Tiket
          </button>
        }
      />
    )
  }

  return <SeatEditor eventId={event.id} categories={categories} editable={editable} />
}
