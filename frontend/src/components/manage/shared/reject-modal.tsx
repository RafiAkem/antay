import { useState } from 'react'
import { Field } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { ConfirmModal } from './confirm-modal'
import { TextArea } from './text-area'

type RejectModalProps = {
  open: boolean
  eventName: string
  busy: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

const MIN_REASON = 3
const MAX_REASON = 300

// Isinya baru dipasang saat terbuka, jadi alasan lama tidak tersisa di pengajuan berikutnya.
export function RejectModal(props: RejectModalProps) {
  return props.open ? <RejectDialog {...props} /> : null
}

// Alasan tolak dibaca penyelenggara di editornya, jadi tulis yang bisa langsung dikerjakan.
function RejectDialog({ eventName, busy, onClose, onConfirm }: RejectModalProps) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [invalid, setInvalid] = useState(false)

  function confirm() {
    const trimmed = reason.trim()
    if (trimmed.length < MIN_REASON || trimmed.length > MAX_REASON) {
      setInvalid(true)
      toast.error(`Tulis alasan ${MIN_REASON} sampai ${MAX_REASON} karakter.`)
      document.getElementById('reject-reason')?.focus()
      return
    }
    onConfirm(trimmed)
  }

  return (
    <ConfirmModal
      open
      title="Tolak pengajuan"
      description={`${eventName} kembali ke draf. Penyelenggara melihat alasan ini di halaman editornya.`}
      confirmLabel="Tolak dan kirim alasan"
      busyLabel="Mengirim..."
      tone="danger"
      busy={busy}
      onClose={onClose}
      onConfirm={confirm}
    >
      <Field label="Alasan" hint={`${reason.trim().length}/${MAX_REASON} karakter`} error={invalid}>
        <TextArea
          id="reject-reason"
          value={reason}
          maxLength={MAX_REASON}
          error={invalid}
          placeholder="contoh: Poster masih memakai logo sponsor lama, harga VIP belum diisi."
          onChange={(event) => {
            setReason(event.target.value)
            setInvalid(false)
          }}
        />
      </Field>
    </ConfirmModal>
  )
}
