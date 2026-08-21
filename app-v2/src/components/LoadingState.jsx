import { LoadingState as SharedLoadingState } from './ui/LoadingState.jsx'

export function LoadingState({
  title = 'Opening the private archive',
  description = 'Checking sign-in and preparing the protected shell.',
}) {
  return <SharedLoadingState message={`${title} - ${description}`} />
}
