import { useCallback, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import {
  createCategory,
  createPackage,
  deleteCategory,
  deletePackage,
  updateCategory,
  updatePackage,
} from '@/lib/manage-api'
import type { ManagedCategory, ManagedEvent, ManagedPackage } from '@/types/manage'
import { bySortOrder, errorMessage } from '../../shared/manage-labels'
import {
  nextSortOrder,
  reorder,
  toCategoryPayload,
  toPackagePayload,
  type CategoryValues,
  type EditingKey,
  type PackageValues,
} from './ticket-values'

export type Removal = { kind: 'category' | 'package'; id: string; name: string }

// Semua aksi tab Tiket. Setiap simpan memanggil reload supaya kategori, paket,
// dan jumlah kursi selalu dari server, bukan hasil tebakan di klien.
export function useTicketsPanel(event: ManagedEvent, reload: () => void, onDirtyChange: (dirty: boolean) => void) {
  const toast = useToast()
  const [editing, setEditing] = useState<EditingKey | null>(null)
  const [formDirty, setFormDirty] = useState(false)
  const [removal, setRemoval] = useState<Removal | null>(null)
  const [removing, setRemoving] = useState(false)
  const [moving, setMoving] = useState(false)

  const categories = bySortOrder(event.categories ?? [])

  const reportDirty = useCallback(
    (dirty: boolean) => {
      setFormDirty(dirty)
      onDirtyChange(dirty)
    },
    [onDirtyChange],
  )

  function open(key: EditingKey) {
    if (formDirty && editing !== key) {
      toast.error('Simpan atau batalkan dulu isian yang sedang terbuka.')
      return
    }
    setEditing(key)
  }

  const close = () => setEditing(null)

  async function saveCategory(category: ManagedCategory | null, values: CategoryValues) {
    const sortOrder = category ? category.sortOrder : nextSortOrder(categories)
    const payload = toCategoryPayload(values, sortOrder)
    if (category) await updateCategory(category.id, payload)
    else await createCategory(event.id, payload)
    toast.show(category ? `Kategori ${payload.name} disimpan.` : `Kategori ${payload.name} ditambahkan.`, 'ok')
    close()
    reload()
  }

  async function savePackage(category: ManagedCategory, pack: ManagedPackage | null, values: PackageValues) {
    const sortOrder = pack ? pack.sortOrder : nextSortOrder(category.packages ?? [])
    const payload = toPackagePayload(values, sortOrder)
    if (pack) await updatePackage(pack.id, payload)
    else await createPackage(category.id, payload)
    toast.show(`Paket ${payload.name} di ${category.name} disimpan.`, 'ok')
    close()
    reload()
  }

  async function move(changes: Array<{ id: string; sortOrder: number }>, patch: (id: string, sortOrder: number) => Promise<void>) {
    if (changes.length === 0) return
    setMoving(true)
    try {
      await Promise.all(changes.map((change) => patch(change.id, change.sortOrder)))
    } catch (cause) {
      toast.error(errorMessage(cause, 'Urutan gagal diubah. Coba lagi.'))
    } finally {
      setMoving(false)
      reload()
    }
  }

  const moveCategory = (index: number, direction: -1 | 1) =>
    move(reorder(categories, index, direction), (id, sortOrder) => updateCategory(id, { sortOrder }))

  const movePackage = (category: ManagedCategory, index: number, direction: -1 | 1) =>
    move(reorder(bySortOrder(category.packages ?? []), index, direction), (id, sortOrder) => updatePackage(id, { sortOrder }))

  async function confirmRemove() {
    if (!removal) return
    setRemoving(true)
    try {
      if (removal.kind === 'category') await deleteCategory(removal.id)
      else await deletePackage(removal.id)
      toast.show(`${removal.kind === 'category' ? 'Kategori' : 'Paket'} ${removal.name} dihapus.`, 'ok')
      reload()
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'CATEGORY_HAS_SEATS') {
        toast.error(`${removal.name} masih punya kursi di denah. Hapus kursinya dulu di tab Denah kursi.`)
      } else {
        toast.error(errorMessage(cause, 'Gagal menghapus. Coba lagi.'))
      }
    } finally {
      setRemoving(false)
      setRemoval(null)
    }
  }

  return {
    categories,
    editing,
    open,
    close,
    reportDirty,
    saveCategory,
    savePackage,
    moveCategory,
    movePackage,
    moving,
    removal,
    askRemove: setRemoval,
    cancelRemove: () => setRemoval(null),
    confirmRemove,
    removing,
  }
}
