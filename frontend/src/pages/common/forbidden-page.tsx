import { LinkButton } from '@/components/admin/shared/link-button'
import { homeForRole } from '@/components/admin/shared/role-home'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Heading, Paragraph } from '@/components/ui/text'
import { useSession } from '@/lib/session'
import type { Role } from '@/types/api'

const ROLE_NAME: Record<Role, string> = {
  staff: 'petugas loket',
  organizer: 'penyelenggara',
  admin: 'admin mal',
}

// Dipakai sebagai guard konten di dalam AppLayout dan sebagai rute /403,
// jadi tidak memaksa tinggi layar penuh.
export function ForbiddenPage() {
  const { user } = useSession()

  return (
    <Section>
      <Container size="narrow">
        <div className="grid justify-items-start gap-4">
          <p aria-hidden="true" className="font-mono text-[56px] leading-none font-bold text-tint-200">
            403
          </p>
          <div className="grid gap-1.5">
            <Heading level={1}>Halaman ini bukan untuk akunmu</Heading>
            <Paragraph tone="muted">
              {user
                ? `Kamu masuk sebagai ${ROLE_NAME[user.role]} (${user.email}). Halaman ini hanya bisa dibuka peran lain.`
                : 'Sesi yang aktif tidak punya peran untuk membuka halaman ini.'}{' '}
              Kalau memang butuh akses, minta admin mal mengatur akunmu.
            </Paragraph>
          </div>
          <div className="flex flex-wrap gap-2">
            {user ? <LinkButton to={homeForRole(user.role)}>Ke halaman kerja saya</LinkButton> : null}
            <LinkButton to="/login" variant="ghost">
              Masuk dengan akun lain
            </LinkButton>
          </div>
        </div>
      </Container>
    </Section>
  )
}
