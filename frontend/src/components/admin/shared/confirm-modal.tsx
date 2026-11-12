import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

type ConfirmModalProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  tone?: 'primary' | 'danger'
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}

// Selama permintaan berjalan modal tidak bisa ditutup, supaya admin tidak
// mengira aksinya batal padahal server sedang memprosesnya.
export function ConfirmModal({ open, title, description, confirmLabel, tone = 'primary', busy, onConfirm, onClose }: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={busy ? () => undefined : onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button variant={tone} onClick={onConfirm} disabled={busy}>
            {busy ? 'Menyimpan...' : confirmLabel}
          </Button>
        </>
      }
    />
  )
}
