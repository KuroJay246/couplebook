import { Navigate, Route, Routes } from 'react-router-dom'
import { DEFAULT_AUTHENTICATED_PATH, LOGIN_PATH } from './routeConfig'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'

function FoundationPage() {
  return (
    <div className="shell-root">
      <main className="shell-main shell-main-center">
        <section className="hero-card">
          <span className="eyebrow">Migration Foundation</span>
          <h1>Couple Book v2 is scaffolded and isolated.</h1>
          <p>
            This app lives in <code>app-v2/</code> and will receive the routed auth shell in the next
            commit without touching the current static site.
          </p>
        </section>
      </main>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path={LOGIN_PATH} element={<LoginPage />} />
      <Route path="/" element={<Navigate to={DEFAULT_AUTHENTICATED_PATH} replace />} />
      <Route path={DEFAULT_AUTHENTICATED_PATH} element={<FoundationPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
