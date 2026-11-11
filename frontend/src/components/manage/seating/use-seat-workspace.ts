import { useCallback, useMemo, useState } from 'react'
import type { ManageSeat, ManageSeatStatus, SeatBlock, SeatStage } from '@/types/seating'
import type { SeatEditorCategory } from './seat-editor'
import { lockedBlockIds } from './seat-geometry'
import type { EditorMode, Selection } from './seating-labels'
import { useBlockActions } from './use-block-actions'
import { useBlockDraft } from './use-block-draft'
import type { CanvasBlockInput } from './use-canvas-pointer'
import type { MapState, SeatMapApi } from './use-seat-map'
import { useSeatToggle } from './use-seat-toggle'

type Options = {
  eventId: string
  categories: SeatEditorCategory[]
  seatMap: SeatMapApi
  map: MapState
  canEdit: boolean
}

const NO_SEATS: ManageSeat[] = []

export function useSeatWorkspace({ eventId, categories, seatMap, map, canEdit }: Options) {
  const [modeState, setMode] = useState<EditorMode>('layout')
  const [selectionState, setSelection] = useState<Selection>(null)
  const [pendingDelete, setPendingDelete] = useState<SeatBlock | null>(null)

  const mode: EditorMode = canEdit ? modeState : 'layout'
  const selection = canEdit ? selectionState : null
  const seated = useMemo(() => categories.filter((category) => category.isSeated), [categories])
  const categoryOptions = useMemo(() => seated.map((c) => ({ value: c.id, label: c.name })), [seated])
  const lockedIds = useMemo(() => lockedBlockIds(map.seatsByBlock), [map.seatsByBlock])

  const selectedBlock =
    selection?.kind === 'block' ? (map.blocks.find((block) => block.id === selection.id) ?? null) : null
  const selectedSeats = selectedBlock ? (map.seatsByBlock[selectedBlock.id] ?? NO_SEATS) : NO_SEATS

  const draft = useBlockDraft(eventId, mode === 'layout' ? selectedBlock : null, selectedSeats)
  const actions = useBlockActions({ eventId, seatMap, select: setSelection })
  const seats = useSeatToggle(eventId, seatMap, map)
  const { rotate } = actions
  const { sync } = draft

  // Blok yang sedang diedit digambar dari kursi pratinjau; sisanya dari server.
  const blocks: CanvasBlockInput[] = map.blocks.map((block) => {
    if (draft.previewDots && selectedBlock?.id === block.id) {
      return { block, seats: draft.previewDots, rotation: draft.previewRotation }
    }
    return { block, seats: map.seatsByBlock[block.id] ?? NO_SEATS, rotation: block.rotation }
  })

  const counts = useMemo(() => {
    const result: Record<ManageSeatStatus, number> = { available: 0, disabled: 0, held: 0, sold: 0 }
    for (const list of Object.values(map.seatsByBlock)) for (const seat of list) result[seat.status] += 1
    return result
  }, [map.seatsByBlock])

  const onRotateBlock = useCallback(
    (id: string, rotation: number) => {
      rotate(id, rotation)
      sync(id, { rotation })
    },
    [rotate, sync],
  )

  const onStageChange = (stage: SeatStage) => void actions.saveLayout({ ...map.layout, stage })
  const onCanvasSize = (canvasWidth: number, canvasHeight: number) =>
    void actions.saveLayout({ ...map.layout, canvasWidth, canvasHeight }, true)
  const onSaveStage = (stage: SeatStage) => void actions.saveLayout({ ...map.layout, stage }, true)

  const onAdd = () => {
    if (seated.length > 0) void actions.create(seated[0].id)
  }

  const onSaveBlock = async () => {
    if (!selectedBlock || !draft.spec) return
    const ready = draft.preview && !draft.preview.pending ? draft.toSeats(selectedBlock) : null
    const issues = await actions.save(selectedBlock, draft.spec, ready)
    if (issues === null) draft.reset()
    else draft.fail(selectedBlock.id, issues)
  }

  const onConfirmDelete = async (block: SeatBlock) => {
    if (await actions.remove(block)) {
      setPendingDelete(null)
      draft.reset()
    }
  }

  const saving = actions.syncing || seats.saving || actions.busy === 'layout'
  const hint =
    mode === 'layout'
      ? 'Seret blok untuk memindah, seret area kosong untuk menggeser kanvas, gulir untuk zoom. Blok terpilih bisa digeser dengan tombol panah.'
      : 'Klik kursi untuk mematikan atau menyalakan, seret kotak untuk banyak kursi. Geser kanvas dengan tombol tengah mouse atau tahan Spasi.'

  return {
    mode,
    setMode,
    selection,
    setSelection,
    seated,
    categoryOptions,
    lockedIds,
    selectedBlock,
    draft,
    actions,
    seats,
    blocks,
    counts,
    hint,
    status: saving ? 'Menyimpan perubahan...' : null,
    pendingDelete,
    setPendingDelete,
    onRotateBlock,
    onStageChange,
    onCanvasSize,
    onSaveStage,
    onAdd,
    onSaveBlock,
    onConfirmDelete,
  }
}

export type SeatWorkspaceState = ReturnType<typeof useSeatWorkspace>
