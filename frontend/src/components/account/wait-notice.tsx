// Tampil selama server masih menolak karena terlalu banyak percobaan.
// Bukan toast, karena angkanya harus terus turun sampai tombol bisa dipakai lagi.
export function WaitNotice({ seconds }: { seconds: number }) {
  if (seconds <= 0) return null
  return (
    <p role="status" className="rounded-control bg-warning-bg px-3 py-2.5 text-sm leading-5 text-warning-ink">
      Terlalu banyak percobaan dari perangkat ini. Coba lagi dalam <b className="font-mono font-semibold">{seconds}</b> detik.
    </p>
  )
}
