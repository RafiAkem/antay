import { OrganizerDialogs } from '@/components/admin/organizers/organizer-dialogs'
import { OrganizerListSection } from '@/components/admin/organizers/organizer-list-section'
import { useOrganizersPage } from '@/components/admin/organizers/use-organizers-page'
import { AdminPageHead } from '@/components/admin/shared/admin-page-head'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'

export function OrganizersPage() {
  const page = useOrganizersPage()

  return (
    <Section pad="sm" labelledBy="organizers-title">
      <Container size="wide" className="grid gap-5">
        <AdminPageHead
          id="organizers-title"
          title="Penyelenggara"
          description="Pihak yang menyewa tempat dan menjual tiket lewat SummaPass. Penyelenggara nonaktif tidak bisa dipilih untuk akun baru."
          // Saat daftar kosong, tombol tambah sudah ada di empty state; jangan dobel.
          action={page.loading || page.rows.length > 0 ? <Button onClick={page.openCreate}>Tambah penyelenggara</Button> : null}
        />
        <OrganizerListSection page={page} />
      </Container>
      <OrganizerDialogs page={page} />
    </Section>
  )
}
