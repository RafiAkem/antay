import type { ReactNode } from 'react'
import { Heading, Paragraph } from '@/components/ui/text'

type PageHeadingProps = {
  title: string
  description?: ReactNode
  action?: ReactNode
}

export function PageHeading({ title, description, action }: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid gap-1">
        <Heading level={1}>{title}</Heading>
        {description ? <Paragraph tone="muted">{description}</Paragraph> : null}
      </div>
      {action ? <div className="flex flex-none flex-wrap gap-2">{action}</div> : null}
    </div>
  )
}
