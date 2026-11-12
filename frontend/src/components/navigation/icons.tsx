export type IconName = 'ticket' | 'counter' | 'board' | 'chart' | 'home' | 'explore' | 'user'

// Digambar di kotak 16, lalu diskalakan lewat size (tab bar ponsel memakai 20).
export function NavIcon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none stroke-current"
    >
      {name === 'home' ? <path d="M2.5 7 8 2.5 13.5 7v5.8a.7.7 0 0 1-.7.7H10v-3.8H6v3.8H3.2a.7.7 0 0 1-.7-.7z" /> : null}
      {name === 'explore' ? (
        <>
          <circle cx="8" cy="8" r="6" />
          <path d="M10.6 5.4 9.2 9.2 5.4 10.6 6.8 6.8z" />
        </>
      ) : null}
      {name === 'user' ? (
        <>
          <circle cx="8" cy="5.5" r="2.6" />
          <path d="M2.8 13.5c.7-2.4 2.7-3.8 5.2-3.8s4.5 1.4 5.2 3.8" strokeLinecap="round" />
        </>
      ) : null}
      {name === 'ticket' ? (
        <>
          <path d="M2 5.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1.2a1.3 1.3 0 0 0 0 2.6v1.2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9.3a1.3 1.3 0 0 0 0-2.6z" />
          <path d="M10 4.5v7" strokeDasharray="1.5 1.5" />
        </>
      ) : null}
      {name === 'counter' ? (
        <>
          <path d="M2 5V3h2M12 3h2v2M14 11v2h-2M4 13H2v-2" />
          <path d="M5 8l2 2 4-4" />
        </>
      ) : null}
      {name === 'board' ? (
        <>
          <rect x="1.5" y="2.5" width="13" height="8.5" rx="1" />
          <path d="M5.5 14h5M8 11v3" />
        </>
      ) : null}
      {name === 'chart' ? (
        <>
          <path d="M2.5 13.5h11" />
          <path d="M4.5 11V7M8 11V3.5M11.5 11V8.5" />
        </>
      ) : null}
    </svg>
  )
}

// Logo SummaPass "Notch S": huruf S yang dipotong dari tiket, kedua ujungnya
// sudut tiket yang dilubangi. Geometri dari docs/brand/summapass-mark-inline.svg.
// size = tinggi dalam px. Warna ikut currentColor, jadi di atas foto gelap
// pemanggil cukup memberi text-white (panduan brand: biru tidak dipakai di latar gelap).
export function BrandMark({ size = 24, className = 'text-accent' }: { size?: number; className?: string }) {
  return (
    <svg width={Math.round((size * 192) / 208)} height={size} viewBox="0 0 192 208" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M72 0H160A32 32 0 0 0 192 32V44H67A19 19 0 0 0 67 82H192V136A72 72 0 0 1 120 208H32A32 32 0 0 0 0 176V164H125A19 19 0 0 0 125 126H0V72A72 72 0 0 1 72 0Z"
      />
    </svg>
  )
}
