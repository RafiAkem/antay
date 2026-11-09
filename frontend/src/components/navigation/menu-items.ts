import type { Role } from '@/types/api'

export type MenuItem = {
  label: string
  path: string
  icon: 'ticket' | 'counter' | 'board' | 'chart'
  roles: Role[]
}

// Satu daftar untuk rail desktop dan nav bawah di ponsel. Jangan bikin salinan.
export const MENU_ITEMS: MenuItem[] = [
  { label: 'Event', path: '/events', icon: 'ticket', roles: ['staff', 'admin'] },
  { label: 'Loket', path: '/counter', icon: 'counter', roles: ['staff', 'admin'] },
  { label: 'Papan', path: '/board', icon: 'board', roles: ['staff', 'admin'] },
  { label: 'Dasbor', path: '/dashboard', icon: 'chart', roles: ['admin'] },
]

export function visibleMenu(role: Role | null): MenuItem[] {
  if (!role) return MENU_ITEMS
  return MENU_ITEMS.filter((item) => item.roles.includes(role))
}
