import { Button } from '@/components/ui/button'
import { Price } from '@/components/ui/price'
import { StickyCta } from '@/components/ui/sticky-cta'
import { Heading, Label, Paragraph } from '@/components/ui/text'
import { PriceBreakdown } from './summary/price-breakdown'
import type { CheckoutFlow } from './use-checkout-flow'

// Di desktop ini kartu ringkasan yang menempel di kanan. Di ponsel kartunya
// tidak tampil; yang tersisa cuma StickyCta yang menempel di bawah layar.
// StickyCta sengaja tidak dibungkus elemen tersembunyi, karena elemen fixed
// di dalam induk display:none ikut hilang.
export function CheckoutAside({ flow }: { flow: CheckoutFlow }) {
  const { checkout, blockReason, needsLogin, total, totalNote, onPrimary } = flow
  const { category, packagesInCart, quote, quoteFresh, state, totalPax } = checkout
  const note = blockReason ?? (needsLogin ? 'Kamu akan diminta masuk dulu. Pilihanmu tetap tersimpan.' : null)

  return (
    <aside aria-label="Ringkasan pesanan" className="grid gap-4 lg:sticky lg:top-[calc(var(--spacing-header)+16px)] lg:self-start lg:rounded-card lg:border lg:border-border-soft lg:bg-surface lg:p-5">
      <div className="hidden gap-4 lg:grid">
        <div className="grid gap-0.5">
          <Heading level={2} size="md">
            Pesananmu
          </Heading>
          <Paragraph tone="muted" size="sm">
            {category ? category.name : 'Belum pilih kategori'}
            {state.seatCodes.length > 0 ? ` · kursi ${state.seatCodes.join(', ')}` : ''}
          </Paragraph>
        </div>
        {packagesInCart.length > 0 ? (
          <PriceBreakdown lines={packagesInCart} quote={quoteFresh ? quote : null} pendingNote={totalNote} />
        ) : (
          <Paragraph tone="muted" size="sm">
            Paket yang kamu pilih muncul di sini lengkap dengan harganya.
          </Paragraph>
        )}
      </div>

      <StickyCta className="lg:block">
        <div className="grid w-full gap-2 lg:gap-3">
          {note ? (
            <p aria-live="polite" className={blockReason ? 'text-xs font-semibold text-ink' : 'text-xs text-muted'}>
              {note}
            </p>
          ) : null}
          {/* lg:block, bukan lg:grid: justify-between di grid membuat kolomnya
              menyusut ke isi, dan tombol tidak bisa selebar kartu. */}
          <div className="flex items-center justify-between gap-3 lg:block">
            <div className="grid min-w-0 gap-0.5 lg:hidden">
              <Label>{totalPax > 0 ? `Total · ${totalPax} orang` : 'Total'}</Label>
              <Price amount={total} size="md" />
            </div>
            <Button size="large" onClick={onPrimary} disabled={blockReason !== null} className="min-w-0 flex-1 sm:flex-none lg:w-full">
              {checkout.ctaLabel}
            </Button>
          </div>
        </div>
      </StickyCta>
    </aside>
  )
}
