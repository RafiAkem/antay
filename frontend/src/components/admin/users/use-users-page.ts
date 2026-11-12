import { useMemo, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { fetchOrganizers, fetchUsers, updateUser } from '@/lib/accounts-api'
import { ApiError } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { ManagedUser } from '@/types/accounts'
import { useRemoteList } from '../shared/use-remote-list'
import { messageOf } from '../shared/validation'
import { ROLE_LABEL, matchesUser, type RoleFilter } from './user-labels'

let dialogKey = 0

export function useUsersPage() {
  const toast = useToast()
  const { user: me } = useSession()
  const users = useRemoteList(fetchUsers, 'Daftar akun gagal dimuat.')
  // Penyelenggara dimuat untuk dua hal: pilihan di form tambah akun, dan
  // menampilkan nama penyelenggara di baris akun berperan organizer.
  const organizers = useRemoteList(fetchOrganizers, 'Daftar penyelenggara gagal dimuat.')

  const [filter, setFilter] = useState<RoleFilter>('all')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState<number | null>(null)
  const [resetting, setResetting] = useState<{ user: ManagedUser; key: number } | null>(null)
  const [toggling, setToggling] = useState<ManagedUser | null>(null)
  const [toggleBusy, setToggleBusy] = useState(false)

  const needle = query.trim().toLowerCase()
  const visible = useMemo(() => users.rows.filter((row) => matchesUser(row, filter, needle)), [users.rows, filter, needle])
  const organizerNames = useMemo(
    () => new Map(organizers.rows.map((item) => [item.id, item.name] as const)),
    [organizers.rows],
  )

  function handleCreated(created: ManagedUser) {
    toast.show(`Akun ${ROLE_LABEL[created.role].toLowerCase()} ${created.name} dibuat.`, 'ok')
    setCreating(null)
    users.reload()
  }

  function handlePasswordDone(updated: ManagedUser) {
    toast.show(`Kata sandi ${updated.name} sudah diganti.`, 'ok')
    setResetting(null)
  }

  async function confirmToggle() {
    if (!toggling || toggleBusy) return
    setToggleBusy(true)
    try {
      const saved = await updateUser(toggling.id, { isActive: !toggling.isActive })
      toast.show(`Akun ${saved.name} sekarang ${saved.isActive ? 'aktif' : 'nonaktif'}.`, 'ok')
      setToggling(null)
      users.reload()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) {
        toast.error('Akun ini sudah tidak ada. Daftar dimuat ulang.')
        setToggling(null)
        users.reload()
      } else {
        // Termasuk CANNOT_DEACTIVATE_SELF; pesannya dari server sudah jelas.
        toast.error(messageOf(cause, `Status akun ${toggling.name} gagal diubah. Coba lagi.`))
      }
    } finally {
      setToggleBusy(false)
    }
  }

  return {
    meId: me?.id ?? null,
    rows: users.rows,
    visible,
    loading: users.loading,
    error: users.error,
    retry: users.retry,
    filter,
    setFilter,
    query,
    setQuery,
    organizers: organizers.rows,
    organizersLoading: organizers.loading,
    organizersError: organizers.error,
    reloadOrganizers: organizers.reload,
    retryOrganizers: organizers.retry,
    organizerNames,
    creating,
    openCreate: () => setCreating(++dialogKey),
    closeCreate: () => setCreating(null),
    handleCreated,
    resetting,
    openReset: (row: ManagedUser) => setResetting({ user: row, key: ++dialogKey }),
    closeReset: (reload: boolean) => {
      setResetting(null)
      if (reload) users.reload()
    },
    handlePasswordDone,
    toggling,
    toggleBusy,
    askToggle: setToggling,
    cancelToggle: () => setToggling(null),
    confirmToggle,
  }
}
