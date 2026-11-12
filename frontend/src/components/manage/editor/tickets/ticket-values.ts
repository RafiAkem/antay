import type { CategoryPayload, ManagedCategory, ManagedPackage, PackagePayload } from '@/types/manage'

// Kunci form yang sedang terbuka. Hanya satu form tiket boleh terbuka sekaligus,
// supaya penjaga "belum disimpan" cukup mengurus satu isian.
export type EditingKey = `category:${string}` | `package:${string}` | `new-package:${string}` | 'new-category'

export type CategoryValues = { name: string; description: string; isSeated: boolean; quota: string }
export type PackageValues = { name: string; pax: number; price: string; quota: string; isActive: boolean }

export function categoryValues(category: ManagedCategory | null): CategoryValues {
  return {
    name: category?.name ?? '',
    description: category?.description ?? '',
    isSeated: category?.isSeated ?? false,
    quota: category?.quota ? String(category.quota) : '',
  }
}

export function packageValues(pack: ManagedPackage | null): PackageValues {
  return {
    name: pack?.name ?? '',
    pax: pack?.pax ?? 1,
    price: pack ? String(pack.price) : '',
    quota: pack?.quota ? String(pack.quota) : '',
    isActive: pack?.isActive ?? true,
  }
}

export function sameValues<T extends Record<string, unknown>>(a: T, b: T): boolean {
  return Object.keys(a).every((key) => a[key] === b[key])
}

function positiveInt(value: string): boolean {
  const number = Number(value)
  return value.trim() !== '' && Number.isInteger(number) && number >= 1
}

export function validateCategory(values: CategoryValues): Partial<Record<keyof CategoryValues, string>> {
  const errors: Partial<Record<keyof CategoryValues, string>> = {}
  if (!values.name.trim()) errors.name = 'Nama kategori wajib diisi, misal VIP A atau Festival.'
  // Kategori berkursi kuotanya dihitung dari denah, jadi kuota hanya diminta yang tanpa kursi.
  if (!values.isSeated && !positiveInt(values.quota)) errors.quota = 'Kuota kategori tanpa kursi minimal 1 orang.'
  return errors
}

export function validatePackage(values: PackageValues): Partial<Record<keyof PackageValues, string>> {
  const errors: Partial<Record<keyof PackageValues, string>> = {}
  if (!values.name.trim()) errors.name = 'Nama paket wajib diisi, misal Single atau Couple.'
  if (values.pax < 1 || values.pax > 10) errors.pax = 'Jumlah orang per paket 1 sampai 10.'
  const price = Number(values.price)
  if (values.price.trim() === '' || !Number.isInteger(price) || price < 0) errors.price = 'Harga berupa rupiah bulat, boleh 0 untuk tiket gratis.'
  if (values.quota.trim() !== '' && !positiveInt(values.quota)) errors.quota = 'Kuota paket minimal 1, atau kosongkan bila tanpa batas.'
  return errors
}

export function toCategoryPayload(values: CategoryValues, sortOrder: number): CategoryPayload {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    sortOrder,
    isSeated: values.isSeated,
    quota: values.isSeated ? null : Number(values.quota),
  }
}

export function toPackagePayload(values: PackageValues, sortOrder: number): PackagePayload {
  return {
    name: values.name.trim(),
    pax: values.pax,
    price: Number(values.price),
    quota: values.quota.trim() === '' ? null : Number(values.quota),
    sortOrder,
    isActive: values.isActive,
  }
}

// Geser satu item lalu kembalikan hanya yang urutannya berubah (urutan 0..n-1, sama dengan data seed),
// supaya PATCH yang dikirim sesedikit mungkin.
export function reorder<T extends { id: string; sortOrder: number }>(
  items: T[],
  index: number,
  direction: -1 | 1,
): Array<{ id: string; sortOrder: number }> {
  const target = index + direction
  if (target < 0 || target >= items.length) return []
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
    .map((item, position) => ({ id: item.id, sortOrder: position, before: item.sortOrder }))
    .filter((item) => item.sortOrder !== item.before)
    .map(({ id, sortOrder }) => ({ id, sortOrder }))
}

export function nextSortOrder(items: Array<{ sortOrder: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1
}
