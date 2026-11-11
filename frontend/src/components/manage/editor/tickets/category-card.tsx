import { Card } from '@/components/ui/card'
import { Pill } from '@/components/ui/pill'
import type { ManagedCategory } from '@/types/manage'
import { OrderButtons, TextAction } from '../../shared/order-buttons'
import { CategoryForm } from './category-form'
import { PackageList } from './package-list'
import { categoryValues } from './ticket-values'
import type { useTicketsPanel } from './use-tickets-panel'

type CategoryCardProps = {
  category: ManagedCategory
  index: number
  total: number
  editable: boolean
  panel: ReturnType<typeof useTicketsPanel>
}

function capacityLabel(category: ManagedCategory): string {
  if (category.isSeated) return category.seatCount > 0 ? `${category.seatCount} kursi di denah` : 'Denah belum dibuat'
  return `Kuota ${category.quota ?? 0} orang`
}

export function CategoryCard({ category, index, total, editable, panel }: CategoryCardProps) {
  const key = `category:${category.id}` as const

  return (
    <Card className="grid gap-3">
      {panel.editing === key ? (
        <CategoryForm
          prefix={`cat-${category.id}`}
          initial={categoryValues(category)}
          seatCount={category.seatCount}
          onSave={(values) => panel.saveCategory(category, values)}
          onCancel={panel.close}
          onDirtyChange={panel.reportDirty}
        />
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted">{index + 1}</span>
              <h3 className="text-base leading-[22px] font-bold">{category.name}</h3>
              {category.isSeated ? <Pill tone="brand">Pakai kursi</Pill> : null}
            </div>
            {category.description ? <p className="text-[13px] leading-[19px] text-muted">{category.description}</p> : null}
            <p className={`text-xs ${category.isSeated && category.seatCount === 0 ? 'text-warning-ink' : 'text-muted'}`}>
              {capacityLabel(category)}
            </p>
          </div>
          {editable ? (
            <div className="flex items-center gap-1">
              <OrderButtons
                label={category.name}
                first={index === 0}
                last={index === total - 1}
                disabled={panel.moving}
                onMove={(direction) => void panel.moveCategory(index, direction)}
              />
              <TextAction onClick={() => panel.open(key)} label={`Ubah kategori ${category.name}`}>
                Ubah
              </TextAction>
              <TextAction
                tone="danger"
                onClick={() => panel.askRemove({ kind: 'category', id: category.id, name: category.name })}
                label={`Hapus kategori ${category.name}`}
              >
                Hapus
              </TextAction>
            </div>
          ) : null}
        </div>
      )}

      <div className="border-t border-rule pt-3">
        <PackageList category={category} editable={editable} panel={panel} />
      </div>
    </Card>
  )
}
