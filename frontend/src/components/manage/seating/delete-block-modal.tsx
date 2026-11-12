import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import type { SeatBlock } from '@/types/seating'

type Props = {
  block: SeatBlock | null
  busy: boolean
  onCancel: () => void
  onConfirm: (block: SeatBlock) => void
}

export function DeleteBlockModal({ block, busy, onCancel, onConfirm }: Props) {
  return (
    <Modal
      open={block !== null}
      title={block ? `Hapus ${block.name}?` : 'Hapus blok?'}
      description={
        block
          ? `Semua ${block.seatCount} kursi di blok ${block.code} ikut terhapus dan kapasitas ${block.categoryName} berkurang. Blok yang sudah dihapus tidak bisa dikembalikan.`
          : undefined
      }
      onClose={busy ? () => undefined : onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Batal
          </Button>
          <Button variant="danger" onClick={() => block && onConfirm(block)} disabled={busy}>
            {busy ? 'Menghapus...' : 'Hapus blok'}
          </Button>
        </>
      }
    />
  )
}
