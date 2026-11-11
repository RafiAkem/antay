import { Heading } from '@/components/ui/text'
import type { CatalogEventDetail } from '@/types/catalog'
import { CategoryStep } from './category/category-step'
import { STEP_HEADINGS } from './checkout-labels'
import { HoldersStep } from './holders-step'
import { PackageStep } from './package/package-step'
import { SeatStep } from './seat/seat-step'
import { SummaryStep } from './summary/summary-step'
import type { CheckoutFlow } from './use-checkout-flow'

type CheckoutContentProps = {
  event: CatalogEventDetail
  flow: CheckoutFlow
}

// Satu langkah, satu keputusan (docs/ui-direction.md). Kalau kategori belum
// ada padahal langkahnya sudah lewat, tampilkan langkah kategori saja.
export function CheckoutContent({ event, flow }: CheckoutContentProps) {
  const { checkout, customer } = flow
  const { state, category } = checkout
  const step = category ? state.step : 'category'

  return (
    <div className="grid gap-4">
      <Heading level={2} id="checkout-step-title">
        {STEP_HEADINGS[step]}
      </Heading>
      {step === 'category' || !category ? (
        <CategoryStep event={event} selectedId={state.categoryId} onSelect={checkout.selectCategory} />
      ) : null}
      {step === 'package' && category ? (
        <PackageStep
          category={category}
          quantities={state.quantities}
          maxQuantity={checkout.maxQuantity}
          onChange={checkout.setQuantity}
          onChangeCategory={() => checkout.goTo('category')}
        />
      ) : null}
      {step === 'seats' && category ? (
        <SeatStep
          eventId={event.id}
          category={category}
          seatCodes={state.seatCodes}
          totalPax={checkout.totalPax}
          onToggle={checkout.toggleSeat}
          onSetSeats={checkout.setSeats}
        />
      ) : null}
      {step === 'holders' ? <HoldersStep holders={state.holders} onChange={checkout.setHolder} /> : null}
      {step === 'summary' && category ? (
        <SummaryStep
          category={category}
          lines={checkout.packagesInCart}
          seatCodes={state.seatCodes}
          holders={state.holders}
          quote={checkout.quote}
          quoteFresh={checkout.quoteFresh}
          quoteLoading={checkout.quoteLoading}
          quoteError={checkout.quoteError}
          promoCode={state.promoCode}
          loggedIn={customer !== null}
          onPromoChange={checkout.setPromoCode}
          onEdit={checkout.goTo}
        />
      ) : null}
    </div>
  )
}
