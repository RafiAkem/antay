import { Button } from '@/components/ui/button'
import { ListEmpty, ListError, ListSkeleton } from '../shared/list-states'
import { SearchInput } from '../shared/search-input'
import { OrganizerList } from './organizer-list'
import type { useOrganizersPage } from './use-organizers-page'

type Page = ReturnType<typeof useOrganizersPage>

export function OrganizerListSection({ page }: { page: Page }) {
  if (page.error) {
    return <ListError title="Daftar penyelenggara gagal dimuat" message={page.error} onRetry={page.retry} />
  }
  if (page.loading) return <ListSkeleton label="Memuat daftar penyelenggara" />

  if (page.rows.length === 0) {
    return (
      <ListEmpty
        title="Belum ada penyelenggara"
        hint="Tambahkan EO, klub, atau promotor yang menyewa tempat di mal. Setelah itu buatkan akunnya supaya mereka bisa menyusun event sendiri."
        action={<Button size="small" onClick={page.openCreate}>Tambah penyelenggara</Button>}
      />
    )
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={page.query}
          onChange={page.setQuery}
          placeholder="Cari nama, email, atau nomor"
          label="Cari penyelenggara"
        />
        <p className="num text-[13px] text-muted">
          {page.activeCount} aktif dari {page.rows.length} penyelenggara
        </p>
      </div>

      {page.visible.length === 0 ? (
        <ListEmpty
          title={`Tidak ada penyelenggara yang cocok dengan "${page.query.trim()}"`}
          hint="Cek ejaan, atau cari pakai email kontak atau beberapa digit nomor WhatsApp."
          action={
            <Button variant="ghost" size="small" onClick={() => page.setQuery('')}>
              Hapus pencarian
            </Button>
          }
        />
      ) : (
        <OrganizerList rows={page.visible} onEdit={page.openEdit} onToggle={page.askToggle} />
      )}
    </div>
  )
}
