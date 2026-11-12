import { ButtonLink } from '@/components/account/button-link'
import { Heading } from '@/components/ui/text'

// Pesanan dan pembayaran baru dibangun di fase berikutnya, jadi untuk sekarang
// bagian ini selalu kosong. Sengaja jujur, tanpa kartu contoh.
export function PurchasedTickets() {
  return (
    <section aria-labelledby="purchased-title" className="grid gap-4">
      <Heading level={2} id="purchased-title">
        Tiket yang dibeli
      </Heading>
      <div className="grid justify-items-start gap-3 rounded-card border border-dashed border-control bg-surface p-5 sm:p-6">
        <div className="grid gap-1">
          <b className="text-[15px] leading-[22px] font-semibold text-ink">Belum ada tiket yang dibeli.</b>
          <p className="max-w-[52ch] text-sm leading-[21px] text-muted">
            Tiket yang kamu bayar akan muncul di sini lengkap dengan QR.
          </p>
        </div>
        <ButtonLink to="/events" variant="tint" small>
          Lihat event
        </ButtonLink>
      </div>
    </section>
  )
}
