import type { Role } from '@/types/api'
import type { IconName } from './icons'

export type MenuItem = {
  label: string
  path: string
  icon: IconName
  roles: Role[]
  // Papan dipasang di layar TV, jadi dibuka di tab sendiri supaya loket tetap terbuka.
  newTab?: boolean
}

// Satu daftar untuk rail desktop dan nav bawah di ponsel. Jangan bikin salinan.
export const MENU_ITEMS: MenuItem[] = [
  { label: 'Kelola event', path: '/manage/events', icon: 'ticket', roles: ['organizer', 'admin'] },
  { label: 'Persetujuan', path: '/manage/reviews', icon: 'explore', roles: ['admin'] },
  { label: 'Loket', path: '/counter', icon: 'counter', roles: ['staff', 'admin'] },
  { label: 'Papan', path: '/board', icon: 'board', roles: ['staff', 'admin'], newTab: true },
  { label: 'Dasbor', path: '/dashboard', icon: 'chart', roles: ['admin'] },
  { label: 'Penyelenggara', path: '/admin/organizers', icon: 'home', roles: ['admin'] },
  { label: 'Akun', path: '/admin/users', icon: 'user', roles: ['admin'] },
]

export function visibleMenu(role: Role | null): MenuItem[] {
  if (!role) return MENU_ITEMS
  return MENU_ITEMS.filter((item) => item.roles.includes(role))
}

export type PublicMenuItem = {
  label: string
  path: string
  icon: IconName
  // Akun tidak muncul di nav desktop karena sudah diwakili tombol Masuk di kanan header.
  desktop: boolean
}

// Satu daftar untuk nav header desktop dan tab bar ponsel di PublicLayout.
export const PUBLIC_MENU: PublicMenuItem[] = [
  { label: 'Beranda', path: '/', icon: 'home', desktop: true },
  { label: 'Event', path: '/events', icon: 'explore', desktop: true },
  { label: 'Tiket saya', path: '/tickets', icon: 'ticket', desktop: true },
  { label: 'Akun', path: '/account', icon: 'user', desktop: false },
]
