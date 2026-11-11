import { Link } from 'react-router-dom'
import { LinkButton } from '@/components/admin/shared/link-button'
import { BrandMark } from '@/components/navigation/icons'
import { Container } from '@/components/ui/container'
import { Heading, Paragraph } from '@/components/ui/text'

const QUICK_LINKS = [
  { to: '/', label: 'Beranda' },
  { to: '/tickets', label: 'Tiket saya' },
  { to: '/board', label: 'Papan antrean' },
  { to: '/login', label: 'Masuk petugas' },
]

// Halaman penuh di luar layout, jadi boleh memusatkan diri di layar.
export function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ground py-10">
      <Container size="narrow">
        <div className="grid justify-items-start gap-5">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Antay, ke beranda">
            <BrandMark />
            <b className="text-lg font-bold tracking-[-0.01em]">Antay</b>
          </Link>
          <p aria-hidden="true" className="font-mono text-[clamp(64px,14vw,112px)] leading-none font-bold text-tint-200">
            404
          </p>
          <div className="grid gap-1.5">
            <Heading level={1}>Halaman ini tidak ada</Heading>
            <Paragraph tone="muted">
              Alamatnya mungkin salah ketik, atau eventnya sudah selesai dan halamannya ditutup.
            </Paragraph>
          </div>
          <LinkButton to="/events">Cari event lain</LinkButton>
          <nav aria-label="Tautan cepat" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border-soft pt-4">
            {QUICK_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="text-sm font-semibold text-muted transition-colors hover:text-ink">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </Container>
    </main>
  )
}
