import { Section } from '@/components/ui/section'
import { Heading } from '@/components/ui/text'
import { EventGlyph } from './event-glyph'
import { FAQ_ITEMS, SECTION_SCROLL_MARGIN } from './event-detail-labels'

// <details> bawaan sudah bisa dibuka keyboard dan dibacakan sebagai disclosure,
// jadi tidak perlu state sendiri. Penanda segitiga bawaan disembunyikan dan
// diganti chevron yang berputar lewat group-open.
export function EventFaqSection() {
  return (
    <Section id="faq" labelledBy="faq-title" pad="sm" className={SECTION_SCROLL_MARGIN}>
      <Heading level={2} id="faq-title" className="mb-3">
        Pertanyaan yang sering muncul
      </Heading>
      <div className="overflow-hidden rounded-card border border-border-soft bg-surface">
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} className="group border-t border-border-soft first:border-t-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm leading-5 font-semibold hover:bg-raised sm:px-5 [&::-webkit-details-marker]:hidden">
              {item.question}
              <EventGlyph name="chevron" className="text-muted transition-transform group-open:rotate-180" />
            </summary>
            <p className="max-w-[68ch] px-4 pb-4 text-sm leading-[21px] text-muted sm:px-5">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  )
}
