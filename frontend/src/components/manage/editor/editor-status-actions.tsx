import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/pill'
import { useToast } from '@/components/ui/toast'
import { deleteManagedEvent } from '@/lib/manage-api'
import type { ManagedEvent } from '@/types/manage'
import { ConfirmModal } from '../shared/confirm-modal'
import { errorMessage } from '../shared/manage-labels'
import { RejectModal } from '../shared/reject-modal'
import type { useEventTransition } from '../shared/use-event-transition'

type Confirm = 'cancel' | 'close' | 'delete' | 'reject' | null

type EditorStatusActionsProps = {
  event: ManagedEvent
  isAdmin: boolean
  dirty: boolean
  transition: ReturnType<typeof useEventTransition>
}

// Tombol utama mengikuti status: draf diajukan, menunggu disetujui atau ditolak
// admin, tayang bisa ditutup atau dibatalkan admin. Selesai dan batal tanpa aksi.
export function EditorStatusActions({ event, isAdmin, dirty, transition }: EditorStatusActionsProps) {
  const toast = useToast()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [deleting, setDeleting] = useState(false)
  const { busy, run } = transition

  async function act(kind: Parameters<typeof run>[1], reason?: string) {
    const ok = await run(event, kind, reason)
    if (ok) setConfirm(null)
  }

  function submit() {
    // Mengajukan sambil ada isian belum disimpan bikin admin meninjau versi lama.
    if (dirty) {
      toast.error('Simpan dulu perubahan di tab ini, lalu ajukan.')
      return
    }
    void act('submissions')
  }

  async function remove() {
    setDeleting(true)
    try {
      await deleteManagedEvent(event.id)
      toast.show(`Draf ${event.name} dihapus.`, 'ok')
      navigate('/manage/events', { replace: true })
    } catch (cause) {
      toast.error(errorMessage(cause, 'Draf gagal dihapus. Coba lagi.'))
      setDeleting(false)
      setConfirm(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {event.status === 'draft' ? (
        <>
          <Button variant="ghost" onClick={() => setConfirm('delete')} disabled={busy !== null}>
            Hapus draf
          </Button>
          <Button onClick={submit} disabled={busy !== null}>
            {busy === 'submissions' ? 'Mengajukan...' : 'Ajukan untuk tayang'}
          </Button>
        </>
      ) : null}

      {event.status === 'review' ? (
        <>
          <Pill tone="warn">Menunggu persetujuan admin</Pill>
          {isAdmin ? (
            <>
              <Button variant="ghost" onClick={() => setConfirm('reject')} disabled={busy !== null}>
                Tolak
              </Button>
              <Button onClick={() => void act('approvals')} disabled={busy !== null}>
                {busy === 'approvals' ? 'Menyetujui...' : 'Setujui'}
              </Button>
            </>
          ) : null}
        </>
      ) : null}

      {event.status === 'published' && isAdmin ? (
        <>
          <Button variant="ghost" onClick={() => setConfirm('cancel')} disabled={busy !== null}>
            Batalkan event
          </Button>
          <Button variant="tint" onClick={() => setConfirm('close')} disabled={busy !== null}>
            Tutup event
          </Button>
        </>
      ) : null}

      <RejectModal
        open={confirm === 'reject'}
        eventName={event.name}
        busy={busy === 'rejections'}
        onClose={() => setConfirm(null)}
        onConfirm={(reason) => void act('rejections', reason)}
      />
      <ConfirmModal
        open={confirm === 'cancel'}
        title="Batalkan event?"
        description={`${event.name} turun dari halaman publik dan penjualan berhenti. Pembeli yang sudah bayar perlu dihubungi untuk refund. Status batal tidak bisa dikembalikan.`}
        confirmLabel="Ya, batalkan"
        tone="danger"
        busy={busy === 'cancellations'}
        onClose={() => setConfirm(null)}
        onConfirm={() => void act('cancellations')}
      />
      <ConfirmModal
        open={confirm === 'close'}
        title="Tutup event?"
        description={`Penjualan ${event.name} ditutup dan event masuk ke daftar Selesai. Tiket yang sudah terjual tetap berlaku.`}
        confirmLabel="Ya, tutup"
        busy={busy === 'closures'}
        onClose={() => setConfirm(null)}
        onConfirm={() => void act('closures')}
      />
      <ConfirmModal
        open={confirm === 'delete'}
        title="Hapus draf ini?"
        description={`${event.name} beserta kategori, paket, dan gambarnya dihapus permanen.`}
        confirmLabel="Hapus draf"
        busyLabel="Menghapus..."
        tone="danger"
        busy={deleting}
        onClose={() => setConfirm(null)}
        onConfirm={() => void remove()}
      />
    </div>
  )
}
