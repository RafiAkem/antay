import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Paragraph } from '@/components/ui/text'
import type { CheckoutFlow } from './use-checkout-flow'

// Semua modal checkout di satu tempat: konfirmasi ganti kategori dan
// pemberitahuan pembayaran yang belum tersedia.
export function CheckoutDialogs({ flow }: { flow: CheckoutFlow }) {
  const { checkout, paymentOpen, closePayment } = flow
  const from = checkout.category?.name ?? 'kategori ini'
  const to = checkout.pendingCategory?.name ?? 'kategori lain'

  return (
    <>
      <Modal
        open={checkout.needsSwitchConfirm}
        onClose={checkout.cancelSwitchCategory}
        title="Ganti kategori?"
        description={`Pilihan paket di ${from} akan dihapus, termasuk kursi dan nama pemegang tiket. Setelah itu kamu memilih paket ${to} dari awal.`}
        footer={
          <>
            <Button variant="ghost" onClick={checkout.cancelSwitchCategory}>
              Tetap di {from}
            </Button>
            <Button onClick={checkout.confirmSwitchCategory}>Ganti ke {to}</Button>
          </>
        }
      />

      {/* Pembayaran baru dibangun di fase 3. Sengaja tidak pura-pura berhasil:
          pembeli diberi tahu apa yang akan terjadi, dan keranjangnya tetap utuh. */}
      <Modal
        open={paymentOpen}
        onClose={closePayment}
        title="Pembayaran segera tersedia"
        footer={<Button onClick={closePayment}>Mengerti</Button>}
      >
        <div className="grid gap-2">
          <Paragraph>
            Di rilis berikutnya, tombol ini membuat pesananmu lalu membuka halaman payment gateway untuk membayar lewat QRIS,
            Virtual Account, e-wallet, atau kartu. Kursi dan kuota ditahan 15 menit selama menunggu pembayaran.
          </Paragraph>
          <Paragraph tone="muted" size="sm">
            Belum ada pesanan yang dibuat dan belum ada uang yang ditagih. Pilihan paket, kursi, dan nama pemegang tiket tetap
            tersimpan selama tab ini terbuka.
          </Paragraph>
        </div>
      </Modal>
    </>
  )
}
