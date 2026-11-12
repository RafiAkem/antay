type SeatChipsProps = {
  seatCodes: string[]
  onRemove: (seatCode: string) => void
}

// Kursi terpilih sebagai chip yang bisa dilepas. Di ponsel denahnya kecil,
// jadi daftar ini cara paling cepat memastikan kursi mana yang sudah diambil.
export function SeatChips({ seatCodes, onRemove }: SeatChipsProps) {
  if (seatCodes.length === 0) {
    return <p className="text-[13px] text-muted">Belum ada kursi dipilih. Ketuk kursi bergaris biru di denah.</p>
  }
  return (
    <ul aria-label="Kursi pilihanmu" className="flex flex-wrap gap-2">
      {seatCodes.map((code) => (
        <li key={code}>
          <button
            type="button"
            onClick={() => onRemove(code)}
            aria-label={`Lepas kursi ${code}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-accent bg-tint-100 pr-2.5 pl-3.5 text-[13px] font-semibold text-accent-ink transition-colors hover:bg-tint-200"
          >
            <span className="font-mono">{code}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}
