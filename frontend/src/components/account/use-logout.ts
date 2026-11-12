import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { useCustomer } from '@/lib/customer-session'

const ACCOUNT_ONLY = ['/account', '/tickets', '/orders']

// Keluar dari header dan dari halaman Akun lewat satu jalur. Kalau halaman
// yang sedang dibuka butuh akun, pindah ke beranda; kalau tidak, biarkan
// pembeli tetap di event yang sedang dilihat.
export function useLogout() {
  const { logout } = useCustomer()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)

  async function run() {
    if (busy) return
    setBusy(true)
    try {
      await logout()
      const path = location.pathname
      if (ACCOUNT_ONLY.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
        navigate('/', { replace: true })
      }
      toast.show('Kamu sudah keluar dari akun.', 'ok')
    } catch (cause) {
      toast.error(cause instanceof ApiError ? cause.message : 'Gagal keluar. Coba lagi sebentar lagi.')
    } finally {
      setBusy(false)
    }
  }

  return { busy, logout: run }
}
