type IconName = 'ticket' | 'counter' | 'board' | 'chart'

export function NavIcon({ name }: { name: IconName }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" strokeWidth="1.5" aria-hidden="true" className="flex-none stroke-current">
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

export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.77)} viewBox="0 0 26 20" aria-hidden="true">
      <path
        d="M3 1h20a2 2 0 0 1 2 2v4.2a2.8 2.8 0 0 0 0 5.6V17a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-4.2a2.8 2.8 0 0 0 0-5.6V3a2 2 0 0 1 2-2z"
        fill="var(--color-accent)"
      />
      <path d="M17 4.5v11" className="stroke-white" strokeWidth="1.6" strokeDasharray="2 2" />
    </svg>
  )
}
