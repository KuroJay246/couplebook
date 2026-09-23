import { Link } from 'react-router-dom'
import { ErrorState } from '../components/ui/ErrorState.jsx'
import { LoadingState } from '../components/ui/LoadingState.jsx'
import { useSpecialMomentContent } from '../features/specialMoments/useSpecialMomentContent.js'

export function BirthdayPage() {
  const { model, refreshCompatibility } = useSpecialMomentContent('birthday')

  if (model.status === 'loading') {
    return <LoadingState message="Loading birthday..." />
  }

  if (!['ready', 'partial'].includes(model.status) || !model.moment) {
    return (
      <ErrorState
        title="Birthday page unavailable"
        message="The birthday chapter could not be loaded for this approved session."
        onRetry={refreshCompatibility}
      />
    )
  }

  const title = model.moment.title || 'Happy Birthday Omia My Love'
  const subtitle = 'With all my heart ♥'

  return (
    <section className="special-moment-page special-birthday-page" data-route="birthday">
      <div className="special-moment-utility">
        <Link className="special-moment-link" to="/dashboard">Back to Home</Link>
        <Link className="special-moment-link subtle" to="/gallery">Open Album</Link>
      </div>

      <div className="birthday-canvas">
        <div className="birthday-card">
          <div className="birthday-card-inner">
            <svg className="birthday-legacy-cake" viewBox="0 0 260 220" xmlns="http://www.w3.org/2000/svg" aria-label="Animated birthday cake">
              <defs>
                <linearGradient id="birthdayCakeGrad1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#d9a6ff" />
                  <stop offset="1" stopColor="#8b3ebd" />
                </linearGradient>
                <linearGradient id="birthdayCakeGrad2" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#f3d9ff" />
                  <stop offset="1" stopColor="#c084fc" />
                </linearGradient>
                <linearGradient id="birthdayCakeGrad3" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#fff0ff" />
                  <stop offset="1" stopColor="#f0abfc" />
                </linearGradient>
                <linearGradient id="birthdayFrostGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.8" />
                  <stop offset="1" stopColor="#fff" stopOpacity="1" />
                </linearGradient>
              </defs>
              <g className="birthday-layer birthday-bottom">
                <rect x="30" y="150" width="200" height="40" rx="16" fill="url(#birthdayCakeGrad1)" />
                <path className="birthday-frosting" d="M30 150 q100 -25 200 0" fill="url(#birthdayFrostGrad)" />
                <circle className="birthday-sprinkle" cx="60" cy="170" r="4" />
                <circle className="birthday-sprinkle" cx="90" cy="180" r="3" />
                <circle className="birthday-sprinkle" cx="120" cy="165" r="3" />
                <circle className="birthday-sprinkle" cx="170" cy="175" r="4" />
                <circle className="birthday-sprinkle" cx="200" cy="160" r="3" />
              </g>
              <g className="birthday-layer birthday-middle">
                <rect x="50" y="110" width="160" height="35" rx="14" fill="url(#birthdayCakeGrad2)" />
                <path className="birthday-frosting" d="M50 110 q80 -20 160 0" fill="url(#birthdayFrostGrad)" />
                <circle className="birthday-sprinkle" cx="70" cy="130" r="2.5" />
                <circle className="birthday-sprinkle" cx="110" cy="120" r="2.5" />
                <circle className="birthday-sprinkle" cx="150" cy="125" r="2.5" />
                <circle className="birthday-sprinkle" cx="190" cy="115" r="2.5" />
              </g>
              <g className="birthday-layer birthday-top">
                <rect x="80" y="75" width="100" height="30" rx="12" fill="url(#birthdayCakeGrad3)" />
                <path className="birthday-frosting" d="M80 75 q50 -15 100 0" fill="url(#birthdayFrostGrad)" />
                <circle className="birthday-sprinkle" cx="100" cy="90" r="2" />
                <circle className="birthday-sprinkle" cx="130" cy="85" r="2" />
                <circle className="birthday-sprinkle" cx="160" cy="95" r="2" />
                <circle className="birthday-cherry" cx="130" cy="72" r="7" />
                <rect className="birthday-cherry" x="128" y="62" width="4" height="12" rx="2" />
              </g>
              <rect className="birthday-candle birthday-candle-main" x="125" y="45" width="10" height="35" rx="3" />
              <rect className="birthday-candle birthday-candle-two" x="110" y="50" width="8" height="28" rx="2.5" />
              <rect className="birthday-candle birthday-candle-three" x="142" y="52" width="7" height="25" rx="2" />
              <ellipse className="birthday-flame" cx="130" cy="38" rx="7" ry="10" />
              <ellipse className="birthday-flame birthday-flame-two" cx="114" cy="42" rx="5" ry="7" />
              <ellipse className="birthday-flame birthday-flame-three" cx="145" cy="44" rx="4" ry="6" />
              <ellipse className="birthday-plate" cx="130" cy="195" rx="110" ry="15" />
              <text x="130" y="100" textAnchor="middle" fontFamily="Poppins, sans-serif" fontSize="13" fill="#a87bdc" opacity="0.85">Omia</text>
            </svg>
            <div className="birthday-greeting">{title}</div>
            <p className="birthday-legacy-subtitle">{subtitle}</p>
          </div>

          <div className="birthday-confetti" aria-hidden="true">
            <span style={{ left: '8%', top: '12%', background: '#d8b4fe', animationDelay: '0s' }} />
            <span style={{ left: '20%', top: '10%', background: '#a78bfa', animationDelay: '0.2s' }} />
            <span style={{ left: '78%', top: '18%', background: '#c084fc', animationDelay: '0.4s' }} />
            <span style={{ left: '54%', top: '6%', background: '#f0abfc', animationDelay: '0.8s' }} />
            <span style={{ left: '40%', top: '0%', background: '#fde68a', animationDelay: '1.2s' }} />
            <span style={{ left: '70%', top: '5%', background: '#bbf7d0', animationDelay: '1.5s' }} />
          </div>
        </div>
      </div>
    </section>
  )
}
