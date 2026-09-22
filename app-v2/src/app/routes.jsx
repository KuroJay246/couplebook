import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProviders } from './AppProviders.jsx'
import { DEFAULT_AUTHENTICATED_PATH, LOGIN_PATH } from './routeConfig'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { AppShell } from '../layout/AppShell'
import { MaintenanceGate } from '../maintenance/MaintenanceGate.jsx'
import { BirthdayPage } from '../pages/BirthdayPage'
import { ConfessionPage } from '../pages/ConfessionPage'
import { ContractPage } from '../pages/ContractPage'
import { DashboardPage } from '../pages/DashboardPage'
import { FavoritesPage } from '../pages/FavoritesPage'
import { GalleryPage } from '../pages/GalleryPage'
import { LoginPage } from '../pages/LoginPage'
import { MaintenancePage } from '../pages/MaintenancePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { PlansPage } from '../pages/PlansPage'
import { ProfilePage } from '../pages/ProfilePage'
import { SettingsPage } from '../pages/SettingsPage'
import { ValentinePage } from '../pages/ValentinePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/maintenance" element={<MaintenancePage />} />
      <Route path="/update" element={<MaintenancePage />} />
      <Route element={<MaintenanceGate />}>
        <Route element={<AppProviders />}>
          <Route path={LOGIN_PATH} element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate replace to={DEFAULT_AUTHENTICATED_PATH} />} />
              <Route path={DEFAULT_AUTHENTICATED_PATH} element={<DashboardPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/us" element={<Navigate replace to="/profile" />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/contract" element={<ContractPage />} />
              <Route path="/birthday" element={<BirthdayPage />} />
              <Route path="/valentine" element={<ValentinePage />} />
              <Route path="/confession" element={<ConfessionPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
