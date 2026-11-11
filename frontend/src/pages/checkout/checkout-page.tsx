import { useParams, useSearchParams } from 'react-router-dom'
import { saleStatusOf } from '@/components/events/detail/event-format'
import { CheckoutClosed, CheckoutError, CheckoutMissing, CheckoutSkeleton } from '@/components/checkout/checkout-states'
import { CheckoutView } from '@/components/checkout/checkout-view'
import { useCheckoutEvent } from '@/components/checkout/use-checkout-event'

export function CheckoutPage() {
  const { eventId = '' } = useParams()
  const [params] = useSearchParams()
  const { state, retry } = useCheckoutEvent(eventId)

  if (state.status === 'loading') return <CheckoutSkeleton />
  if (state.status === 'missing') return <CheckoutMissing />
  if (state.status === 'error') return <CheckoutError message={state.message} onRetry={retry} />
  if (!saleStatusOf(state.event).buyable) return <CheckoutClosed event={state.event} />
  return <CheckoutView key={state.event.id} event={state.event} initialCategoryId={params.get('category')} />
}
