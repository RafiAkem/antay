import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'
import { formatRupiah } from '@/components/ui/format-rupiah'
import type { Quote } from '@/types/catalog'
import type { CartLine } from '../use-checkout'

type PriceBreakdownProps = {
  lines: CartLine[]
  // quote hanya diberikan kalau isinya cocok dengan keranjang sekarang
  quote: Quote | null
  // catatan di bawah subtotal saat quote belum ada
  pendingNote?: string | null
  className?: string
}

function Row({ label, amount, tone, strong, children }: { label: ReactNode; amount: string; tone?: 'promo'; strong?: boolean; children?: ReactNode }) {
  return (
    <div className={cn('flex items-start justify-between gap-3', strong ? 'text-[15px] font-bold' : 'text-sm', tone === 'promo' && 'text-promo')}>
      <span className="grid min-w-0 gap-0.5">
        <span className="min-w-0">{label}</span>
        {children}
      </span>
      <span className="num flex-none text-right">{amount}</span>
    </div>
  )
}

// Rincian harga dipakai di ringkasan dan di kartu samping desktop. Angka diskon
// dan biaya layanan hanya datang dari server (PRD 5.5), tidak pernah ditebak di sini.
export function PriceBreakdown({ lines, quote, pendingNote, className }: PriceBreakdownProps) {
  const rows = quote
    ? quote.items.map((item) => ({ key: item.packageId, name: item.packageName, quantity: item.quantity, pax: item.pax * item.quantity, total: item.lineTotal }))
    : lines.map((line) => ({ key: line.pkg.id, name: line.pkg.name, quantity: line.quantity, pax: line.pkg.pax * line.quantity, total: line.lineTotal }))
  const subtotal = quote ? quote.subtotal : lines.reduce((sum, line) => sum + line.lineTotal, 0)

  return (
    <div className={cn('grid gap-2.5', className)}>
      {rows.map((row) => (
        <Row key={row.key} label={`${row.name} × ${row.quantity}`} amount={formatRupiah(row.total)}>
          <span className="text-xs text-muted">{row.pax} orang</span>
        </Row>
      ))}
      <div className="border-t border-border-soft pt-2.5">
        <Row label="Subtotal" amount={formatRupiah(subtotal)} />
      </div>
      {quote?.appliedDiscounts.map((discount) => (
        <Row
          key={discount.discountId}
          tone="promo"
          amount={`−${formatRupiah(discount.amount)}`}
          label={
            <>
              {discount.name}
              {discount.kind === 'code' && discount.code ? <span className="ml-1.5 font-mono text-xs">{discount.code}</span> : null}
            </>
          }
        />
      ))}
      {quote && quote.fee > 0 ? <Row label="Biaya layanan" amount={formatRupiah(quote.fee)} /> : null}
      {quote ? (
        <div className="border-t border-border-soft pt-2.5">
          <Row label="Total" amount={formatRupiah(quote.total)} strong />
        </div>
      ) : pendingNote ? (
        <p className="text-xs text-muted">{pendingNote}</p>
      ) : null}
    </div>
  )
}
