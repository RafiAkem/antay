import { ButtonLink } from '@/components/account/button-link'
import { Label } from '@/components/ui/text'

// Detail pesanan menunggu pembayaran aktif. Nomor pesanan dari alamat tetap
// ditampilkan supaya orang yang membuka tautan tahu tautannya tidak salah.
export function OrderPending({ orderId }: { orderId: string }) {
  return (
    <div className="grid justify-items-start gap-4 rounded-card border border-border-soft bg-surface p-5 sm:p-6">
      <div className="grid gap-1">
        <Label>Nomor pesanan</Label>
        <span className="font-mono text-[15px] leading-[22px] break-all text-ink">{orderId}</span>
      </div>
      <div className="grid gap-1 border-t border-border-soft pt-4">
        <b className="text-[15px] leading-[22px] font-semibold text-ink">
          Detail pesanan akan tersedia setelah pembayaran aktif.
        </b>
        <p className="max-w-[56ch] text-sm leading-[21px] text-muted">
          Pembayaran di Antay belum dibuka, jadi belum ada pesanan yang bisa ditampilkan di sini.
        </p>
      </div>
      <ButtonLink to="/tickets" variant="ghost" small>
        Kembali ke Tiket saya
      </ButtonLink>
    </div>
  )
}
