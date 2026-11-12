import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/container'
import { Heading } from '@/components/ui/text'
import { formatEventWhen } from '@/components/events/list/event-dates'
import type { CatalogEvent } from '@/types/catalog'
import { HomeSearch } from './home-search'

type HomeHeroProps = {
  // Event yang posternya dipakai sebagai latar. null = blok warna malam saja.
  featured: CatalogEvent | null
}

// Hero memakai poster event sungguhan, bukan foto stok, dan menyebut event-nya
// di pojok bawah supaya orang yang tertarik dengan fotonya bisa langsung membukanya.
export function HomeHero({ featured }: HomeHeroProps) {
  return (
    <section
      aria-labelledby="home-title"
      className="relative isolate flex min-h-[56dvh] items-center overflow-hidden bg-night text-white lg:min-h-[64dvh]"
    >
      {featured ? (
        <img
          src={featured.posterUrl}
          alt=""
          width={1600}
          height={900}
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
      ) : null}
      {/* Scrim rata di seluruh foto: poster event sering penuh tulisan, jadi
          judul di atasnya butuh latar yang konsisten gelap, bukan cuma di atas. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-night/65" />

      <Container size="wide" className="grid grid-cols-[minmax(0,1fr)] justify-items-start gap-4 pt-[calc(var(--spacing-header)+28px)] pb-14">
        <p className="text-[13px] leading-[18px] font-semibold text-white/80">Summarecon Mall Bandung</p>
        <Heading level={1} size="display" id="home-title" className="max-w-[20ch]">
          Semua event di Summaba, dari beli tiket sampai tukar di loket.
        </Heading>
        <p className="max-w-[54ch] text-sm leading-[21px] text-white/80 sm:text-[15px] sm:leading-[22px]">
          Beli tiket dan pilih kursi dari ponsel, lalu datang ke loket sesuai jam tukar yang kamu pilih.
        </p>
        <div className="w-full pt-2">
          <HomeSearch />
        </div>
      </Container>

      {featured ? (
        <Container size="wide" className="absolute inset-x-0 bottom-3">
          <Link
            to={`/events/${featured.id}`}
            className="ml-auto block w-fit max-w-full truncate text-xs leading-4 text-white/75 hover:text-white hover:underline"
          >
            Di foto: {featured.name}, {formatEventWhen(featured.eventDate, featured.openTime)}
          </Link>
        </Container>
      ) : null}
    </section>
  )
}
