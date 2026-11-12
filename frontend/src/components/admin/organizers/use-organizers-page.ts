import { useMemo, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { fetchOrganizers, updateOrganizer } from '@/lib/accounts-api'
import { ApiError } from '@/lib/api'
import type { Organizer } from '@/types/accounts'
import { useRemoteList } from '../shared/use-remote-list'
import { messageOf } from '../shared/validation'
import { matchesOrganizer } from './organizer-labels'

// editor null berarti modal tertutup; { row: null } berarti modal tambah.
type Editor = { row: Organizer | null; key: number } | null

let editorKey = 0

export function useOrganizersPage() {
  const toast = useToast()
  const list = useRemoteList(fetchOrganizers, 'Daftar penyelenggara gagal dimuat.')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Editor>(null)
  const [toggling, setToggling] = useState<Organizer | null>(null)
  const [toggleBusy, setToggleBusy] = useState(false)

  const needle = query.trim().toLowerCase()
  const visible = useMemo(() => list.rows.filter((row) => matchesOrganizer(row, needle)), [list.rows, needle])
  const activeCount = list.rows.filter((row) => row.isActive).length

  function handleSaved(saved: Organizer, created: boolean) {
    toast.show(created ? `${saved.name} ditambahkan.` : `Perubahan ${saved.name} disimpan.`, 'ok')
    setEditor(null)
    list.reload()
  }

  function handleEditorClose(reload: boolean) {
    setEditor(null)
    if (reload) list.reload()
  }

  async function confirmToggle() {
    if (!toggling || toggleBusy) return
    const next = !toggling.isActive
    setToggleBusy(true)
    try {
      const saved = await updateOrganizer(toggling.id, { isActive: next })
      toast.show(`${saved.name} sekarang ${saved.isActive ? 'aktif' : 'nonaktif'}.`, 'ok')
      setToggling(null)
      list.reload()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) {
        toast.error('Penyelenggara ini sudah tidak ada. Daftar dimuat ulang.')
        setToggling(null)
        list.reload()
      } else {
        toast.error(messageOf(cause, `Status ${toggling.name} gagal diubah. Coba lagi.`))
      }
    } finally {
      setToggleBusy(false)
    }
  }

  return {
    rows: list.rows,
    visible,
    activeCount,
    loading: list.loading,
    error: list.error,
    retry: list.retry,
    query,
    setQuery,
    editor,
    openCreate: () => setEditor({ row: null, key: ++editorKey }),
    openEdit: (row: Organizer) => setEditor({ row, key: ++editorKey }),
    handleSaved,
    handleEditorClose,
    toggling,
    toggleBusy,
    askToggle: setToggling,
    cancelToggle: () => setToggling(null),
    confirmToggle,
  }
}
