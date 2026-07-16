import { Navigate, Route, Routes } from 'react-router-dom'
import { DEFAULT_AUTHENTICATED_PATH, LOGIN_PATH } from './routeConfig'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { AppShell } from '../layout/AppShell'
import { BirthdayPage } from '../pages/BirthdayPage'
import { ConfessionPage } from '../pages/ConfessionPage'
import { ContractPage } from '../pages/ContractPage'
import { DashboardPage } from '../pages/DashboardPage'
import { FavoritesPage } from '../pages/FavoritesPage'
import { GalleryPage } from '../pages/GalleryPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProfilePage } from '../pages/ProfilePage'
import { SettingsPage } from '../pages/SettingsPage'
import { TimelinePage } from '../pages/TimelinePage'
import { ValentinePage } from '../pages/ValentinePage'
import { CompatibilityProvider } from '../features/compatibility/CompatibilityProvider'

export function AppRoutes() {
  return (
    <Routes>
      <Route path={LOGIN_PATH} element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <CompatibilityProvider>
              <AppShell />
            </CompatibilityProvider>
          }
        >
          <Route index element={<Navigate replace to={DEFAULT_AUTHENTICATED_PATH} />} />
          <Route path={DEFAULT_AUTHENTICATED_PATH} element={<DashboardPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/contract" element={<ContractPage />} />
          <Route path="/birthday" element={<BirthdayPage />} />
          <Route path="/valentine" element={<ValentinePage />} />
          <Route path="/confession" element={<ConfessionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
