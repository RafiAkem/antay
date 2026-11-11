import type { ReactNode } from 'react'

type ControlButtonProps = {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

function ControlButton({ label, onClick, disabled, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center bg-surface text-ink transition-colors hover:bg-raised disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-surface"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        {children}
      </svg>
    </button>
  )
}

type SeatMapControlsProps = {
  zoomed: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

// Tombol zoom tetap ada walau cubit dan Ctrl+gulir sudah bisa: tidak semua
// orang tahu gesturnya, dan pengguna keyboard butuh jalan yang kelihatan.
export function SeatMapControls({ zoomed, onZoomIn, onZoomOut, onReset }: SeatMapControlsProps) {
  return (
    <>
      <div className="absolute top-2 right-2 grid divide-y divide-border-soft overflow-hidden rounded-control border border-border-soft">
        <ControlButton label="Perbesar denah" onClick={onZoomIn}>
          <path d="M3.5 8h9M8 3.5v9" />
        </ControlButton>
        <ControlButton label="Perkecil denah" onClick={onZoomOut} disabled={!zoomed}>
          <path d="M3.5 8h9" />
        </ControlButton>
        <ControlButton label="Kembalikan tampilan denah" onClick={onReset}>
          <path d="M3 8a5 5 0 1 0 1.5-3.6M3 2.5v2.5h2.5" />
        </ControlButton>
      </div>
      <p aria-hidden="true" className="pointer-events-none absolute bottom-2 left-2 rounded-tag bg-surface px-1.5 py-0.5 text-[11px] text-muted">
        <span className="lg:hidden">Cubit atau ketuk untuk memperbesar</span>
        <span className="hidden lg:inline">Seret untuk menggeser, Ctrl + gulir untuk zoom</span>
      </p>
    </>
  )
}
