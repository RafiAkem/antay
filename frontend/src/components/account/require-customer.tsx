import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useCustomer } from '@/lib/customer-session'
import type { Customer } from '@/types/catalog'
import { withNext } from './auth-rules'

type Props = {
  // Skeleton halamannya sendiri, supaya saat sesi masih dicek bentuk halaman sudah kelihatan.
  fallback: ReactNode
  children: (customer: Customer) => ReactNode
}

// Penjaga halaman milik pembeli. Keputusannya baru diambil setelah sesi selesai
// dicek; menolak lebih dulu bikin orang yang sudah masuk terlempar ke login.
// Ini cuma penjaga tampilan, server tetap mengecek sesi di setiap permintaan.
export function RequireCustomer({ fallback, children }: Props) {
  const { customer, loading } = useCustomer()
  const location = useLocation()

  if (loading) return <>{fallback}</>
  if (!customer) {
    return <Navigate to={withNext('/account/login', `${location.pathname}${location.search}`)} replace />
  }
  return <>{children(customer)}</>
}
