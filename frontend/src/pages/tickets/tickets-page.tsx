import { RequireCustomer } from '@/components/account/require-customer'
import { LegacyTickets } from '@/components/tickets/legacy-tickets'
import { PurchasedTickets } from '@/components/tickets/purchased-tickets'
import { TicketsSkeleton } from '@/components/tickets/tickets-skeleton'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Heading, Paragraph } from '@/components/ui/text'

export function TicketsPage() {
  return (
    <Section labelledBy="tickets-title">
      <Container>
        <Heading level={1} id="tickets-title">
          Tiket saya
        </Heading>
        <RequireCustomer fallback={<div className="mt-6"><TicketsSkeleton /></div>}>
          {(customer) => (
            <>
              <Paragraph tone="muted" className="mt-1">
                Masuk sebagai {customer.email}
              </Paragraph>
              <div className="mt-6 grid gap-10">
                <PurchasedTickets />
                <LegacyTickets />
              </div>
            </>
          )}
        </RequireCustomer>
      </Container>
    </Section>
  )
}
