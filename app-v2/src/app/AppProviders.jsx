import { Outlet } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider.jsx'
import { ThemeProvider } from '../theme/ThemeProvider.jsx'

export function AppProviders() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Outlet />
      </ThemeProvider>
    </AuthProvider>
  )
}
