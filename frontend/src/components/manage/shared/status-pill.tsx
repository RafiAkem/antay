import { Pill } from '@/components/ui/pill'
import type { EventStatus } from '@/types/manage'
import { STATUS_LABEL, STATUS_TONE } from './manage-labels'

export function StatusPill({ status }: { status: EventStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill>
}
