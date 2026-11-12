import { useMemo, useState } from 'react'
import type { CatalogEventDetail } from '@/types/catalog'
import { eventDateLabel } from '../event-format'
import { mediaItemsOf } from './media-items'
import { MediaLightbox } from './media-lightbox'
import { PosterPlaceholder } from './poster-placeholder'

// Poster 1:1 selebar layar di ponsel (menembus gutter), kartu biasa mulai sm.
// Di bawahnya strip thumbnail; ketuk mana pun membuka lightbox.
export function EventMedia({ event }: { event: CatalogEventDetail }) {
  const items = useMemo(() => mediaItemsOf(event), [event])
  const [open, setOpen] = useState<number | null>(null)
  const hasPoster = Boolean(event.posterUrl)

  return (
    <div className="grid content-start gap-2">
      <div className="-mx-gutter sm:mx-0">
        {hasPoster ? (
          <button
            type="button"
            onClick={() => setOpen(0)}
            aria-label={`Perbesar poster ${event.name}`}
            className="block w-full overflow-hidden bg-night sm:rounded-card"
          >
            <img
              src={event.posterUrl}
              alt={`Poster ${event.name}`}
              width={1080}
              height={1080}
              decoding="async"
              fetchPriority="high"
              className="aspect-square w-full object-cover"
            />
          </button>
        ) : (
          <PosterPlaceholder
            name={event.name}
            dateLabel={eventDateLabel(event.eventDate)}
            place={event.place}
            className="sm:rounded-card"
          />
        )}
      </div>

      {items.length > 1 || (!hasPoster && items.length > 0) ? (
        <ul aria-label="Galeri foto" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {items.map((item, index) => (
            <li key={`${item.url}-${index}`} className="flex-none">
              <button
                type="button"
                onClick={() => setOpen(index)}
                aria-label={`Buka foto ${index + 1}: ${item.alt}`}
                className="block h-16 w-16 overflow-hidden rounded-control border border-border-soft bg-night transition-colors hover:border-control"
              >
                <img
                  src={item.url}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <MediaLightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </div>
  )
}
