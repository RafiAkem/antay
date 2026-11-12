import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

type ConfirmModalProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  busyLabel?: string
  tone?: 'primary' | 'danger'
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
  children?: ReactNode
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  busyLabel = 'Memproses...',
  tone = 'primary',
  busy = false,
  onClose,
  onConfirm,
  children,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={busy ? () => undefined : onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Kembali
          </Button>
          <Button variant={tone} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
