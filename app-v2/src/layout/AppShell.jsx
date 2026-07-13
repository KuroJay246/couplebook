import { Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="shell-root">
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}
