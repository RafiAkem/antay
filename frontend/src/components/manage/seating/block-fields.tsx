import { Chip } from '@/components/ui/chip'
import { Field, Input } from '@/components/ui/field'
import { Select, type SelectOption } from '@/components/ui/select'
import type { BlockForm, FormIssues } from './block-form'

type Props = {
  form: BlockForm
  issues: FormIssues
  locked: boolean
  categories: SelectOption[]
  onChange: (patch: Partial<BlockForm>) => void
}

const RANGE = 'h-2 w-full cursor-pointer accent-accent disabled:cursor-not-allowed'

function NumberField(props: {
  label: string
  value: string
  issue?: string
  hint?: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <Field label={props.label} hint={props.issue ?? props.hint} error={!!props.issue}>
      <Input
        inputMode="numeric"
        value={props.value}
        disabled={props.disabled}
        error={!!props.issue}
        onChange={(event) => props.onChange(event.target.value.replace(/[^\d]/g, ''))}
        className="font-mono"
      />
    </Field>
  )
}

export function BlockFields({ form, issues, locked, categories, onChange }: Props) {
  return (
    <div className="grid gap-3.5">
      <Field label="Kategori" hint={issues.categoryId ?? 'Hanya kategori yang memakai kursi.'} error={!!issues.categoryId}>
        <Select
          value={form.categoryId}
          options={categories}
          disabled={locked}
          placeholder="Belum ada kategori pakai kursi"
          onChange={(categoryId) => onChange({ categoryId })}
        />
      </Field>
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
        <Field label="Kode" hint={issues.code} error={!!issues.code}>
          <Input
            value={form.code}
            maxLength={3}
            disabled={locked}
            error={!!issues.code}
            onChange={(event) => onChange({ code: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
            className="font-mono uppercase"
          />
        </Field>
        <Field label="Nama blok" hint={issues.name} error={!!issues.name}>
          <Input value={form.name} maxLength={40} error={!!issues.name} onChange={(event) => onChange({ name: event.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Jumlah baris" value={form.rowCount} issue={issues.rowCount} hint="1 sampai 50" disabled={locked} onChange={(rowCount) => onChange({ rowCount })} />
        <NumberField label="Kursi per baris" value={form.seatsPerRow} issue={issues.seatsPerRow} hint="1 sampai 80" disabled={locked} onChange={(seatsPerRow) => onChange({ seatsPerRow })} />
      </div>
      <Field label={`Lengkungan: ${form.curve}`} hint="0 lurus. Makin besar, ujung baris makin menekuk ke arah panggung.">
        <input type="range" min={0} max={100} step={1} value={form.curve} disabled={locked} className={RANGE} onChange={(event) => onChange({ curve: Number(event.target.value) })} />
      </Field>
      <Field label={`Rotasi: ${form.rotation} derajat`} hint="Searah jarum jam. Bisa juga diputar dengan pegangan bulat di bawah blok." error={!!issues.rotation}>
        <input type="range" min={-180} max={180} step={1} value={form.rotation} disabled={locked} className={RANGE} onChange={(event) => onChange({ rotation: Number(event.target.value) })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Jarak kursi" value={form.seatSpacing} issue={issues.seatSpacing} hint="16 sampai 80" disabled={locked} onChange={(seatSpacing) => onChange({ seatSpacing })} />
        <NumberField label="Jarak baris" value={form.rowSpacing} issue={issues.rowSpacing} hint="16 sampai 80" disabled={locked} onChange={(rowSpacing) => onChange({ rowSpacing })} />
      </div>
      <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3">
        <Field label="Baris awal" hint={issues.firstRowLabel} error={!!issues.firstRowLabel}>
          <Input
            value={form.firstRowLabel}
            maxLength={1}
            disabled={locked}
            error={!!issues.firstRowLabel}
            onChange={(event) => onChange({ firstRowLabel: event.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
            className="font-mono uppercase"
          />
        </Field>
        <fieldset className="grid gap-1.5" disabled={locked}>
          <legend className="mb-1.5 text-[13px] font-semibold">Nomor kursi mulai dari</legend>
          <div className="flex flex-wrap gap-1.5">
            <Chip selected={form.numbering === 'ltr'} disabled={locked} onClick={() => onChange({ numbering: 'ltr' })}>
              Kiri
            </Chip>
            <Chip selected={form.numbering === 'rtl'} disabled={locked} onClick={() => onChange({ numbering: 'rtl' })}>
              Kanan
            </Chip>
          </div>
        </fieldset>
      </div>
      <Field
        label="Lorong setelah kursi nomor"
        hint={issues.aisleAfter ?? 'Pisahkan dengan koma. Contoh 5, 10 memberi lorong di antara kursi 5 dan 6, lalu 10 dan 11.'}
        error={!!issues.aisleAfter}
      >
        <Input
          value={form.aisles}
          placeholder="Kosongkan bila tanpa lorong"
          disabled={locked}
          error={!!issues.aisleAfter}
          onChange={(event) => onChange({ aisles: event.target.value.replace(/[^\d,\s]/g, '') })}
          className="font-mono"
        />
      </Field>
    </div>
  )
}
