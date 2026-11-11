import { Card, CardHead } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { formatRupiah } from '@/components/ui/format-rupiah'
import { Label } from '@/components/ui/text'
import { InfoField } from './info-field'
import { percentToBp } from './info-values'
import type { SectionProps } from './info-sections'

type SaleFeeProps = SectionProps & { examplePrice: number }

// Contoh hitung memakai harga paket termurah event ini (atau Rp250.000 bila belum ada),
// supaya penyelenggara langsung melihat angka yang dibayar pembeli.
function FeeExample({ price, bp, flat, customerPays }: { price: number; bp: number; flat: number; customerPays: boolean }) {
  const fee = Math.round((price * bp) / 10000) + flat
  return (
    <p className="rounded-control border border-tint-200 bg-tint-50 p-3 text-[13px] leading-[19px] text-accent-ink sm:col-span-2">
      {fee === 0
        ? `Pembeli bayar ${formatRupiah(price)}, tanpa biaya layanan.`
        : customerPays
          ? `Pembeli bayar ${formatRupiah(price)} + biaya ${formatRupiah(fee)} = ${formatRupiah(price + fee)}.`
          : `Pembeli bayar ${formatRupiah(price)}. Biaya ${formatRupiah(fee)} dipotong dari pendapatanmu, jadi bersihnya ${formatRupiah(price - fee)}.`}
    </p>
  )
}

export function SaleFeeCard({ values, bind, set, errors, disabled, examplePrice }: SaleFeeProps) {
  const bp = percentToBp(values.feePercent) ?? 0
  const flat = Number.isInteger(Number(values.feeFlat)) ? Number(values.feeFlat) : 0
  return (
    <Card>
      <CardHead title="Penjualan dan biaya layanan" meta="Semua jam dalam WIB" />
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
        <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
          <InfoField {...bind('saleStartDate')} label="Mulai jual" maxLength={10} inputMode="numeric" placeholder="2026-11-20" />
          <InfoField {...bind('saleStartTime')} label="Jam" maxLength={5} inputMode="numeric" placeholder="10:00" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
          <InfoField {...bind('saleEndDate')} label="Akhir jual" maxLength={10} inputMode="numeric" placeholder="2026-12-31" />
          <InfoField {...bind('saleEndTime')} label="Jam" maxLength={5} inputMode="numeric" placeholder="17:00" />
        </div>

        <p className="text-[13px] leading-[19px] text-muted sm:col-span-2">
          Boleh dikosongkan selama masih draf, tapi wajib diisi sebelum diajukan. Penjualan harus berakhir paling lambat
          saat loket tutup di hari event.
        </p>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label>Biaya layanan ditanggung</Label>
          <div
            role="group"
            aria-label="Biaya layanan ditanggung"
            className={`flex flex-wrap gap-2 rounded-control ${errors.feeBearer ? 'ring-1 ring-negative' : ''}`}
          >
            <Chip selected={values.feeBearer === 'customer'} onClick={() => set('feeBearer', 'customer')} disabled={disabled}>
              Pembeli
            </Chip>
            <Chip selected={values.feeBearer === 'organizer'} onClick={() => set('feeBearer', 'organizer')} disabled={disabled}>
              Penyelenggara
            </Chip>
          </div>
          <span className="text-[13px] leading-[19px] text-muted">
            {values.feeBearer === 'customer'
              ? 'Biaya tampil sebagai baris sendiri di ringkasan dan masuk ke total pembeli.'
              : 'Pembeli tidak melihat biaya ini. Laporanmu menampilkan pendapatan kotor dan bersih.'}
          </span>
        </div>

        <InfoField
          {...bind('feePercent')}
          label="Persen dari harga (%)"
          hint="Dihitung dari harga setelah diskon. Boleh 0."
          inputMode="decimal"
          maxLength={6}
          placeholder="2,5"
        />
        <InfoField
          {...bind('feeFlat')}
          label="Biaya tetap per pesanan (Rp)"
          hint={flat > 0 ? formatRupiah(flat) : 'Boleh 0.'}
          type="number"
          min={0}
          step={500}
        />
        <FeeExample price={examplePrice} bp={bp} flat={flat} customerPays={values.feeBearer === 'customer'} />
      </fieldset>
    </Card>
  )
}
