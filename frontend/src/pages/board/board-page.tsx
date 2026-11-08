import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchBoard, fetchOpenEvents } from '@/lib/api'
import type { BoardData, EventDetail } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty } from '@/components/ui/pill'
import { Select } from '@/components/ui/select'
import { BoardPanel } from '@/components/board/board-panel'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export function BoardPage() {
  const [events, setEvents] = useState<EventDetail[]>([])
  const [eventsState, setEventsState] = useState<LoadState>('loading')
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [board, setBoard] = useState<BoardData | null>(null)
  const [boardState, setBoardState] = useState<LoadState>('idle')
  const [boardError, setBoardError] = useState<{ message: string; notFound: boolean } | null>(null)

  const loadEvents = useCallback(async () => {
    setEventsState('loading')
    setEventsError(null)
    try {
      const list = await fetchOpenEvents()
      setEvents(list)
      setEventId((prev) => (prev && list.some((item) => item.id === prev) ? prev : (list[0]?.id ?? null)))
      setEventsState('ready')
    } catch (cause) {
      setEventsState('error')
      setEventsError(cause instanceof ApiError ? cause.message : 'Daftar event gagal dimuat.')
    }
  }, [])

  const loadBoard = useCallback(async (id: string, quiet = false) => {
    if (!quiet) setBoardState('loading')
    try {
      const data = await fetchBoard(id)
      setBoard(data)
      setBoardState('ready')
      setBoardError(null)
    } catch (cause) {
      const notFound = cause instanceof ApiError && cause.status === 404
      setBoardState('error')
      setBoardError({
        message: cause instanceof ApiError ? cause.message : 'Data papan gagal dimuat.',
        notFound,
      })
      if (notFound) setBoard(null)
    }
  }, [])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  useEffect(() => {
    if (!eventId) return
    void loadBoard(eventId)
    const timer = window.setInterval(() => void loadBoard(eventId, true), 10_000)
    return () => window.clearInterval(timer)
  }, [eventId, loadBoard])

  function changeEvent(id: string) {
    setEventId(id)
    setBoard(null)
    setBoardError(null)
    setBoardState('loading')
  }

  return (
    <section className="grid gap-5">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">Papan antrean</h1>
        <p className="text-sm text-muted">
          Tampilan untuk layar TV di area loket. Angka ikut berubah saat petugas melayani.
        </p>
      </header>

      {eventsState === 'error' ? (
        <Card>
          <div className="grid justify-items-start gap-3">
            <b className="font-semibold">Daftar event gagal dimuat.</b>
            <p className="text-sm text-muted">{eventsError}</p>
            <Button onClick={() => void loadEvents()}>Coba lagi</Button>
          </div>
        </Card>
      ) : eventsState !== 'ready' ? (
        <div className="h-9 w-64 max-w-full animate-pulse rounded-[var(--radius-control)] bg-raised" role="status" aria-live="polite">
          <span className="sr-only">Memuat event...</span>
        </div>
      ) : events.length === 0 ? (
        <Empty
          title="Belum ada event hari ini."
          hint="Papan antrean menyala setelah penyelenggara membuka event."
          action={
            <a href="/" className="font-medium text-accent-ink hover:underline">
              Lihat halaman pengunjung
            </a>
          }
        />
      ) : (
        <div className="grid items-start gap-4">
          <Select
            label="Event"
            value={eventId ?? ''}
            options={events.map((item) => ({ value: item.id, label: item.name }))}
            onChange={changeEvent}
            className="max-w-sm"
          />

          {board ? (
            <div className="grid gap-2">
              {boardError && !boardError.notFound ? (
                <p className="rounded-[var(--radius-control)] bg-warning-bg px-4 py-2.5 text-[13px] text-warning-ink">
                  Data terakhir pukul {board.now}. Server belum bisa dihubungi, mencoba lagi...
                </p>
              ) : null}
              <BoardPanel data={board} />
            </div>
          ) : boardState === 'error' ? (
            boardError?.notFound ? (
              <Empty
                title="Event tidak tersedia."
                hint="Event ini sudah ditutup atau tidak ditemukan. Pilih event lain atau kembali ke halaman pengunjung."
                action={
                  <a href="/" className="font-medium text-accent-ink hover:underline">
                    Lihat event hari ini
                  </a>
                }
              />
            ) : (
              <Card>
                <div className="grid justify-items-start gap-3">
                  <b className="font-semibold">Papan antrean belum bisa dimuat.</b>
                  <p className="text-sm text-muted">{boardError?.message}</p>
                  <Button onClick={() => eventId && void loadBoard(eventId)}>Coba lagi</Button>
                </div>
              </Card>
            )
          ) : (
            <div className="h-[360px] animate-pulse rounded-[12px] bg-board" role="status" aria-live="polite">
              <span className="sr-only">Memuat papan antrean...</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
