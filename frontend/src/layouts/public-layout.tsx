import { Outlet } from 'react-router-dom'
import { PublicFooter } from '@/components/navigation/public-footer'
import { PublicHeader } from '@/components/navigation/public-header'
import { PublicTabBar } from '@/components/navigation/public-tab-bar'

type PublicLayoutProps = {
  // Halaman dibuka foto hero full-bleed: header melayang transparan di atasnya.
  hero?: boolean
}

// Shell pembeli. Layout ini tidak memberi gutter atau padding atas ke <main>:
// tiap halaman menyusun Section + Container sendiri. Header non-hero sticky,
// jadi sudah memakan tempat dan tidak butuh spacer. Header hero fixed, dan
// memang tidak diberi spacer supaya fotonya naik sampai tepi atas layar.
// Padding bawah memberi ruang untuk tab bar ponsel beserta safe area.
export function PublicLayout({ hero = false }: PublicLayoutProps) {
  return (
    <div className="flex min-h-full flex-col overflow-x-clip pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom,0px))] lg:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
      >
        Langsung ke isi
      </a>
      <PublicHeader overlay={hero} />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      <PublicTabBar />
    </div>
  )
}
