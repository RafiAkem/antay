import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Heading, Paragraph } from '@/components/ui/text'

const STEPS = [
  {
    title: 'Beli tiket, pilih kursi',
    body: 'Pilih kategori dan paket. Kalau acaranya pakai kursi, nomornya kamu pilih sendiri dari denah.',
  },
  {
    title: 'Simpan e-ticket',
    body: 'Satu kode dan QR untuk tiap pemegang tiket, atas nama sesuai KTP. Tersimpan di Tiket saya.',
  },
  {
    title: 'Tukar di loket sesuai jam',
    body: 'Pilih jam tukar, lalu datang bawa QR dan KTP. Petugas mencocokkan nama dengan KTP, lalu menyerahkan item event.',
  },
]

// Angka besar sebagai penanda langkah, bukan ikon: urutannya memang yang penting.
export function HomeSteps() {
  return (
    <Section pad="sm" labelledBy="home-steps-title">
      <Container size="wide" className="grid gap-4">
        <Heading level={2} id="home-steps-title">
          Cara kerjanya
        </Heading>
        <ol className="grid gap-px overflow-hidden rounded-card border border-border-soft bg-border-soft sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3 bg-surface p-4 sm:grid sm:content-start sm:gap-2 sm:p-5">
              <span aria-hidden="true" className="num font-mono text-[28px] leading-8 font-semibold text-accent">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="grid min-w-0 gap-1">
                <Heading level={3}>{step.title}</Heading>
                <Paragraph tone="muted" size="sm">
                  {step.body}
                </Paragraph>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  )
}
