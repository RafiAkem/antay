import type { ManagedEvent } from '@/types/manage'
import { ImagesPanel } from './images/images-panel'
import { InfoForm } from './info/info-form'
import { PreviewPanel } from './preview-panel'
import { SeatingPanel } from './seating-panel'
import { TicketsPanel } from './tickets/tickets-panel'
import type { EditorTab } from './editor-labels'

type EditorContentProps = {
  tab: EditorTab
  event: ManagedEvent | null
  isAdmin: boolean
  editable: boolean
  reload: () => void
  onSaved: (event: ManagedEvent, created: boolean) => void
  onDirtyChange: (dirty: boolean) => void
  onOpenTab: (tab: EditorTab) => void
}

// Hanya panel aktif yang dipasang, jadi isian yang dibuang lewat penjaga tab
// ikut hilang bersama panelnya tanpa perlu reset manual.
export function EditorContent({ tab, event, isAdmin, editable, reload, onSaved, onDirtyChange, onOpenTab }: EditorContentProps) {
  const panel = (() => {
    if (tab === 'info' || !event) {
      return <InfoForm event={event} isAdmin={isAdmin} editable={editable} onSaved={onSaved} onDirtyChange={onDirtyChange} />
    }
    if (tab === 'tickets') return <TicketsPanel event={event} editable={editable} reload={reload} onDirtyChange={onDirtyChange} />
    if (tab === 'images') return <ImagesPanel event={event} editable={editable} reload={reload} onDirtyChange={onDirtyChange} />
    if (tab === 'seating') return <SeatingPanel event={event} editable={editable} onOpenTab={onOpenTab} />
    return <PreviewPanel event={event} />
  })()

  return (
    <div role="tabpanel" id="editor-panel" aria-labelledby={`editor-tab-${tab}`}>
      {panel}
    </div>
  )
}
