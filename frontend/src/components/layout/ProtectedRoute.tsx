import { Navigate, useLocation } from 'react-router-dom'

import { AiOrb } from '../ui/AiOrb'
import { useAuth } from '../../store/authContext'

/**
 * Gate for authenticated pages.
 *
 * While the session is still being discovered we show an intentional loading
 * screen rather than bouncing the student to /login - otherwise a valid cookie
 * would flash a redirect on every reload.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <AiOrb size={96} />
          <p className="text-xs text-slate-500">Restoring your session…</p>
        </div>
      </div>
    )
  }

  if (status === 'anonymous') {
    // Remember where the student was headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
