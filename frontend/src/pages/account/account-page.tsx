import { AccountLinks } from '@/components/account/account-links'
import { AccountSkeleton } from '@/components/account/account-skeleton'
import { ProfileCard } from '@/components/account/profile-card'
import { RequireCustomer } from '@/components/account/require-customer'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Heading } from '@/components/ui/text'

export function AccountPage() {
  return (
    <Section labelledBy="account-title">
      <Container size="narrow">
        <Heading level={1} id="account-title" className="mb-5">
          Akun
        </Heading>
        <RequireCustomer fallback={<AccountSkeleton />}>
          {(customer) => (
            <div className="grid gap-4">
              <ProfileCard customer={customer} />
              <AccountLinks />
            </div>
          )}
        </RequireCustomer>
      </Container>
    </Section>
  )
}
