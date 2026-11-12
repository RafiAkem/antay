import { BlockPanel } from './block-panel'
import { IdlePanel, SeatModePanel } from './panel-hints'
import { StagePanel } from './stage-panel'
import type { SeatWorkspaceState } from './use-seat-workspace'
import type { MapState } from './use-seat-map'

// Isi panel kanan mengikuti mode dan pilihan: kursi, panggung, blok, atau
// daftar blok bila belum ada yang dipilih.
export function EditorPanel({ ws, map }: { ws: SeatWorkspaceState; map: MapState }) {
  const { draft, actions, selectedBlock } = ws

  if (ws.mode === 'seats') return <SeatModePanel counts={ws.counts} saving={ws.seats.saving} />

  if (ws.selection?.kind === 'stage') {
    return (
      <StagePanel
        stage={map.layout.stage}
        canvasWidth={map.layout.canvasWidth}
        canvasHeight={map.layout.canvasHeight}
        busy={actions.busy === 'layout'}
        onSave={ws.onSaveStage}
      />
    )
  }

  if (selectedBlock && draft.form) {
    return (
      <BlockPanel
        block={selectedBlock}
        form={draft.form}
        issues={draft.issues}
        locked={ws.lockedIds.has(selectedBlock.id)}
        categories={ws.categoryOptions}
        preview={draft.preview}
        savedWarnings={actions.warnings[selectedBlock.id] ?? []}
        dirty={draft.dirty}
        valid={draft.spec !== null}
        busy={actions.busy}
        onChange={draft.update}
        onSave={() => void ws.onSaveBlock()}
        onReset={draft.reset}
        onDelete={() => ws.setPendingDelete(selectedBlock)}
      />
    )
  }

  return (
    <IdlePanel
      blocks={map.blocks}
      lockedIds={ws.lockedIds}
      hasSeatedCategory={ws.seated.length > 0}
      adding={actions.busy === 'create'}
      onSelect={(id) => ws.setSelection({ kind: 'block', id })}
      onAdd={ws.onAdd}
    />
  )
}
