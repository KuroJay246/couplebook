import { ErrorState } from '../components/ErrorState'
import { useAuth } from './useAuth'
import { toUserFacingError } from '../services/userFacingError.js'

export function AuthorizationGate({
  title = 'Private access blocked',
  description = 'This authenticated account is not approved for the Couple Book workspace.',
}) {
  const { authError, signOut, user } = useAuth()

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-10">
      <main className="mx-auto max-w-3xl">
        <ErrorState
          actionLabel="Sign out"
          description={toUserFacingError(authError, description)}
          onAction={() => signOut()}
          title={title}
        >
          {user?.email ? <p className="mt-3 text-center text-xs text-[#8a6f7c]">Signed in as {user.email}</p> : null}
        </ErrorState>
      </main>
    </div>
  )
}
