import { useParams } from 'react-router-dom'
import { EventDetailContent } from '@/components/events/detail/event-detail-content'
import {
  EventDetailError,
  EventDetailMissing,
  EventDetailSkeleton,
} from '@/components/events/detail/event-detail-states'
import { useEventDetail } from '@/components/events/detail/use-event-detail'

export function EventDetailPage() {
  const { eventId = '' } = useParams()
  const { state, retry } = useEventDetail(eventId)

  if (state.status === 'loading') return <EventDetailSkeleton />
  if (state.status === 'missing') return <EventDetailMissing />
  if (state.status === 'error') return <EventDetailError message={state.message} onRetry={retry} />
  // key: pindah ke event lain lewat tautan memulai ulang tab aktif dan lightbox
  return <EventDetailContent key={state.event.id} event={state.event} />
}
