import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty } from '@/components/ui/pill'
import type { ManagedEvent } from '@/types/manage'
import { ConfirmModal } from '../../shared/confirm-modal'
import { CategoryCard } from './category-card'
import { CategoryForm } from './category-form'
import { categoryValues } from './ticket-values'
import { useTicketsPanel } from './use-tickets-panel'

type TicketsPanelProps = {
  event: ManagedEvent
  editable: boolean
  reload: () => void
  onDirtyChange: (dirty: boolean) => void
}

export function TicketsPanel({ event, editable, reload, onDirtyChange }: TicketsPanelProps) {
  const panel = useTicketsPanel(event, reload, onDirtyChange)
  const { categories, removal } = panel

  return (
    <div className="grid gap-4">
      <p className="text-sm leading-[21px] text-muted">
        Pembeli memilih kategori dulu, baru paket di dalamnya. Urutan di sini sama dengan urutan di halaman beli,
        jadi taruh yang termurah atau paling dicari di atas.
      </p>

      {categories.length === 0 && panel.editing !== 'new-category' ? (
        <Empty
          title="Belum ada kategori"
          hint="Contoh susunan: VIP A, VIP B, Festival. Tiap kategori lalu diberi paket Single, Couple, atau Group."
        />
      ) : null}

      {categories.map((category, index) => (
        <CategoryCard
          key={category.id}
          category={category}
          index={index}
          total={categories.length}
          editable={editable}
          panel={panel}
        />
      ))}

      {panel.editing === 'new-category' ? (
        <Card>
          <CategoryForm
            prefix="cat-new"
            initial={categoryValues(null)}
            seatCount={0}
            onSave={(values) => panel.saveCategory(null, values)}
            onCancel={panel.close}
            onDirtyChange={panel.reportDirty}
          />
        </Card>
      ) : editable ? (
        <Button variant="tint" className="justify-self-start" onClick={() => panel.open('new-category')}>
          Tambah kategori
        </Button>
      ) : null}

      <ConfirmModal
        open={removal !== null}
        title={removal?.kind === 'category' ? 'Hapus kategori?' : 'Hapus paket?'}
        description={
          removal?.kind === 'category'
            ? `${removal.name} dan semua paket di dalamnya dihapus. Kategori yang masih punya kursi di denah tidak bisa dihapus.`
            : `Paket ${removal?.name ?? ''} dihapus. Kalau hanya ingin berhenti menjual, ubah paketnya dan matikan "Dijual".`
        }
        confirmLabel="Hapus"
        busyLabel="Menghapus..."
        tone="danger"
        busy={panel.removing}
        onClose={panel.cancelRemove}
        onConfirm={() => void panel.confirmRemove()}
      />
    </div>
  )
}
