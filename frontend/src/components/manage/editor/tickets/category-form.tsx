import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input } from '@/components/ui/field'
import { TextArea } from '../../shared/text-area'
import { useInlineForm } from './use-inline-form'
import { validateCategory, type CategoryValues } from './ticket-values'

type CategoryFormProps = {
  prefix: string
  initial: CategoryValues
  seatCount: number
  onSave: (values: CategoryValues) => Promise<void>
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
}

const ORDER: Array<keyof CategoryValues> = ['name', 'description', 'isSeated', 'quota']

export function CategoryForm({ prefix, initial, seatCount, onSave, onCancel, onDirtyChange }: CategoryFormProps) {
  const form = useInlineForm({
    initial,
    prefix,
    order: ORDER,
    validate: validateCategory,
    labels: { name: 'Nama kategori', description: 'Keterangan', isSeated: 'Pakai kursi', quota: 'Kuota' },
    onSave,
    onDirtyChange,
    failMessage: 'Kategori gagal disimpan. Coba lagi.',
  })
  const { values, errors, set, fieldId } = form

  return (
    <form noValidate onSubmit={form.submit} className="grid gap-3 rounded-control border border-tint-200 bg-tint-50 p-3 sm:grid-cols-2">
      <Field label="Nama kategori" error={Boolean(errors.name)}>
        <Input
          id={fieldId('name')}
          value={values.name}
          maxLength={60}
          error={Boolean(errors.name)}
          placeholder="contoh: VIP A"
          onChange={(event) => set('name', event.target.value)}
        />
      </Field>
      {values.isSeated ? (
        <p className="self-end text-[13px] leading-[19px] text-muted">
          Kuota mengikuti jumlah kursi di denah{seatCount > 0 ? `, sekarang ${seatCount} kursi` : ''}.
        </p>
      ) : (
        <Field label="Kuota (orang)" hint="Paket Couple memakai 2 kuota." error={Boolean(errors.quota)}>
          <Input
            id={fieldId('quota')}
            value={values.quota}
            type="number"
            min={1}
            error={Boolean(errors.quota)}
            placeholder="500"
            onChange={(event) => set('quota', event.target.value)}
          />
        </Field>
      )}
      <Field label="Keterangan singkat" hint="Satu baris di bawah nama kategori." error={Boolean(errors.description)} className="sm:col-span-2">
        <TextArea
          id={fieldId('description')}
          value={values.description}
          maxLength={300}
          size="sm"
          error={Boolean(errors.description)}
          placeholder="contoh: Area depan panggung, kursi bernomor."
          onChange={(event) => set('description', event.target.value)}
        />
      </Field>
      <div className="sm:col-span-2">
        <Checkbox checked={values.isSeated} onChange={(checked) => set('isSeated', checked)}>
          Pakai kursi bernomor
          <span className="block text-[13px] text-muted">
            Pembeli memilih kursi di denah. Denahnya dibuat di tab Denah kursi.
          </span>
        </Checkbox>
        {initial.isSeated && !values.isSeated && seatCount > 0 ? (
          <p className="mt-2 text-[13px] text-warning-ink">
            Kategori ini sudah punya {seatCount} kursi. Hapus kursinya dulu di tab Denah kursi sebelum mematikan opsi ini.
          </p>
        ) : null}
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="ghost" size="small" onClick={onCancel} disabled={form.busy}>
          Batal
        </Button>
        <Button type="submit" size="small" disabled={form.busy}>
          {form.busy ? 'Menyimpan...' : 'Simpan kategori'}
        </Button>
      </div>
    </form>
  )
}
