import { Section } from '@/components/ui/section'
import { Heading, Paragraph } from '@/components/ui/text'
import { SECTION_SCROLL_MARGIN } from './event-detail-labels'

// Deskripsi ditulis penyelenggara sebagai teks biasa. whitespace-pre-line
// menjaga paragraf dan baris baru mereka tanpa perlu merender HTML.
export function EventAboutSection({ description }: { description: string }) {
  const text = description.trim()
  return (
    <Section id="tentang" labelledBy="tentang-title" pad="sm" className={SECTION_SCROLL_MARGIN}>
      <Heading level={2} id="tentang-title" className="mb-2">
        Tentang event
      </Heading>
      {text ? (
        <Paragraph className="max-w-[68ch] whitespace-pre-line">{text}</Paragraph>
      ) : (
        <Paragraph tone="muted">
          Penyelenggara belum menulis keterangan. Tanggal, jam tukar, dan syarat bawaan di atas sudah pasti.
        </Paragraph>
      )}
    </Section>
  )
}
