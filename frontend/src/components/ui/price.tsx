import { cn } from './cn'
import { formatRupiah } from './format-rupiah'

type PriceSize = 'sm' | 'md' | 'lg'

type PriceProps = {
  amount: number
  original?: number
  prefix?: string
  size?: PriceSize
  className?: string
}

const SIZES: Record<PriceSize, { now: string; small: string }> = {
  sm: { now: 'text-[13px] leading-[18px]', small: 'text-xs' },
  md: { now: 'text-[15px] leading-[22px]', small: 'text-[13px]' },
  lg: { now: 'text-xl leading-7', small: 'text-sm' },
}

// Warna promo hanya muncul kalau memang ada harga coret. Harga biasa tetap ink,
// supaya merah muda itu selalu berarti "lebih murah dari biasanya".
export function Price({ amount, original, prefix, size = 'md', className }: PriceProps) {
  const discounted = original !== undefined && original > amount
  const scale = SIZES[size]

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-1.5', className)}>
      {prefix ? <span className={cn('text-muted', scale.small)}>{prefix}</span> : null}
      <span className={cn('num font-bold', scale.now, discounted ? 'text-promo' : 'text-ink')}>
        {formatRupiah(amount)}
      </span>
      {discounted ? (
        <s className={cn('num text-muted', scale.small)}>
          <span className="sr-only">Harga awal </span>
          {formatRupiah(original)}
        </s>
      ) : null}
    </span>
  )
}
