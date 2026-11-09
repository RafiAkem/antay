import type { EventDetail, Queue } from '@/types/api'

type QueueFields = Pick<EventDetail, 'waitingCount' | 'serviceSeconds' | 'counterCount'>

export function queueOf(event: QueueFields): Queue {
  const waiting = Math.max(0, event.waitingCount)
  const counters = Math.max(1, event.counterCount)
  const minutes = (waiting * event.serviceSeconds) / 60
  const waitMinutes = Math.ceil(minutes / counters)
  return {
    waiting,
    waitMinutes,
    countersNeeded: Math.max(1, Math.ceil(minutes / 15)),
    long: waitMinutes > 15,
  }
}
