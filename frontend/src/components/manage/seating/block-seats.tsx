import { memo } from 'react'
import { SEAT_RADIUS, type SeatDot } from './seat-geometry'
import { seatTitle } from './seating-labels'

const R = SEAT_RADIUS
const CROSS = R - 2.5

// Warna bukan satu-satunya pembeda: kursi mati diberi silang, ditahan diberi
// garis putus-putus, terjual diisi gelap. Klik dibaca dari data-seat oleh kanvas.
function renderSeat(seat: SeatDot, highlight: boolean) {
  const title = <title>{seatTitle(seat.label, seat.status)}</title>
  if (seat.status === 'disabled') {
    return (
      <g key={seat.label} data-seat={seat.label}>
        <circle cx={seat.x} cy={seat.y} r={R} className="fill-surface stroke-control" strokeWidth={1} />
        <path
          d={`M${seat.x - CROSS} ${seat.y - CROSS}L${seat.x + CROSS} ${seat.y + CROSS}M${seat.x + CROSS} ${seat.y - CROSS}L${seat.x - CROSS} ${seat.y + CROSS}`}
          className="stroke-muted"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {title}
      </g>
    )
  }
  if (seat.status === 'held') {
    return (
      <circle
        key={seat.label}
        data-seat={seat.label}
        data-locked=""
        cx={seat.x}
        cy={seat.y}
        r={R}
        className="fill-warning-bg stroke-warning-ink"
        strokeWidth={1.5}
        strokeDasharray="2.5 2"
      >
        {title}
      </circle>
    )
  }
  if (seat.status === 'sold') {
    return (
      <circle
        key={seat.label}
        data-seat={seat.label}
        data-locked=""
        cx={seat.x}
        cy={seat.y}
        r={R}
        className="fill-muted stroke-ink"
        strokeWidth={1}
      >
        {title}
      </circle>
    )
  }
  return (
    <circle
      key={seat.label}
      data-seat={seat.label}
      cx={seat.x}
      cy={seat.y}
      r={R}
      className={highlight ? 'fill-accent stroke-accent-ink' : 'fill-tint-200 stroke-accent'}
      strokeWidth={1}
    >
      {title}
    </circle>
  )
}

type Props = { seats: readonly SeatDot[]; highlight: boolean }

// Satu grup per blok, di-memo terhadap array kursinya. Menyeret blok lain atau
// menggeser kanvas tidak menyentuh ribuan elemen kursi di sini.
export const BlockSeats = memo(function BlockSeats({ seats, highlight }: Props) {
  return <g>{seats.map((seat) => renderSeat(seat, highlight))}</g>
})
