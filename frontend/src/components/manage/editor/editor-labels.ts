export type EditorTab = 'info' | 'tickets' | 'images' | 'seating' | 'preview'

export const EDITOR_TABS: Array<{ value: EditorTab; label: string }> = [
  { value: 'info', label: 'Info' },
  { value: 'tickets', label: 'Tiket' },
  { value: 'images', label: 'Gambar' },
  { value: 'seating', label: 'Denah kursi' },
  { value: 'preview', label: 'Pratinjau' },
]

export function isEditorTab(value: string | null): value is EditorTab {
  return EDITOR_TABS.some((tab) => tab.value === value)
}

export function tabLabel(tab: EditorTab): string {
  return EDITOR_TABS.find((item) => item.value === tab)?.label ?? 'Info'
}

// Field di details EVENT_INCOMPLETE: saleStartsAt, saleEndsAt, categories,
// categories.<id>.packages, categories.<id>.seats. Dicocokkan dari potongan katanya
// supaya field baru dari backend tetap punya tujuan; sisanya jatuh ke tab Info.
export function tabForField(field: string): EditorTab {
  const name = field.toLowerCase()
  // "categories.<id>.seats" harus ke denah, jadi kursi dicek sebelum kategori.
  if (/seat/.test(name)) return 'seating'
  if (/categor|package|pax|price|quota/.test(name)) return 'tickets'
  if (/poster|image|gallery/.test(name)) return 'images'
  return 'info'
}
