import { Link } from 'react-router-dom'
import { Container } from '@/components/ui/container'
import { Empty } from '@/components/ui/pill'
import { Section } from '@/components/ui/section'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewList } from '@/components/manage/reviews/review-list'
import { useReviewQueue } from '@/components/manage/reviews/use-review-queue'
import { LoadError } from '@/components/manage/shared/load-error'
import { PageHeading } from '@/components/manage/shared/page-heading'

export function ReviewQueuePage() {
  const queue = useReviewQueue()

  return (
    <Section pad="none">
      <Container className="grid gap-5">
        <PageHeading
          title="Persetujuan event"
          description="Event yang diajukan penyelenggara. Periksa harga, poster, dan jadwal, lalu setujui supaya tayang atau tolak dengan alasan."
        />

        {queue.loading ? (
          <div className="grid gap-2" role="status" aria-label="Memuat antrean">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-[88px] w-full rounded-card" />
            ))}
          </div>
        ) : queue.error ? (
          <LoadError message={queue.error} onRetry={queue.reload} />
        ) : queue.events.length === 0 ? (
          <Empty
            title="Tidak ada yang menunggu"
            hint="Semua pengajuan sudah ditinjau. Event baru muncul di sini begitu penyelenggara menekan Ajukan untuk tayang."
            action={
              <Link to="/manage/events" className="mt-1 text-sm font-semibold text-accent hover:underline">
                Lihat semua event
              </Link>
            }
          />
        ) : (
          <ReviewList events={queue.events} transition={queue.transition} />
        )}
      </Container>
    </Section>
  )
}
