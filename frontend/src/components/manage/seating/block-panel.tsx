import { Button } from '@/components/ui/button'
import type { SelectOption } from '@/components/ui/select'
import { Heading, Paragraph } from '@/components/ui/text'
import type { SeatBlock } from '@/types/seating'
import { BlockFields } from './block-fields'
import type { BlockForm, FormIssues } from './block-form'
import { SeatNotice } from './seat-notice'
import type { BusyKind } from './use-block-actions'
import type { BlockPreview } from './use-block-preview'

type Props = {
  block: SeatBlock
  form: BlockForm
  issues: FormIssues
  locked: boolean
  categories: SelectOption[]
  preview: BlockPreview | null
  savedWarnings: string[]
  dirty: boolean
  valid: boolean
  busy: BusyKind | null
  onChange: (patch: Partial<BlockForm>) => void
  onSave: () => void
  onReset: () => void
  onDelete: () => void
}

function Warnings({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <SeatNotice tone="warn" title="Periksa posisi blok ini">
      <ul className="grid gap-0.5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </SeatNotice>
  )
}

export function BlockPanel(props: Props) {
  const { block, form, issues, locked, preview, dirty, valid, busy } = props
  const previewCount = preview?.seats?.length
  const warnings = preview ? preview.warnings : props.savedWarnings
  const saving = busy === 'save'

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <Heading level={3} size="md">
          {block.name}
        </Heading>
        <Paragraph tone="muted" size="sm">
          <span className="font-mono">{block.code}</span> · {block.categoryName} ·{' '}
          {previewCount !== undefined ? `${previewCount} kursi setelah disimpan` : `${block.seatCount} kursi`}
        </Paragraph>
      </div>

      {locked ? (
        <SeatNotice tone="warn" title="Bentuk blok terkunci">
          Blok ini sudah punya kursi yang terjual atau ditahan, jadi bentuknya tidak bisa diubah. Nama blok masih
          bisa diganti.
        </SeatNotice>
      ) : null}

      <BlockFields form={form} issues={issues} locked={locked} categories={props.categories} onChange={props.onChange} />

      {preview?.pending ? (
        <Paragraph tone="muted" size="sm">
          Menghitung pratinjau kursi...
        </Paragraph>
      ) : null}
      {preview?.error ? <SeatNotice tone="bad">{preview.error}</SeatNotice> : null}
      <Warnings items={warnings} />

      <div className="flex flex-wrap items-center gap-2 border-t border-border-soft pt-4">
        <Button onClick={props.onSave} disabled={!dirty || !valid || busy !== null}>
          {saving ? 'Menyimpan...' : 'Simpan blok'}
        </Button>
        {dirty ? (
          <Button variant="ghost" onClick={props.onReset} disabled={saving}>
            Batalkan perubahan
          </Button>
        ) : null}
        <Button
          variant="ghost"
          className="ml-auto"
          onClick={props.onDelete}
          disabled={locked || busy !== null}
          title={locked ? 'Blok dengan kursi terjual atau ditahan tidak bisa dihapus.' : undefined}
        >
          {/* cn tidak menggabung kelas yang bentrok, jadi warnanya ditaruh di span. */}
          <span className={locked || busy !== null ? undefined : 'text-negative'}>Hapus blok</span>
        </Button>
      </div>
    </div>
  )
}
