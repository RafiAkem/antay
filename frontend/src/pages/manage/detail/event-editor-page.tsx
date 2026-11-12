import { useNavigate, useParams } from 'react-router-dom'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { EditorContent } from '@/components/manage/editor/editor-content'
import { EditorHeader } from '@/components/manage/editor/editor-header'
import { tabLabel } from '@/components/manage/editor/editor-labels'
import { EditorNotices } from '@/components/manage/editor/editor-notices'
import { EditorSkeleton } from '@/components/manage/editor/editor-skeleton'
import { EditorStatusActions } from '@/components/manage/editor/editor-status-actions'
import { EditorTabs } from '@/components/manage/editor/editor-tabs'
import { useEventEditor } from '@/components/manage/editor/use-event-editor'
import { ConfirmModal } from '@/components/manage/shared/confirm-modal'
import { LoadError } from '@/components/manage/shared/load-error'
import { isEditable } from '@/components/manage/shared/manage-labels'
import { useSession } from '@/lib/session'
import type { ManagedEvent } from '@/types/manage'

export function EventEditorPage() {
  const { eventId = 'new' } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const isAdmin = user?.role === 'admin'
  const editor = useEventEditor(eventId)
  const { event } = editor

  function handleSaved(saved: ManagedEvent, created: boolean) {
    editor.setDirty(false)
    editor.setEvent(saved)
    // Draf baru langsung dibawa ke tab Tiket, langkah berikutnya yang paling sering.
    if (created) navigate(`/manage/events/${saved.id}?tab=tickets`, { replace: true })
  }

  let body
  if (editor.loading && !event) {
    body = <EditorSkeleton />
  } else if (editor.error && !event) {
    body = <LoadError message={editor.error} onRetry={editor.reload} />
  } else {
    body = (
      <>
        <EditorHeader
          event={event}
          actions={
            event ? (
              <EditorStatusActions event={event} isAdmin={isAdmin} dirty={editor.dirty} transition={editor.transition} />
            ) : null
          }
        />
        {event ? (
          <EditorNotices event={event} incomplete={editor.transition.incomplete} onOpenTab={editor.requestTab} />
        ) : null}
        <EditorTabs active={editor.tab} disabled={!event} onSelect={editor.requestTab} />
        <EditorContent
          tab={editor.tab}
          event={event}
          isAdmin={isAdmin}
          editable={event ? isEditable(event.status) : true}
          reload={editor.reload}
          onSaved={handleSaved}
          onDirtyChange={editor.setDirty}
          onOpenTab={editor.requestTab}
        />
      </>
    )
  }

  return (
    <Section pad="none">
      <Container className="grid gap-5">
        {body}
        <ConfirmModal
          open={editor.pendingTab !== null}
          title="Buang perubahan?"
          description={`Ada isian yang belum disimpan. Kalau pindah ke tab ${
            editor.pendingTab ? tabLabel(editor.pendingTab) : ''
          }, perubahannya hilang.`}
          confirmLabel="Buang dan pindah"
          tone="danger"
          onClose={editor.cancelPending}
          onConfirm={editor.discardAndGo}
        />
      </Container>
    </Section>
  )
}
