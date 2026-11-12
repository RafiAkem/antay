import { LinkButton } from '@/components/admin/shared/link-button'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Heading, Paragraph } from '@/components/ui/text'

const FALLBACK_MESSAGE = 'Data halaman ini tidak bisa dimuat. Periksa koneksi lalu coba lagi.'

// Dipakai di dalam layout untuk kegagalan memuat data tingkat halaman.
export function ErrorPage({
  title = 'Halaman gagal dimuat',
  message,
  onRetry,
}: {
  title?: string
  message?: string | null
  onRetry?: () => void
}) {
  return (
    <Section>
      <Container size="narrow">
        <div role="alert" className="grid justify-items-start gap-4 rounded-card border border-border-soft bg-surface p-5">
          <div className="grid gap-1.5">
            <Heading level={1} size="lg">
              {title}
            </Heading>
            <Paragraph tone="muted">{message || FALLBACK_MESSAGE}</Paragraph>
          </div>
          <div className="flex flex-wrap gap-2">
            {onRetry ? <Button onClick={onRetry}>Coba lagi</Button> : null}
            <LinkButton to="/events" variant="ghost">
              Lihat daftar event
            </LinkButton>
          </div>
        </div>
      </Container>
    </Section>
  )
}
