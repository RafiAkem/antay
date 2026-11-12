import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((node) => node.offsetParent !== null)
}

// Perilaku bersama Modal dan Sheet: Esc menutup, body tidak ikut menggulir,
// Tab berputar di dalam panel, dan fokus kembali ke tombol pembuka saat ditutup.
// onClose disimpan di ref supaya pemanggil yang menulis arrow function inline
// tidak membuat efek ini jalan ulang (dan mencuri fokus) di setiap render.
export function useOverlay(open: boolean, onClose: () => void, panelRef: RefObject<HTMLElement | null>) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const panelNode = panelRef.current
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // autoFocus di dalam panel jalan lebih dulu dari efek ini; jangan direbut.
    const focusedInside = Boolean(active && panelNode?.contains(active))
    const previous = focusedInside ? null : active
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!focusedInside) panelNode?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      const panel = panelRef.current
      if (event.key !== 'Tab' || !panel) return
      const items = focusables(panel)
      if (items.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [open, panelRef])
}
