import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthCard } from '@/components/account/auth-card'
import { AuthFooterLink } from '@/components/account/auth-footer-link'
import { DemoLogin } from '@/components/account/demo-login'
import { nextAfterAuth, withNext } from '@/components/account/auth-rules'
import { LoginForm } from '@/components/account/login-form'
import { useCustomer } from '@/lib/customer-session'

export function CustomerLoginPage() {
  const { customer, loading } = useCustomer()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = nextAfterAuth(params.get('next'))
  const destination = next ?? '/tickets'

  if (!loading && customer) return <Navigate to={destination} replace />

  return (
    <AuthCard
      title="Masuk"
      intro={
        next
          ? 'Masuk dulu untuk melanjutkan. Setelah itu kamu kembali ke halaman tadi.'
          : 'Masuk untuk membeli tiket dan membuka QR tiketmu.'
      }
      footer={
        <>
          <AuthFooterLink prompt="Belum punya akun?" to={withNext('/account/register', next)}>
            Daftar
          </AuthFooterLink>
          <AuthFooterLink prompt="Petugas atau penyelenggara?" to="/login">
            Masuk di sini
          </AuthFooterLink>
        </>
      }
    >
      <DemoLogin customerDestination={destination} className="mb-6" />
      <LoginForm onSuccess={() => navigate(destination, { replace: true })} />
    </AuthCard>
  )
}
