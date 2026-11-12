import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input } from '@/components/ui/field'
import { formatRupiah } from '@/components/ui/format-rupiah'
import { Stepper } from '@/components/ui/stepper'
import { Label } from '@/components/ui/text'
import { useInlineForm } from './use-inline-form'
import { validatePackage, type PackageValues } from './ticket-values'

type PackageFormProps = {
  prefix: string
  initial: PackageValues
  onSave: (values: PackageValues) => Promise<void>
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
}

const ORDER: Array<keyof PackageValues> = ['name', 'pax', 'price', 'quota', 'isActive']

// Pratinjau harga di bawah input: angka mentah gampang salah ketik satu nol.
function pricePreview(price: string, pax: number): string {
  const amount = Number(price)
  if (price.trim() === '' || !Number.isInteger(amount) || amount < 0) return 'Isi harga dalam rupiah, tanpa titik.'
  if (amount === 0) return 'Gratis'
  if (pax <= 1) return formatRupiah(amount)
  return `${formatRupiah(amount)} · ${formatRupiah(Math.round(amount / pax))} per orang`
}

export function PackageForm({ prefix, initial, onSave, onCancel, onDirtyChange }: PackageFormProps) {
  const form = useInlineForm({
    initial,
    prefix,
    order: ORDER,
    validate: validatePackage,
    labels: { name: 'Nama paket', pax: 'Orang per paket', price: 'Harga', quota: 'Kuota paket', isActive: 'Dijual' },
    onSave,
    onDirtyChange,
    failMessage: 'Paket gagal disimpan. Coba lagi.',
  })
  const { values, errors, set, fieldId } = form

  return (
    <form noValidate onSubmit={form.submit} className="grid gap-3 rounded-control border border-tint-200 bg-tint-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <Field label="Nama paket" error={Boolean(errors.name)}>
        <Input
          id={fieldId('name')}
          value={values.name}
          maxLength={40}
          error={Boolean(errors.name)}
          placeholder="contoh: Couple"
          onChange={(event) => set('name', event.target.value)}
        />
      </Field>
      <div className="grid content-start gap-1.5">
        <Label>Orang per paket</Label>
        <Stepper value={values.pax} min={1} max={10} label="Orang per paket" onChange={(pax) => set('pax', pax)} />
      </div>
      <Field label="Harga paket (Rp)" hint={pricePreview(values.price, values.pax)} error={Boolean(errors.price)}>
        <Input
          id={fieldId('price')}
          value={values.price}
          type="number"
          min={0}
          step={1000}
          error={Boolean(errors.price)}
          placeholder="900000"
          onChange={(event) => set('price', event.target.value)}
        />
      </Field>
      <Field label="Kuota paket" hint="Opsional, dalam jumlah paket. Kosong = ikut kuota kategori." error={Boolean(errors.quota)}>
        <Input
          id={fieldId('quota')}
          value={values.quota}
          type="number"
          min={1}
          error={Boolean(errors.quota)}
          placeholder="Tanpa batas"
          onChange={(event) => set('quota', event.target.value)}
        />
      </Field>
      <div className="self-center sm:col-span-2">
        <Checkbox checked={values.isActive} onChange={(checked) => set('isActive', checked)}>
          Dijual
          <span className="block text-[13px] text-muted">Matikan untuk menyembunyikan paket tanpa menghapusnya.</span>
        </Checkbox>
      </div>
      <div className="flex justify-end gap-2 sm:col-span-3">
        <Button variant="ghost" size="small" onClick={onCancel} disabled={form.busy}>
          Batal
        </Button>
        <Button type="submit" size="small" disabled={form.busy}>
          {form.busy ? 'Menyimpan...' : 'Simpan paket'}
        </Button>
      </div>
    </form>
  )
}
