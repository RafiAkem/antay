import { cn } from '@/components/ui/cn'

export type GlyphName = 'calendar' | 'clock' | 'pin' | 'item' | 'id' | 'people' | 'chevron' | 'arrow' | 'external'

// Glyph kecil penanda fakta (tanggal, jam, tempat), bukan ilustrasi. Digambar di
// kotak 16 dengan garis 1.5 supaya serasi dengan ikon navigasi.
export function EventGlyph({ name, size = 16, className }: { name: GlyphName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('flex-none stroke-current', className)}
    >
      {name === 'calendar' ? (
        <>
          <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
          <path d="M2.5 6.8h11M5.5 2v3M10.5 2v3" />
        </>
      ) : null}
      {name === 'clock' ? (
        <>
          <circle cx="8" cy="8" r="5.8" />
          <path d="M8 4.8V8l2.2 1.4" />
        </>
      ) : null}
      {name === 'pin' ? (
        <>
          <path d="M8 14s4.5-4.1 4.5-7.6a4.5 4.5 0 0 0-9 0C3.5 9.9 8 14 8 14z" />
          <circle cx="8" cy="6.4" r="1.6" />
        </>
      ) : null}
      {name === 'item' ? (
        <>
          {/* gelang atau barang yang ditukar: pita melingkar dengan pengunci */}
          <ellipse cx="8" cy="8" rx="5.8" ry="3.6" />
          <path d="M6.6 4.6v6.8M9.4 4.6v6.8" />
        </>
      ) : null}
      {name === 'id' ? (
        <>
          <rect x="1.8" y="3.5" width="12.4" height="9" rx="1.5" />
          <circle cx="5.6" cy="7.4" r="1.4" />
          <path d="M3.8 10.4c.4-1 1-1.5 1.8-1.5s1.4.5 1.8 1.5M9.4 6.6h3M9.4 9h2.2" />
        </>
      ) : null}
      {name === 'people' ? (
        <>
          <circle cx="6" cy="5.6" r="2.1" />
          <path d="M2.2 13c.5-2 1.9-3.2 3.8-3.2s3.3 1.2 3.8 3.2" />
          <path d="M10.4 3.8a2 2 0 0 1 0 3.8M11.6 9.9c1.1.4 1.9 1.4 2.2 3.1" />
        </>
      ) : null}
      {name === 'chevron' ? <path d="m4.5 6.2 3.5 3.6 3.5-3.6" /> : null}
      {name === 'arrow' ? <path d="M3 8h9.5M9 4.5 12.5 8 9 11.5" /> : null}
      {name === 'external' ? <path d="M9.5 3h3.5v3.5M13 3 7.5 8.5M11 9.5V13H3V5h3.5" /> : null}
    </svg>
  )
}
