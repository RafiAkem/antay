import { Button } from '@/components/ui/button'
import { SeatEditorSkeleton } from './seat-editor-skeleton'
import { SeatNotice } from './seat-notice'
import { SeatWorkspace } from './seat-workspace'
import { useSeatMap } from './use-seat-map'
import { useWideScreen } from './use-wide-screen'

// Editor denah berbasis blok. Halaman kelola event cukup memanggil komponen
// ini dengan props di bawah; data denah diambil sendiri dari server.
export type SeatEditorCategory = {
  id: string
  name: string
  isSeated: boolean
}

export type SeatEditorProps = {
  eventId: string
  categories: SeatEditorCategory[]
  // false bila event sudah tutup atau dibatalkan
  editable: boolean
}

export function SeatEditor({ eventId, categories, editable }: SeatEditorProps) {
  const wide = useWideScreen()
  const seatMap = useSeatMap(eventId)
  const { map, load } = seatMap

  if (!map) {
    if (load.status === 'error') {
      return (
        <div className="grid justify-items-start gap-3">
          <SeatNotice tone="bad" title="Denah belum bisa dimuat">
            {load.message}
          </SeatNotice>
          <Button variant="ghost" size="small" onClick={() => void seatMap.reload()}>
            Muat ulang denah
          </Button>
        </div>
      )
    }
    return <SeatEditorSkeleton />
  }

  // Pembeli melihat denah yang sama persis, jadi tampilan baca saja di layar
  // sempit tetap berguna untuk mengecek hasilnya.
  const note = !editable
    ? 'Denah event ini tidak bisa diubah lagi karena eventnya sudah ditutup atau dibatalkan.'
    : !wide
      ? 'Denah hanya bisa diubah di layar selebar minimal 1024 piksel. Di sini kamu bisa melihat hasilnya saja.'
      : null

  return (
    <SeatWorkspace
      eventId={eventId}
      categories={categories}
      seatMap={seatMap}
      map={map}
      canEdit={editable && wide}
      note={note}
    />
  )
}
