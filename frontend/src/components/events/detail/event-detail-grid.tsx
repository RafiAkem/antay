import type { ReactNode } from 'react'

// Kerangka dua kolom halaman detail, dipakai halaman asli dan skeleton supaya
// lebarnya selalu sama. Kolom kanan 340px cukup untuk harga, tombol, dan nama
// kategori tanpa terpotong.
export function EventDetailGrid({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">{children}</div>
      {aside}
    </div>
  )
}
