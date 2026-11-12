import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Heading } from '@/components/ui/text'
import type { ManagedEvent } from '@/types/manage'
import { formatEventDate } from '../shared/manage-labels'
import { StatusPill } from '../shared/status-pill'

type EditorHeaderProps = {
  event: ManagedEvent | null
  actions?: ReactNode
}

export function EditorHeader({ event, actions }: EditorHeaderProps) {
  return (
    <div className="grid gap-3">
      <Link to="/manage/events" className="justify-self-start text-[13px] font-semibold text-muted hover:text-ink">
        &larr; Semua event
      </Link>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Heading level={1} className="min-w-0 break-words">
              {event ? event.name : 'Event baru'}
            </Heading>
            {event ? <StatusPill status={event.status} /> : null}
          </div>
          <p className="text-sm text-muted">
            {event ? (
              <>
                <span className="font-mono">{event.codePrefix}</span> · {formatEventDate(event.eventDate)} ·{' '}
                {event.place}
              </>
            ) : (
              'Isi info dasar dulu. Kategori, paket, gambar, dan denah bisa diatur setelah draf tersimpan.'
            )}
          </p>
        </div>
        {actions}
      </div>
    </div>
  )
}
