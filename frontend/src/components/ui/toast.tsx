import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Tone = 'ok' | 'error' | 'info'

type Toast = { id: number; message: string; tone: Tone }

type ToastApi = {
  show: (message: string, tone?: Tone) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, tone: Tone = 'info') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 5000)
  }, [])

  const api = useMemo<ToastApi>(() => ({ show, error: (message) => show(message, 'error') }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full max-w-sm rounded-[var(--radius-control)] border px-3.5 py-2.5 text-sm shadow-lg ${
              toast.tone === 'ok'
                ? 'border-positive-bg bg-positive-bg text-positive-ink'
                : toast.tone === 'error'
                  ? 'border-negative-bg bg-negative-bg text-negative-ink'
                  : 'border-border-soft bg-surface text-ink'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return context
}
