import { ErrorState } from '../components/ErrorState'
import { useAuth } from './useAuth'

export function AuthorizationGate({
  title = 'Private access blocked',
  description = 'This authenticated account is not approved for the Couple Book workspace.',
}) {
  const { authError, signOut, user } = useAuth()

  return (
    <div className="shell-root">
      <main className="shell-main shell-main-center">
        <ErrorState
          actionLabel="Sign out"
          description={authError || description}
          onAction={() => signOut()}
          title={title}
        >
          {user?.email && <p className="state-support">Signed in as {user.email}</p>}
        </ErrorState>
      </main>
    </div>
  )
}
