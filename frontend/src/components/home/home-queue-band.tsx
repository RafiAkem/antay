import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Heading } from '@/components/ui/text'

// Pembeda Antay dari platform tiket lain ada di hari-H, bukan di halaman beli.
// Band gelap ini sengaja memakai warna malam yang sama dengan papan antrean di
// area loket, jadi orang yang nanti melihat layarnya sudah kenal tampilannya.
export function HomeQueueBand() {
  return (
    <Section pad="sm" labelledBy="home-queue-title">
      <Container size="wide">
        <div className="grid gap-5 rounded-card bg-night p-5 text-board-ink sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">
          <div className="grid gap-2">
            <Heading level={2} size="xl" id="home-queue-title" className="max-w-[24ch]">
              Datang sesuai jam tukar, antrean di loket tidak menumpuk.
            </Heading>
            <p className="max-w-[60ch] text-sm leading-[21px] text-board-dim">
              Tiap jam tukar punya kuota sendiri, jadi pengunjung datang bergelombang, bukan bersamaan. Lupa memilih
              jam? Tiketmu tetap bisa ditukar lewat antrean umum.
            </p>
          </div>
          <Link
            to="/board"
            className="inline-flex h-10 w-fit items-center rounded-control border border-board-line px-4 text-sm font-semibold whitespace-nowrap text-board-ink transition-colors hover:bg-white/10"
          >
            Lihat papan antrean
          </Link>
        </div>
      </Container>
    </Section>
  )
}
