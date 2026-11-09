// Bentuk data mengikuti docs/api-contract.md 1:1. Jangan menambah field yang
// tidak dikirim server.

export type Role = 'staff' | 'admin'

export type User = {
  id: string
  email: string
  name: string
  role: Role
}

export type Slot = {
  start: string
  end: string
  capacity: number
  booked: number
  redeemed: number
  left: number
  past: boolean
  current: boolean
}

export type Queue = {
  waiting: number
  waitMinutes: number
  countersNeeded: number
  long: boolean
}

export type EventRef = {
  id: string
  name: string
  place: string
  item: string
  requirement: string
  slotMinutes: number
}

export type EventStatus = 'draft' | 'open' | 'closed'

export type EventDetail = {
  id: string
  codePrefix: string
  name: string
  place: string
  item: string
  requirement: string
  eventDate: string
  openTime: string
  closeTime: string
  slotMinutes: number
  slotCapacity: number
  counterCount: number
  serviceSeconds: number
  waitingCount: number
  status: EventStatus
  leftTotal: number
  slots: Slot[]
}

export type TicketStatus = 'booked' | 'redeemed' | 'cancelled'

export type Ticket = {
  id: string
  code: string
  visitorName: string
  slotStart: string
  slotEnd: string
  status: TicketStatus
  redeemedAt: string | null
  redeemedCounter: number | null
  event: EventRef
  queue: Queue
}

export type TicketTiming = 'early' | 'on_time' | 'late' | 'past_slot'

export type TicketCheck = {
  timing: TicketTiming
  wrongEvent: boolean
  alreadyRedeemed: boolean
  canRedeem: boolean
}

export type BoardData = {
  event: EventRef & {
    openTime: string
    closeTime: string
    slotCapacity: number
    counterCount: number
  }
  now: string
  queue: Queue
  currentSlot: Slot | null
  nextOpenSlot: Slot | null
  upcoming: Slot[]
}

export type AnalyticsSummary = {
  event: EventRef
  totals: {
    registered: number
    redeemed: number
    pending: number
    cancelled: number
    noShow: number
    capacity: number
    left: number
  }
  slots: Array<{
    start: string
    end: string
    registered: number
    redeemed: number
    capacity: number
    past: boolean
    current: boolean
  }>
}

export type OverviewEvent = {
  id: string
  name: string
  place: string
  openTime: string
  closeTime: string
  registered: number
  redeemed: number
  queue: Queue
}

export type CreateEventPayload = {
  name: string
  place: string
  item: string
  requirement: string
  openTime: string
  closeTime: string
  slotMinutes: number
  slotCapacity: number
  counterCount: number
  serviceSeconds: number
}

export type CreateTicketPayload = {
  eventId: string
  slotStart: string
  visitorName: string
}

export type RedeemPayload = {
  eventId: string
  counter: number
  ktpChecked: boolean
}
