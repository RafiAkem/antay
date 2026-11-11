import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'

const GAP = 6
const EDGE = 8

function menuItems(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'))
}

// Popover menu akun di header. Panelnya di-portal ke body dengan posisi fixed
// dari kotak tombol pemicu, jadi tidak terpotong header dan tidak ikut
// stacking context-nya. Posisi ditulis langsung ke style di layout effect:
// panel tetap tersembunyi sampai terukur, dan tidak ada setState di efek.
export function useMenuPopover() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const trigger = triggerRef.current
    if (!panel || !trigger) return

    const place = () => {
      const rect = trigger.getBoundingClientRect()
      const width = panel.offsetWidth
      const left = Math.min(Math.max(EDGE, rect.right - width), window.innerWidth - width - EDGE)
      panel.style.top = `${Math.round(rect.bottom + GAP)}px`
      panel.style.left = `${Math.round(left)}px`
      panel.style.visibility = 'visible'
    }
    place()
    menuItems(panel)[0]?.focus()

    // Tekanan di tombol pemicu diabaikan: tombol itu punya toggle sendiri, dan
    // kalau ditangani dua kali menunya tertutup lalu langsung terbuka lagi.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panel.contains(target) || trigger.contains(target)) return
      setOpen(false)
    }

    // capture: event scroll tidak naik ke window dari wadah gulir di dalam halaman
    window.addEventListener('scroll', place, { capture: true, passive: true })
    window.addEventListener('resize', place)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('scroll', place, { capture: true })
      window.removeEventListener('resize', place)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
    }
  }

  // Pola menu button WAI-ARIA: panah memindah fokus antar item, Esc menutup
  // dan mengembalikan fokus ke pemicu, Tab juga menutup supaya fokus tidak
  // tersesat di ujung body tempat panel di-portal.
  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const panel = panelRef.current
    if (!panel) return
    const items = menuItems(panel)
    const index = items.indexOf(document.activeElement as HTMLElement)
    const focusAt = (next: number) => items[(next + items.length) % items.length]?.focus()

    if (event.key === 'Escape' || event.key === 'Tab') {
      event.preventDefault()
      close(true)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusAt(index + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusAt(index < 0 ? items.length - 1 : index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusAt(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusAt(items.length - 1)
    }
  }

  return {
    open,
    toggle: () => setOpen((value) => !value),
    close,
    triggerRef,
    panelRef,
    onTriggerKeyDown,
    onPanelKeyDown,
  }
}
