import { useEffect, useState } from 'react'

// Menandai bagian yang sedang dibaca untuk tab jangkar. Garis bacanya kira-kira
// 30% dari atas layar, di bawah header dan tab yang menempel: rootMargin bawah
// -70% membuat hanya bagian yang melintasi garis itu yang dianggap "terlihat".
// Dipanggil setelah data termuat, jadi semua bagian sudah ada di DOM saat diamati.
export function useActiveSection(ids: readonly string[]): [string, (id: string) => void] {
  const [active, setActive] = useState<string>(ids[0] ?? '')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        // Ambil yang paling atas di urutan halaman, bukan yang terakhir dilaporkan,
        // supaya tab tidak melompat-lompat saat dua bagian pendek sama-sama kelihatan.
        const first = ids.find((id) => visible.has(id))
        if (first) setActive(first)
      },
      { rootMargin: '-112px 0px -70% 0px' },
    )
    for (const id of ids) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [ids])

  return [active, setActive]
}
