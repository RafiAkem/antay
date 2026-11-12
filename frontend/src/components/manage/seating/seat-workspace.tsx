import { cn } from '@/components/ui/cn'
import { BuyerView } from './buyer-view'
import { DeleteBlockModal } from './delete-block-modal'
import { EditorPanel } from './editor-panel'
import { EditorToolbar } from './editor-toolbar'
import { SeatCanvas } from './seat-canvas'
import type { SeatEditorCategory } from './seat-editor'
import { SeatNotice } from './seat-notice'
import { SummaryBar } from './summary-bar'
import type { MapState, SeatMapApi } from './use-seat-map'
import { useSeatWorkspace } from './use-seat-workspace'

type Props = {
  eventId: string
  categories: SeatEditorCategory[]
  seatMap: SeatMapApi
  map: MapState
  canEdit: boolean
  note: string | null
}

const CANVAS_HEIGHT = 'h-[clamp(420px,68dvh,780px)]'

export function SeatWorkspace({ eventId, categories, seatMap, map, canEdit, note }: Props) {
  const ws = useSeatWorkspace({ eventId, categories, seatMap, map, canEdit })
  const { actions } = ws

  const summary = (
    <SummaryBar
      categories={ws.seated}
      blocks={map.blocks}
      seatsByBlock={map.seatsByBlock}
      layout={map.layout}
      canEdit={canEdit}
      busy={actions.busy === 'layout'}
      onCanvasSize={ws.onCanvasSize}
    />
  )

  if (!canEdit) {
    return (
      <div className="grid gap-3">
        {note ? <SeatNotice tone="info">{note}</SeatNotice> : null}
        <BuyerView map={map} />
        {summary}
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {note ? <SeatNotice tone="info">{note}</SeatNotice> : null}
      <EditorToolbar
        mode={ws.mode}
        canAdd={ws.seated.length > 0}
        adding={actions.busy === 'create'}
        status={ws.status}
        onMode={ws.setMode}
        onAdd={ws.onAdd}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-3">
        <div className={CANVAS_HEIGHT}>
          <SeatCanvas
            layout={map.layout}
            blocks={ws.blocks}
            mode={ws.mode}
            readOnly={false}
            selection={ws.selection}
            lockedIds={ws.lockedIds}
            hint={ws.hint}
            onSelect={ws.setSelection}
            onMoveBlock={actions.move}
            onNudgeBlock={actions.nudge}
            onRotateBlock={ws.onRotateBlock}
            onStageChange={ws.onStageChange}
            onSeatsPicked={ws.seats.toggle}
          />
        </div>
        <aside
          aria-label="Pengaturan denah"
          className={cn(CANVAS_HEIGHT, 'overflow-y-auto rounded-card border border-border-soft bg-surface p-4')}
        >
          <EditorPanel ws={ws} map={map} />
        </aside>
      </div>
      {summary}
      <DeleteBlockModal
        block={ws.pendingDelete}
        busy={actions.busy === 'delete'}
        onCancel={() => ws.setPendingDelete(null)}
        onConfirm={(block) => void ws.onConfirmDelete(block)}
      />
    </div>
  )
}
