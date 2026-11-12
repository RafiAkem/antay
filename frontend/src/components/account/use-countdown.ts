import { useEffect, useState } from 'react'

// Hitung mundur untuk pesan "coba lagi dalam N detik" setelah 429.
// Waktu sekarang disimpan di state (bukan Date.now() saat render) supaya
// render tetap murni dan detiknya turun lewat interval saja.
export function useCountdown() {
  const [until, setUntil] = useState<number | null>(null)
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (until === null) return
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= until) setUntil(null)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [until])

  function start(seconds: number) {
    const current = Date.now()
    setNow(current)
    setUntil(current + seconds * 1000)
  }

  const remaining = until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000))
  return { remaining, start }
}
