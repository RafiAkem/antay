import type { ReactNode } from 'react'
import { Heading, Paragraph } from '@/components/ui/text'

type AdminPageHeadProps = {
  id: string
  title: string
  description: string
  action?: ReactNode
}

export function AdminPageHead({ id, title, description, action }: AdminPageHeadProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid max-w-[64ch] gap-1">
        <Heading level={1} id={id}>
          {title}
        </Heading>
        <Paragraph tone="muted">{description}</Paragraph>
      </div>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  )
}
