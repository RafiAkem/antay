import { cn } from '@/components/ui/cn'

type EventPosterProps = {
  posterUrl: string
  name: string
  // Tanggal yang sudah diformat, dipakai placeholder saat poster belum ada.
  when: string
  className?: string
}

// Poster yang belum diunggah tidak boleh terlihat seperti gambar rusak. Gantinya
// blok warna malam dengan nama dan tanggal yang besar, jadi kartunya tetap
// bisa dibaca sekilas seperti poster sungguhan.
export function EventPoster({ posterUrl, name, when, className }: EventPosterProps) {
  if (posterUrl) {
    return (
      <img
        src={posterUrl}
        alt=""
        width={600}
        height={600}
        loading="lazy"
        decoding="async"
        className={cn('h-full w-full object-cover', className)}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cn('flex h-full w-full flex-col justify-start gap-2 bg-night p-[8%] text-white', className)}
    >
      <span className="line-clamp-4 text-[clamp(16px,4.6vw,22px)] leading-[1.15] font-bold tracking-[-0.015em] text-balance sm:text-[clamp(16px,2vw,22px)]">
        {name}
      </span>
      <span className="num text-[12px] leading-4 font-semibold text-white/70">{when}</span>
    </div>
  )
}
