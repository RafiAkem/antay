import type { ReactNode } from 'react'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Heading, Paragraph } from '@/components/ui/text'

type Props = {
  title: string
  intro: string
  footer?: ReactNode
  children: ReactNode
}

// Di ponsel form langsung menempel di halaman tanpa bingkai kartu, karena
// kartu di dalam layar sempit cuma memakan gutter. Bingkainya muncul mulai sm.
export function AuthCard({ title, intro, footer, children }: Props) {
  return (
    <Section labelledBy="auth-title">
      <Container size="narrow">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="sm:rounded-card sm:border sm:border-border-soft sm:bg-surface sm:p-7">
            <Heading level={1} size="xl" id="auth-title">
              {title}
            </Heading>
            <Paragraph tone="muted" className="mt-1.5">
              {intro}
            </Paragraph>
            <div className="mt-6">{children}</div>
          </div>
          {footer ? <div className="mt-5 grid gap-2 text-center text-sm leading-[21px] text-muted">{footer}</div> : null}
        </div>
      </Container>
    </Section>
  )
}
