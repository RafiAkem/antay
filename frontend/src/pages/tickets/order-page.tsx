import { useParams } from 'react-router-dom'
import { RequireCustomer } from '@/components/account/require-customer'
import { OrderPending } from '@/components/tickets/order-pending'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Skeleton } from '@/components/ui/skeleton'
import { Heading } from '@/components/ui/text'

export function OrderPage() {
  const { orderId = '' } = useParams()

  return (
    <Section labelledBy="order-title">
      <Container size="narrow">
        <Heading level={1} id="order-title" className="mb-5">
          Detail pesanan
        </Heading>
        <RequireCustomer fallback={<Skeleton className="h-[228px] rounded-card" />}>
          {() => <OrderPending orderId={orderId} />}
        </RequireCustomer>
      </Container>
    </Section>
  )
}
