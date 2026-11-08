import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/app-layout'
import { PublicLayout } from '@/layouts/public-layout'
import { useSession } from '@/lib/session'
import type { Role } from '@/types/api'
import { AnalyticsPage } from '@/pages/analytics/analytics-page'
import { BoardPage } from '@/pages/board/board-page'
import { ForbiddenPage } from '@/pages/common/forbidden-page'
import { NotFoundPage } from '@/pages/common/not-found-page'
import { LoginPage } from '@/pages/login/login-page'
import { TicketDeskPage } from '@/pages/operational/ticket-desk-page'
import { VisitorPage } from '@/pages/visitor/visitor-page'

function LoadingShell() {
  return (
    <div className="grid min-h-screen place-items-center bg-ground" role="status" aria-live="polite">
      <div className="grid justify-items-center gap-3">
        <div className="h-2 w-24 animate-pulse rounded-full bg-tint-100" />
        <p className="text-[13px] text-muted">Memuat sesi...</p>
      </div>
    </div>
  )
}

function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user, loading } = useSession()
  if (loading) return <LoadingShell />
  if (!user) return <Navigate to="/masuk" replace />
  if (!roles.includes(user.role)) return <ForbiddenPage />
  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<VisitorPage />} />
        <Route path="/papan" element={<BoardPage />} />
      </Route>

      <Route path="/masuk" element={<LoginPage />} />

      <Route
        element={
          <RequireRole roles={['staff', 'admin']}>
            <AppLayout />
          </RequireRole>
        }
      >
        <Route path="/loket" element={<TicketDeskPage />} />
        <Route
          path="/dasbor"
          element={
            <RequireRole roles={['admin']}>
              <AnalyticsPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
