import { Card, CardHead } from '@/components/ui/card'
import { PosterArt } from '../../shared/poster-art'
import { DropZone, UploadProgress } from './drop-zone'
import { MIN_SIDE } from './image-rules'

type PosterCardProps = {
  name: string
  eventDate: string
  posterUrl: string
  progress: number | null
  editable: boolean
  onFile: (file: File) => void
}

// Poster dipotong persegi di kartu event, jadi pratinjaunya juga persegi.
// Panduan potong ditulis di samping supaya penyelenggara tahu bagian mana yang aman.
export function PosterCard({ name, eventDate, posterUrl, progress, editable, onFile }: PosterCardProps) {
  return (
    <Card>
      <CardHead title="Poster" meta="Tampil di kartu event dan bagian atas halaman" />
      <div className="grid gap-4 sm:grid-cols-[240px_minmax(0,1fr)]">
        <div className="relative">
          <PosterArt size="card" name={name} eventDate={eventDate} posterUrl={posterUrl} />
          {/* Garis bantu area aman: teks penting sebaiknya di dalam kotak 80% tengah. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-[10%] rounded-tag border border-dashed border-board-ink/60" />
        </div>
        <div className="grid content-start gap-3">
          <ul className="grid gap-1.5 text-[13px] leading-[19px] text-muted">
            <li>Rasio 1:1. Gambar yang tidak persegi dipotong dari tengah.</li>
            <li>Taruh judul, wajah, dan logo di dalam garis putus-putus; tepinya bisa terpotong di layar kecil.</li>
            <li>
              Minimal {MIN_SIDE}x{MIN_SIDE} px, disarankan 1200x1200 px. JPG, PNG, atau WebP, paling besar 5 MB.
            </li>
          </ul>
          {editable ? (
            <DropZone label="Pilih poster" disabled={progress !== null} onFile={onFile} className="min-h-[112px] p-4">
              {progress !== null ? (
                <UploadProgress percent={progress} />
              ) : (
                <span className="grid gap-1">
                  <span className="text-sm font-semibold text-accent">{posterUrl ? 'Ganti poster' : 'Pilih poster'}</span>
                  <span className="text-xs text-muted">atau seret berkas gambar ke sini</span>
                </span>
              )}
            </DropZone>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
