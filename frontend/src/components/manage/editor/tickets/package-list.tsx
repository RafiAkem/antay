import { formatRupiah } from '@/components/ui/format-rupiah'
import { Pill } from '@/components/ui/pill'
import type { ManagedCategory } from '@/types/manage'
import { bySortOrder } from '../../shared/manage-labels'
import { OrderButtons, TextAction } from '../../shared/order-buttons'
import { PackageForm } from './package-form'
import { packageValues } from './ticket-values'
import type { useTicketsPanel } from './use-tickets-panel'

type PackageListProps = {
  category: ManagedCategory
  editable: boolean
  panel: ReturnType<typeof useTicketsPanel>
}

export function PackageList({ category, editable, panel }: PackageListProps) {
  const packages = bySortOrder(category.packages ?? [])
  const addKey = `new-package:${category.id}` as const

  return (
    <div className="grid gap-2">
      {packages.length === 0 && panel.editing !== addKey ? (
        <p className="text-[13px] text-muted">Belum ada paket. Kategori tanpa paket tidak tampil ke pembeli.</p>
      ) : null}

      <ul className="grid gap-2">
        {packages.map((pack, index) => {
          const key = `package:${pack.id}` as const
          if (panel.editing === key) {
            return (
              <li key={pack.id}>
                <PackageForm
                  prefix={`pkg-${pack.id}`}
                  initial={packageValues(pack)}
                  onSave={(values) => panel.savePackage(category, pack, values)}
                  onCancel={panel.close}
                  onDirtyChange={panel.reportDirty}
                />
              </li>
            )
          }
          return (
            <li
              key={pack.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border border-border-soft px-3 py-2"
            >
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                  {pack.name}
                  {!pack.isActive ? <Pill>Tidak dijual</Pill> : null}
                </span>
                <span className="text-xs text-muted">
                  {pack.pax} orang
                  {pack.quota ? ` · kuota ${pack.quota} paket` : ' · ikut kuota kategori'}
                </span>
              </div>
              <div className="grid justify-items-end">
                <span className="font-mono text-sm font-semibold">{pack.price === 0 ? 'Gratis' : formatRupiah(pack.price)}</span>
                {pack.pax > 1 && pack.price > 0 ? (
                  <span className="font-mono text-xs text-muted">{formatRupiah(Math.round(pack.price / pack.pax))}/orang</span>
                ) : null}
              </div>
              {editable ? (
                <div className="flex items-center gap-1">
                  <OrderButtons
                    label={pack.name}
                    first={index === 0}
                    last={index === packages.length - 1}
                    disabled={panel.moving}
                    onMove={(direction) => void panel.movePackage(category, index, direction)}
                  />
                  <TextAction onClick={() => panel.open(key)} label={`Ubah paket ${pack.name}`}>
                    Ubah
                  </TextAction>
                  <TextAction
                    tone="danger"
                    onClick={() => panel.askRemove({ kind: 'package', id: pack.id, name: pack.name })}
                    label={`Hapus paket ${pack.name}`}
                  >
                    Hapus
                  </TextAction>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      {panel.editing === addKey ? (
        <PackageForm
          prefix={`pkg-new-${category.id}`}
          initial={packageValues(null)}
          onSave={(values) => panel.savePackage(category, null, values)}
          onCancel={panel.close}
          onDirtyChange={panel.reportDirty}
        />
      ) : editable ? (
        <button
          type="button"
          onClick={() => panel.open(addKey)}
          className="justify-self-start text-[13px] font-semibold text-accent hover:underline"
        >
          + Tambah paket
        </button>
      ) : null}
    </div>
  )
}
