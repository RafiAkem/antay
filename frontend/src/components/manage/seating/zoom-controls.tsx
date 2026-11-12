import type { Viewport } from './use-viewport'

const BUTTON =
  'grid h-8 min-w-8 place-items-center rounded-control px-2 text-sm font-semibold text-ink hover:bg-raised focus-visible:outline-2 focus-visible:outline-accent'

export function ZoomControls({ viewport }: { viewport: Viewport }) {
  return (
    <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-control border border-border-soft bg-surface p-1">
      <button type="button" className={BUTTON} aria-label="Perkecil denah" onClick={() => viewport.zoomAt(1 / 1.25)}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <span className="w-12 text-center font-mono text-xs text-muted" aria-live="polite">
        {Math.round(viewport.scale * 100)}%
      </span>
      <button type="button" className={BUTTON} aria-label="Perbesar denah" onClick={() => viewport.zoomAt(1.25)}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 6h8M6 2v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border-soft" />
      <button type="button" className={`${BUTTON} text-[13px]`} onClick={viewport.reset}>
        Pas layar
      </button>
    </div>
  )
}
