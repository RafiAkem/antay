const NUMBER = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

// Intl dengan style currency menyisipkan spasi tak terputus ("Rp 1.275.000").
// Arah UI minta "Rp1.275.000" rapat, jadi angkanya diformat sendiri.
export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount)
  const sign = rounded < 0 ? '-' : ''
  return `${sign}Rp${NUMBER.format(Math.abs(rounded))}`
}
