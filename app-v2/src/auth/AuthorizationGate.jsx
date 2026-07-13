import { ErrorState } from '../components/ErrorState'

export function AuthorizationGate({ title = 'Private access blocked', description = 'Authorization details will land in the next commit.' }) {
  return <ErrorState title={title} description={description} />
}
