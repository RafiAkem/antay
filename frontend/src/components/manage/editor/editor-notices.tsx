import type { ManagedEvent } from '@/types/manage'
import type { IncompleteItem } from '../shared/use-event-transition'
import { tabForField, tabLabel, type EditorTab } from './editor-labels'

// Isu dari server berupa potongan kalimat huruf kecil, misal "tambahkan minimal satu kategori tiket".
function capitalize(text: string): string {
  const trimmed = text.trim().replace(/\.$/, '')
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

type EditorNoticesProps = {
  event: ManagedEvent
  incomplete: IncompleteItem[]
  onOpenTab: (tab: EditorTab) => void
}

// Pesan yang harus dibaca sebelum mengubah apa pun: alasan tolak, daftar yang
// kurang saat diajukan, dan keterangan bila event tinggal bisa dilihat.
export function EditorNotices({ event, incomplete, onOpenTab }: EditorNoticesProps) {
  const reason = event.rejectionReason?.trim()
  // Mulai dan akhir jual yang kosong datang sebagai dua isu dengan kalimat sama.
  const items = incomplete.filter(
    (item, index) => incomplete.findIndex((other) => other.issue === item.issue) === index,
  )
  return (
    <>
      {reason && event.status === 'draft' ? (
        <div role="note" className="grid gap-1 rounded-card border border-negative bg-negative-bg p-4">
          <b className="text-sm font-bold text-negative-ink">Pengajuan sebelumnya ditolak admin mal</b>
          <p className="text-sm leading-[21px] text-negative-ink">{reason}</p>
          <p className="text-[13px] text-negative-ink">Perbaiki bagian itu, lalu ajukan lagi.</p>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div role="alert" className="grid gap-2 rounded-card border border-warning-border bg-warning-bg p-4">
          <b className="text-sm font-bold text-warning-ink">Lengkapi dulu sebelum diajukan</b>
          <ul className="grid gap-1.5">
            {items.map((item) => {
              const tab = tabForField(item.field)
              return (
                <li key={`${item.field}-${item.issue}`} className="flex items-start gap-2 text-sm text-warning-ink">
                  <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 flex-none rounded-pill bg-warning-ink" />
                  <span className="min-w-0">
                    {capitalize(item.issue)}.{' '}
                    <button
                      type="button"
                      onClick={() => onOpenTab(tab)}
                      className="font-semibold whitespace-nowrap underline underline-offset-2"
                    >
                      Buka tab {tabLabel(tab)}
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {event.status === 'closed' || event.status === 'cancelled' ? (
        <p role="note" className="rounded-card border border-border-soft bg-raised p-3 text-sm text-muted">
          {event.status === 'closed'
            ? 'Event ini sudah selesai. Datanya hanya bisa dilihat.'
            : 'Event ini dibatalkan admin mal. Datanya hanya bisa dilihat.'}
        </p>
      ) : null}
    </>
  )
}
