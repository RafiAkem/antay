import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import type { CatalogEventDetail } from '@/types/catalog'
import { EventAboutSection } from './event-about-section'
import { EventAnchorTabs } from './event-anchor-tabs'
import { EventBuyBar, EventBuyPanel } from './event-buy-panel'
import { DETAIL_TAB_IDS } from './event-detail-labels'
import { EventDetailGrid } from './event-detail-grid'
import { EventFaqSection } from './event-faq-section'
import { EventLocationSection } from './event-location-section'
import { EventRedemptionSection } from './event-redemption-section'
import { EventTitleBlock } from './event-title-block'
import { EventMedia } from './media/event-media'
import { EventTicketsSection } from './tickets/event-tickets-section'
import { useActiveSection } from './use-active-section'

// Susunan halaman event yang sudah termuat. Bagian-bagian di bawah tab adalah
// Section sendiri (dengan id) supaya tab jangkar dan IntersectionObserver bisa
// menemukannya. Section luar tanpa padding atas di ponsel karena poster
// sengaja menempel ke header, selebar layar.
export function EventDetailContent({ event }: { event: CatalogEventDetail }) {
  const [active, setActive] = useActiveSection(DETAIL_TAB_IDS)

  return (
    <>
      <Section pad="none" className="pb-[clamp(16px,3vw,28px)] sm:pt-[clamp(16px,3vw,28px)]">
        <Container>
          <EventDetailGrid aside={<EventBuyPanel event={event} />}>
            <div className="grid gap-5 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
              <EventMedia event={event} />
              <EventTitleBlock event={event} />
            </div>

            <div className="mt-6">
              <EventAnchorTabs active={active} onPick={setActive} />
              <EventAboutSection description={event.description} />
              <EventTicketsSection event={event} />
              <EventRedemptionSection event={event} />
              <EventLocationSection place={event.place} />
              <EventFaqSection />
            </div>
          </EventDetailGrid>
        </Container>
      </Section>
      <EventBuyBar event={event} />
    </>
  )
}
