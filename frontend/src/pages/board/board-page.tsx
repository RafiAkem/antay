import { BoardPanel } from '@/components/board/board-panel'
import {
  BoardError,
  BoardEventsError,
  BoardNoEvents,
  BoardNotFound,
  BoardSelectSkeleton,
  BoardSkeleton,
  BoardStale,
} from '@/components/board/board-states'
import { useBoardPage } from '@/components/board/use-board-page'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Select } from '@/components/ui/select'
import { Heading, Paragraph } from '@/components/ui/text'

export function BoardPage() {
  const page = useBoardPage()
  const ready = page.eventsState === 'ready' && page.events.length > 0

  return (
    <Section pad="sm" labelledBy="board-title">
      <Container size="wide" className="grid gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-1">
            <Heading level={1} id="board-title">
              Papan antrean
            </Heading>
            <Paragraph tone="muted">
              Untuk layar TV di area loket. Angkanya ikut berubah tiap 10 detik saat petugas melayani.
            </Paragraph>
          </div>
          {ready ? (
            <Select
              label="Event"
              value={page.eventId ?? ''}
              options={page.events.map((item) => ({ value: item.id, label: item.name }))}
              onChange={page.changeEvent}
              className="w-full sm:w-80"
            />
          ) : null}
        </div>

        {page.eventsState === 'error' ? (
          <BoardEventsError message={page.eventsError} onRetry={page.retryEvents} />
        ) : page.eventsState !== 'ready' ? (
          <>
            <BoardSelectSkeleton />
            <BoardSkeleton />
          </>
        ) : page.events.length === 0 ? (
          <BoardNoEvents />
        ) : page.board ? (
          <div className="grid gap-2">
            {page.boardError && !page.boardError.notFound ? <BoardStale at={page.board.now} /> : null}
            <BoardPanel data={page.board} />
          </div>
        ) : page.boardState === 'error' ? (
          page.boardError?.notFound ? (
            <BoardNotFound />
          ) : (
            <BoardError message={page.boardError?.message} onRetry={page.retryBoard} />
          )
        ) : (
          <BoardSkeleton />
        )}
      </Container>
    </Section>
  )
}
