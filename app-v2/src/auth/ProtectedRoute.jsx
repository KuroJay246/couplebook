import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { resolveProtectedRouteOutcome } from '../app/routeConfig'
import { LoadingState } from '../components/LoadingState'
import { AuthorizationGate } from './AuthorizationGate'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { user, loading, isAuthorized } = useAuth()
  const location = useLocation()
  const outcome = resolveProtectedRouteOutcome({
    pathname: location.pathname,
    isLoading: loading,
    user,
    isAuthorized,
  })

  if (outcome.type === 'loading') {
    return (
      <LoadingState
        title="Restoring your private route"
        description="Couple Book is confirming your approved session before this page opens."
      />
    )
  }

  if (outcome.type === 'redirect') {
    return <Navigate replace state={{ from: location }} to={outcome.to} />
  }

  if (outcome.type === 'blocked') {
    return <AuthorizationGate />
  }

  return <Outlet />
}
