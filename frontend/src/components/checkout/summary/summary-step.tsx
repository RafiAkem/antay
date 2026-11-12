import { Button } from '@/components/ui/button'
import { Heading, Paragraph } from '@/components/ui/text'
import type { CatalogCategory, Quote } from '@/types/catalog'
import type { CheckoutStep } from '../checkout-state'
import type { CartLine } from '../use-checkout'
import { PriceBreakdown } from './price-breakdown'
import { PromoField } from './promo-field'

type SummaryStepProps = {
  category: CatalogCategory
  lines: CartLine[]
  seatCodes: string[]
  holders: string[]
  quote: Quote | null
  quoteFresh: boolean
  quoteLoading: boolean
  quoteError: string | null
  promoCode: string
  loggedIn: boolean
  onPromoChange: (code: string) => void
  onEdit: (step: CheckoutStep) => void
}

function EditLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="ghost" size="small" onClick={onClick} aria-label={label}>
      Ubah
    </Button>
  )
}

export function SummaryStep(props: SummaryStepProps) {
  const { category, lines, seatCodes, holders, quote, quoteFresh, quoteLoading, quoteError, promoCode, loggedIn, onPromoChange, onEdit } = props
  const freshQuote = quoteFresh ? quote : null

  return (
    <div className="grid gap-3">
      <div className="grid gap-4 rounded-card border border-border-soft bg-surface p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-0.5">
            <Heading level={3}>{category.name}</Heading>
            <Paragraph tone="muted" size="sm">
              {holders.length} orang{seatCodes.length > 0 ? ' · kursi ' : ''}
              {seatCodes.length > 0 ? <span className="font-mono">{seatCodes.join(', ')}</span> : null}
            </Paragraph>
          </div>
          <EditLink onClick={() => onEdit('package')} label="Ubah paket" />
        </div>
        <PriceBreakdown
          lines={lines}
          quote={freshQuote}
          pendingNote={quoteLoading ? 'Menghitung diskon dan biaya layanan.' : null}
        />
        {quoteError ? (
          <p role="alert" className="rounded-control bg-negative-bg px-3 py-2 text-[13px] text-negative-ink">
            {quoteError}
          </p>
        ) : null}
      </div>

      <div className="rounded-card border border-border-soft bg-surface p-4 sm:p-5">
        {loggedIn ? (
          <PromoField
            applied={promoCode}
            checking={quoteLoading}
            settled={freshQuote !== null}
            rejection={freshQuote?.promoRejection ?? null}
            onApply={onPromoChange}
            onClear={() => onPromoChange('')}
          />
        ) : (
          <Paragraph tone="muted" size="sm">
            Kode promo bisa dipakai setelah kamu masuk.
          </Paragraph>
        )}
      </div>

      <div className="flex items-start justify-between gap-3 rounded-card border border-border-soft bg-surface p-4 sm:p-5">
        <div className="grid min-w-0 gap-1">
          <Heading level={3}>Pemegang tiket</Heading>
          <ol className="grid gap-0.5 text-sm">
            {holders.map((name, index) => (
              <li key={index} className="truncate">
                <span className="num text-muted">{index + 1}.</span> {name}
              </li>
            ))}
          </ol>
        </div>
        <EditLink onClick={() => onEdit('holders')} label="Ubah nama pemegang tiket" />
      </div>
    </div>
  )
}
