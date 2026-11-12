import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/app-layout'
import { PublicLayout } from '@/layouts/public-layout'
import { useSession } from '@/lib/session'
import type { Role } from '@/types/api'
import { AccountPage } from '@/pages/account/account-page'
import { CustomerLoginPage } from '@/pages/account/login-page'
import { RegisterPage } from '@/pages/account/register-page'
import { EventDetailPage } from '@/pages/events/detail/event-detail-page'
import { EventsPage } from '@/pages/events/events-page'
import { HomePage } from '@/pages/home/home-page'
import { ForbiddenPage } from '@/pages/common/forbidden-page'
import { NotFoundPage } from '@/pages/common/not-found-page'
import { LoginPage } from '@/pages/login/login-page'
import { OrderPage } from '@/pages/tickets/order-page'
import { TicketsPage } from '@/pages/tickets/tickets-page'

// Halaman internal, checkout, dan papan dimuat terpisah. Pengunjung yang cuma
// melihat-lihat event tidak perlu ikut mengunduh editor denah atau dasbor.
const CheckoutPage = lazy(() => import('@/pages/checkout/checkout-page').then((m) => ({ default: m.CheckoutPage })))
const CounterPage = lazy(() => import('@/pages/counter/counter-page').then((m) => ({ default: m.CounterPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })))
const BoardPage = lazy(() => import('@/pages/board/board-page').then((m) => ({ default: m.BoardPage })))
const EventEditorPage = lazy(() => import('@/pages/manage/detail/event-editor-page').then((m) => ({ default: m.EventEditorPage })))
const ManageEventsPage = lazy(() => import('@/pages/manage/events/manage-events-page').then((m) => ({ default: m.ManageEventsPage })))
const ReviewQueuePage = lazy(() => import('@/pages/manage/reviews/review-queue-page').then((m) => ({ default: m.ReviewQueuePage })))
const OrganizersPage = lazy(() => import('@/pages/admin/organizers/organizers-page').then((m) => ({ default: m.OrganizersPage })))
const UsersPage = lazy(() => import('@/pages/admin/users/users-page').then((m) => ({ default: m.UsersPage })))

function LoadingShell() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ground" role="status" aria-live="polite">
      <div className="grid justify-items-center gap-3">
        <div className="h-2 w-24 animate-pulse rounded-pill bg-tint-100" />
        <p className="text-[13px] text-muted">Memuat...</p>
      </div>
    </div>
  )
}

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useSession()
  if (loading) return <LoadingShell />
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <ForbiddenPage />
  return <>{children}</>
}

// Gerbang peran di dalam AppLayout. Sesi sudah dipastikan ada oleh RequireRole
// di luar, jadi di sini cukup cek perannya.
function Only({ roles, children }: { roles: Role[]; children: ReactNode }) {
  return <RequireRole roles={roles}>{children}</RequireRole>
}

export function App() {
  return (
    <Suspense fallback={<LoadingShell />}>
    <Routes>
      {/* Beranda dibuka foto hero full-bleed, jadi header-nya transparan. */}
      <Route element={<PublicLayout hero />}>
        <Route path="/" element={<HomePage />} />
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route path="/events/:eventId/checkout" element={<CheckoutPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/orders/:orderId" element={<OrderPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/login" element={<CustomerLoginPage />} />
        <Route path="/account/register" element={<RegisterPage />} />
        <Route path="/board" element={<BoardPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireRole roles={['staff', 'admin', 'organizer']}>
            <AppLayout />
          </RequireRole>
        }
      >
        <Route path="/counter" element={<Only roles={['staff', 'admin']}><CounterPage /></Only>} />
        <Route path="/dashboard" element={<Only roles={['admin']}><DashboardPage /></Only>} />
        <Route path="/manage/events" element={<Only roles={['organizer', 'admin']}><ManageEventsPage /></Only>} />
        <Route path="/manage/events/:eventId" element={<Only roles={['organizer', 'admin']}><EventEditorPage /></Only>} />
        <Route path="/manage/reviews" element={<Only roles={['admin']}><ReviewQueuePage /></Only>} />
        <Route path="/admin/organizers" element={<Only roles={['admin']}><OrganizersPage /></Only>} />
        <Route path="/admin/users" element={<Only roles={['admin']}><UsersPage /></Only>} />
      </Route>

      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  )
}
