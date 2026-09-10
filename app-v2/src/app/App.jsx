import { AppRoutes } from './routes'
import { PwaStatus } from '../pwa/PwaStatus.jsx'

export default function App() {
  return (
    <>
      <PwaStatus />
      <AppRoutes />
    </>
  )
}
