import { Card, CardHead } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { formatLongDate } from '../../shared/manage-labels'
import { TextArea } from '../../shared/text-area'
import { InfoField, type FieldBind } from './info-field'
import { slotCount, type InfoKey, type InfoValues } from './info-values'

export type SectionProps = {
  values: InfoValues
  errors: Partial<Record<InfoKey, string>>
  bind: (key: InfoKey) => FieldBind
  set: (key: InfoKey, value: string) => void
  disabled: boolean
}

type BasicsProps = SectionProps & { showOrganizer: boolean }

export function BasicsCard({ values, errors, bind, set, disabled, showOrganizer }: BasicsProps) {
  const longDate = formatLongDate(values.eventDate)
  return (
    <Card>
      <CardHead title="Dasar" />
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
        <InfoField
          {...bind('name')}
          label="Nama event"
          hint="Kode tiket (misal NY-0001) dibuat otomatis dari nama ini saat draf pertama disimpan."
          className="sm:col-span-2"
          maxLength={70}
          placeholder="contoh: Malam Tahun Baru Summarecon"
        />
        <InfoField {...bind('place')} label="Lokasi loket" maxLength={50} placeholder="contoh: Atrium Utama" />
        <InfoField
          {...bind('eventDate')}
          label="Tanggal event"
          hint={longDate ?? 'Format TTTT-BB-HH, misal 2026-12-31.'}
          maxLength={10}
          inputMode="numeric"
          placeholder="2026-12-31"
        />
        {showOrganizer ? (
          <InfoField
            {...bind('organizerId')}
            label="ID penyelenggara"
            hint="Salin dari halaman Penyelenggara. Kosongkan bila event dikelola mal sendiri."
            placeholder="opsional"
          />
        ) : null}
        <Field label="Deskripsi" hint="Tampil di bagian Tentang pada halaman event." error={Boolean(errors.description)} className="sm:col-span-2">
          <TextArea
            id="description"
            value={values.description}
            maxLength={2000}
            error={Boolean(errors.description)}
            placeholder="Ceritakan acaranya: siapa yang tampil, apa yang didapat pembeli, dan hal yang perlu disiapkan."
            onChange={(event) => set('description', event.target.value)}
          />
        </Field>
      </fieldset>
    </Card>
  )
}

export function ScheduleCard({ values, bind, disabled }: SectionProps) {
  const slots = slotCount(values.openTime, values.closeTime, Number(values.slotMinutes))
  const capacity = Number(values.slotCapacity)
  const ok = slots > 0 && capacity > 0
  return (
    <Card>
      <CardHead title="Penukaran di loket" meta="Pengaturan antrean hari-H" />
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
        <InfoField {...bind('item')} label="Item yang ditukar" maxLength={50} placeholder="contoh: Gelang masuk" />
        <InfoField {...bind('requirement')} label="Syarat penukaran" maxLength={80} placeholder="contoh: E-ticket + KTP sesuai nama" />
        <InfoField {...bind('openTime')} label="Jam buka" maxLength={5} placeholder="10:00" inputMode="numeric" />
        <InfoField {...bind('closeTime')} label="Jam tutup" maxLength={5} placeholder="18:00" inputMode="numeric" />
        <InfoField {...bind('slotMinutes')} label="Durasi slot (menit)" type="number" min={10} max={120} step={5} />
        <InfoField {...bind('slotCapacity')} label="Kuota per slot" type="number" min={1} max={500} />
        <InfoField {...bind('counterCount')} label="Jumlah loket" type="number" min={1} max={20} />
        <InfoField {...bind('serviceSeconds')} label="Detik per orang" type="number" min={30} max={600} step={5} />
        <p
          className={`rounded-control border p-3 font-mono text-[13px] leading-[19px] sm:col-span-2 ${
            ok ? 'border-tint-200 bg-tint-50 text-accent-ink' : 'border-warning-border bg-warning-bg text-warning-ink'
          }`}
        >
          {ok
            ? `${slots} slot x ${capacity} orang = ${slots * capacity} kuota penukaran, ${values.openTime}-${values.closeTime}`
            : 'Jam tutup harus lebih lambat dari jam buka, minimal satu slot.'}
        </p>
      </fieldset>
    </Card>
  )
}
