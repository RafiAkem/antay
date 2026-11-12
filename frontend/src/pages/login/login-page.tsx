import { Link, Navigate } from 'react-router-dom'
import { DemoLogin } from '@/components/account/demo-login'
import { BrandMark } from '@/components/navigation/icons'
import { Card } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Heading, Paragraph } from '@/components/ui/text'
import { StaffLoginForm } from './staff-login-form'
import { useStaffLogin } from './use-staff-login'

export function LoginPage() {
  const login = useStaffLogin()

  if (login.redirectTo) return <Navigate to={login.redirectTo} replace />

  return (
    <main className="grid min-h-dvh place-items-center bg-ground py-10">
      <Container size="narrow">
        {/* Form masuk cukup selebar satu kolom isian; lebih lebar malah susah dipindai. */}
        <div className="mx-auto grid w-full max-w-[420px] gap-5">
          <Link to="/" className="flex w-fit items-center gap-2.5" aria-label="SummaPass, ke beranda">
            <BrandMark />
            <b className="text-lg font-bold tracking-[-0.01em]">SummaPass</b>
          </Link>

          <Card>
            <div className="grid gap-1.5">
              <Heading level={1} size="lg">
                Masuk untuk petugas, penyelenggara, dan admin mal
              </Heading>
              <Paragraph tone="muted">
                Pakai akun yang dibuatkan admin mal. Setelah masuk, kamu langsung dibawa ke halaman kerja sesuai peran.
              </Paragraph>
            </div>
            <StaffLoginForm login={login} />
          </Card>

          <DemoLogin customerDestination="/events" />

          <div className="grid gap-2 text-center">
            <Link to="/account/login" className="text-sm font-semibold text-accent-ink hover:underline">
              Beli tiket? Masuk sebagai pembeli
            </Link>
          </div>
        </div>
      </Container>
    </main>
  )
}
