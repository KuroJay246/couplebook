import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App'
import { AuthProvider } from './auth/AuthProvider'
import './styles/tokens.css'
import './styles/base.css'
import './styles/shell.css'
import './styles/navigation.css'
import './styles/controls.css'
import './styles/overlays.css'
import './styles/feedback.css'
import './styles/responsive.css'
import './styles/pages/home.css'
import './styles/pages/story.css'
import './styles/pages/album.css'
import './styles/pages/us.css'
import './styles/pages/plans.css'
import './styles/pages/more.css'
import './styles/pages/special-moments.css'
import './styles/pages/media-upload.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
