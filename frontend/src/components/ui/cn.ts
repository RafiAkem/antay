type ClassPart = string | false | null | undefined

// Sengaja tanpa clsx/tailwind-merge supaya tidak menambah dependensi. Akibatnya
// kelas yang bentrok tidak "ditimpa": yang menang ditentukan urutan CSS Tailwind,
// bukan urutan string. Jadi className tambahan sebaiknya menambah, bukan melawan.
export function cn(...parts: ClassPart[]): string {
  return parts.filter(Boolean).join(' ')
}
