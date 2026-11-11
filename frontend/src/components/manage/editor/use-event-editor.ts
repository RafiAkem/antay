import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchManagedEvent } from '@/lib/manage-api'
import type { ManagedEvent } from '@/types/manage'
import { errorMessage } from '../shared/manage-labels'
import { useEventTransition } from '../shared/use-event-transition'
import { isEditorTab, type EditorTab } from './editor-labels'

// State editor satu event: muat data, tab aktif di URL, dan penjaga perubahan
// yang belum disimpan. Panel tiap tab melaporkan dirty lewat setDirty.
export function useEventEditor(eventId: string) {
  const isNew = eventId === 'new'
  const [params, setParams] = useSearchParams()
  const [stored, setEvent] = useState<ManagedEvent | null>(null)
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null)
  const [version, setVersion] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [pendingTab, setPendingTab] = useState<EditorTab | null>(null)

  const rawTab = params.get('tab')
  const tab: EditorTab = isNew || !isEditorTab(rawTab) ? 'info' : rawTab

  // Event dan galat hanya dipakai bila milik id di URL, jadi pindah ke event lain
  // tidak sempat menampilkan data event sebelumnya.
  const event = stored && stored.id === eventId ? stored : null
  const error = failure && failure.id === eventId ? failure.message : null
  const loading = !isNew && !event && !error

  const reload = useCallback(() => {
    setFailure(null)
    setVersion((value) => value + 1)
  }, [])
  const transition = useEventTransition(reload)

  useEffect(() => {
    if (isNew) return
    const controller = new AbortController()
    fetchManagedEvent(eventId, controller.signal)
      .then((data) => setEvent(data))
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setFailure({ id: eventId, message: errorMessage(cause, 'Event belum bisa dimuat. Coba lagi sebentar lagi.') })
      })
    return () => controller.abort()
  }, [eventId, isNew, version])

  // Menutup tab atau memuat ulang browser saat masih ada isian yang belum disimpan.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const goTo = useCallback(
    (next: EditorTab) => {
      setParams(
        (current) => {
          const copy = new URLSearchParams(current)
          if (next === 'info') copy.delete('tab')
          else copy.set('tab', next)
          return copy
        },
        { replace: true },
      )
    },
    [setParams],
  )

  function requestTab(next: EditorTab) {
    if (next === tab) return
    if (dirty) {
      setPendingTab(next)
      return
    }
    goTo(next)
  }

  function discardAndGo() {
    if (!pendingTab) return
    setDirty(false)
    goTo(pendingTab)
    setPendingTab(null)
  }

  return {
    isNew,
    event,
    setEvent,
    loading,
    error,
    reload,
    tab,
    requestTab,
    dirty,
    setDirty,
    pendingTab,
    cancelPending: () => setPendingTab(null),
    discardAndGo,
    transition,
  }
}
