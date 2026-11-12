import type { AnalyticsSummary } from '@/types/api'

const WIDTH = 680
const HEIGHT = 240
const LEFT = 42
const RIGHT = 12
const TOP = 34
const BOTTOM = 30
const PLOT_W = WIDTH - LEFT - RIGHT
const PLOT_H = HEIGHT - TOP - BOTTOM

function clockLabel(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function stepFor(max: number): number {
  if (max <= 20) return 5
  if (max <= 60) return 10
  if (max <= 200) return 25
  return 50
}

// Legenda ditaruh di sebelah judul kartu, bukan di dalam SVG, supaya tetap
// terbaca saat grafiknya mengecil di ponsel.
export function SlotChartLegend() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-2 w-3 rounded-tag bg-tint-200" aria-hidden="true" />
        terdaftar
      </span>
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-2 w-3 rounded-tag bg-accent" aria-hidden="true" />
        sudah ditukar
      </span>
    </span>
  )
}

export function SlotChart({ summary }: { summary: AnalyticsSummary }) {
  const { event, slots, totals } = summary
  if (slots.length === 0) return null

  const capacity = Math.max(...slots.map((slot) => slot.capacity), 1)
  const step = stepFor(capacity)
  const max = Math.ceil((capacity * 1.1) / step) * step
  const y = (value: number) => TOP + PLOT_H - (value / max) * PLOT_H
  const band = PLOT_W / slots.length
  const barWidth = Math.max(4, Math.min(28, band * 0.62))
  const labelEvery = Math.max(1, Math.ceil(slots.length / 7))
  const baseline = y(0)
  const currentIndex = slots.findIndex((slot) => slot.current)
  const currentX = currentIndex >= 0 ? LEFT + band * currentIndex + band / 2 : null
  const currentRight = currentIndex > slots.length / 2

  const ticks: number[] = []
  for (let value = 0; value <= max; value += step) ticks.push(value)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="num block h-auto w-full"
      role="img"
      aria-label={`Kuota per slot ${event.name}: ${slots.length} slot, ${totals.registered} tiket terdaftar dan ${totals.redeemed} sudah ditukar, kapasitas ${capacity} orang per slot.`}
    >
      {ticks.map((value) => (
        <g key={value}>
          <line x1={LEFT} x2={WIDTH - RIGHT} y1={y(value)} y2={y(value)} stroke="var(--color-border-soft)" />
          <text x={LEFT - 8} y={y(value) + 4} textAnchor="end" fontSize={11} fill="var(--color-muted)">
            {value}
          </text>
        </g>
      ))}

      {slots.map((slot, index) => {
        const center = LEFT + band * index + band / 2
        const left = center - barWidth / 2
        return (
          <g key={slot.start}>
            <rect
              x={left}
              y={y(slot.registered)}
              width={barWidth}
              height={Math.max(0, baseline - y(slot.registered))}
              fill="var(--color-tint-200)"
            />
            <rect
              x={left}
              y={y(slot.redeemed)}
              width={barWidth}
              height={Math.max(0, baseline - y(slot.redeemed))}
              fill="var(--color-accent)"
            />
            {index % labelEvery === 0 ? (
              <text x={center} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="var(--color-muted)">
                {slot.start}
              </text>
            ) : null}
          </g>
        )
      })}

      <line x1={LEFT} x2={WIDTH - RIGHT} y1={baseline} y2={baseline} stroke="var(--color-control)" />
      <line
        x1={LEFT}
        x2={WIDTH - RIGHT}
        y1={y(capacity)}
        y2={y(capacity)}
        stroke="var(--color-muted)"
        strokeDasharray="4 4"
      />
      <text x={WIDTH - RIGHT} y={y(capacity) - 6} textAnchor="end" fontSize={11} fill="var(--color-muted)">
        kuota {capacity}
      </text>

      {currentX !== null ? (
        <g>
          <line x1={currentX} x2={currentX} y1={TOP - 8} y2={baseline} stroke="var(--color-ink)" />
          <text
            x={currentRight ? currentX - 6 : currentX + 6}
            y={TOP - 12}
            textAnchor={currentRight ? 'end' : 'start'}
            fontSize={11}
            fill="var(--color-ink)"
          >
            Sekarang {clockLabel()}
          </text>
        </g>
      ) : null}
    </svg>
  )
}
