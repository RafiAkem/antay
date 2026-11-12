import { AdminPageHead } from '@/components/admin/shared/admin-page-head'
import { UserDialogs } from '@/components/admin/users/user-dialogs'
import { UserListSection } from '@/components/admin/users/user-list-section'
import { useUsersPage } from '@/components/admin/users/use-users-page'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'

export function UsersPage() {
  const page = useUsersPage()

  return (
    <Section pad="sm" labelledBy="users-title">
      <Container size="wide" className="grid gap-5">
        <AdminPageHead
          id="users-title"
          title="Akun internal"
          description="Akun petugas loket, penyelenggara, dan admin mal. Akun pembeli tidak tampil di sini."
          action={<Button onClick={page.openCreate}>Tambah akun</Button>}
        />
        <UserListSection page={page} />
      </Container>
      <UserDialogs page={page} />
    </Section>
  )
}
