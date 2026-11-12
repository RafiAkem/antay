import { ConfirmModal } from '../shared/confirm-modal'
import { OrganizerFormModal } from './organizer-form-modal'
import type { useOrganizersPage } from './use-organizers-page'

type Page = ReturnType<typeof useOrganizersPage>

// Semua modal halaman penyelenggara di satu tempat.
export function OrganizerDialogs({ page }: { page: Page }) {
  const target = page.toggling

  return (
    <>
      {/* key baru tiap dibuka supaya isian form selalu mulai dari data baris itu. */}
      {page.editor ? (
        <OrganizerFormModal
          key={page.editor.key}
          row={page.editor.row}
          onSaved={page.handleSaved}
          onClose={page.handleEditorClose}
        />
      ) : null}

      <ConfirmModal
        open={target !== null}
        title={target?.isActive ? `Nonaktifkan ${target.name}?` : `Aktifkan ${target?.name ?? ''}?`}
        description={
          target?.isActive
            ? 'Penyelenggara nonaktif tidak bisa dipilih saat membuat akun baru. Akun login dan event yang sudah ada tidak ikut berubah; nonaktifkan akunnya terpisah di halaman Akun bila perlu.'
            : 'Penyelenggara ini bisa dipilih lagi saat membuat akun penyelenggara.'
        }
        confirmLabel={target?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        tone={target?.isActive ? 'danger' : 'primary'}
        busy={page.toggleBusy}
        onConfirm={page.confirmToggle}
        onClose={page.cancelToggle}
      />
    </>
  )
}
