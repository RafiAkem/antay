import { useEffect } from 'react'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import type { CatalogEventDetail } from '@/types/catalog'
import { CheckoutAside } from './checkout-aside'
import { CheckoutContent } from './checkout-content'
import { CheckoutDialogs } from './checkout-dialogs'
import { CheckoutHeader } from './checkout-header'
import { useCheckoutFlow } from './use-checkout-flow'

type CheckoutViewProps = {
  event: CatalogEventDetail
  initialCategoryId: string | null
  initialSeatCode?: string | null
}

// Halaman checkout untuk satu event yang sedang dijual. Pemanggil wajib memberi
// key={event.id} supaya state keranjang tidak terbawa ke event lain.
export function CheckoutView({ event, initialCategoryId, initialSeatCode = null }: CheckoutViewProps) {
  const flow = useCheckoutFlow(event, initialCategoryId, initialSeatCode)
  const { checkout } = flow
  const step = checkout.state.step

  // Pindah langkah di ponsel mulai dari atas lagi; tanpa ini pembeli yang
  // menggulir daftar paket panjang mendarat di tengah langkah berikutnya.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step])

  return (
    <>
      <CheckoutHeader event={event} steps={checkout.steps} step={step} onBack={checkout.back} onGoTo={checkout.goTo} />
      <Section pad="sm" labelledBy="checkout-step-title">
        <Container className="grid gap-6 pb-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8 lg:pb-0">
          <CheckoutContent event={event} flow={flow} />
          <CheckoutAside flow={flow} />
        </Container>
      </Section>
      <CheckoutDialogs flow={flow} />
    </>
  )
}
