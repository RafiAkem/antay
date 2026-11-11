import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthCard } from '@/components/account/auth-card'
import { AuthFooterLink } from '@/components/account/auth-footer-link'
import { nextAfterAuth, withNext } from '@/components/account/auth-rules'
import { RegisterForm } from '@/components/account/register-form'
import { useCustomer } from '@/lib/customer-session'

export function RegisterPage() {
  const { customer, loading } = useCustomer()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = nextAfterAuth(params.get('next'))
  const destination = next ?? '/tickets'

  if (!loading && customer) return <Navigate to={destination} replace />

  return (
    <AuthCard
      title="Daftar akun"
      intro="Cukup sekali. Semua tiket yang kamu beli di Antay tersimpan di akun ini."
      footer={
        <AuthFooterLink prompt="Sudah punya akun?" to={withNext('/account/login', next)}>
          Masuk
        </AuthFooterLink>
      }
    >
      <RegisterForm onSuccess={() => navigate(destination, { replace: true })} />
    </AuthCard>
  )
}
