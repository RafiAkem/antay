export function waitLabel(minutes: number): string {
  return minutes > 0 ? `${minutes} menit` : 'kurang dari 1 menit'
}

export function percent(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.round((value / total) * 100))
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function slotRange(start: string, end: string): string {
  return `${start}-${end}`
}
