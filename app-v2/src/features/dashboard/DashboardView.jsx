import { CalendarHeart, Images, NotebookPen, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button.jsx'

function AlbumLead() {
  return (
    <Link className="cb-home-lead has-media-reference" to="/gallery">
      <span className="cb-home-lead-label">Our archive</span>
      <span className="cb-home-lead-title">The moments we keep.</span>
      <span className="cb-home-lead-copy">Open the shared album to revisit photos, videos, and the stories around them.</span>
    </Link>
  )
}

function CompactDate({ milestones }) {
  const birthday = milestones?.birthdayCards?.[0] || null
  const anniversary = milestones?.anniversaryCards?.[0] || null
  const date = birthday || anniversary

  return (
    <section className="cb-home-row">
      <div className="cb-home-row-icon"><CalendarHeart className="size-4" /></div>
      <div>
        <p className="cb-home-row-label">Next date</p>
        <h2>{date?.label || 'Add an important date'}</h2>
        <p>{date?.countdownLabel || anniversary?.totalDaysLabel || 'Birthdays and anniversaries can be managed in Us.'}</p>
      </div>
    </section>
  )
}

function SpecialMoments({ section }) {
  const items = section.items || []
  return (
    <section className="cb-home-section">
      <div className="cb-home-section-header">
        <h2>Special moments</h2>
      </div>
      <div className="cb-home-link-grid">
        {items.map((item) => (
          <Link className="cb-home-soft-link" key={item.href} to={item.href}>{item.title}</Link>
        ))}
      </div>
    </section>
  )
}

export function DashboardView({ model }) {
  const timestampLabel = model.hero?.timestampLabel || ''
  const dateLabel = model.hero?.dateLabel || ''

  return (
    <section className="cb-home-redesign" data-route="dashboard">
      <div className="cb-home-topline">
        <div>
          <h2>Omia & Jaylan</h2>
          <p>{model.todayInUs?.currentMilestone || 'Your memories, dates, and plans in one place.'}</p>
        </div>
        <div className="cb-home-topline-actions">
          {timestampLabel ? (
            <div className="cb-home-clock" aria-label={`Current time ${timestampLabel}${dateLabel ? `, ${dateLabel}` : ''}`}>
              <span>{timestampLabel}</span>
              {dateLabel ? <small>{dateLabel}</small> : null}
            </div>
          ) : null}
          <PrimaryButton as={Link} className="cb-home-add-memory" to="/gallery">
            <Images className="size-4" />
            Open Album
          </PrimaryButton>
        </div>
      </div>

      <div className="cb-home-layout">
        <AlbumLead />
        <div className="cb-home-side">
          <CompactDate milestones={model.milestones} />
          <section className="cb-home-row">
            <div className="cb-home-row-icon"><NotebookPen className="size-4" /></div>
            <div>
              <p className="cb-home-row-label">Next plan</p>
              <h2>Plans</h2>
              <p>Save the next date, trip, gift, or idea.</p>
              <SecondaryButton as={Link} to="/plans">Open Plans</SecondaryButton>
            </div>
          </section>
          <section className="cb-home-row">
            <div className="cb-home-row-icon"><UsersRound className="size-4" /></div>
            <div>
              <p className="cb-home-row-label">Us</p>
              <h2>Profiles</h2>
              <p>Keep names, birthdays, relationship dates, and shared details tidy.</p>
              <SecondaryButton as={Link} to="/profile">Open Us</SecondaryButton>
            </div>
          </section>
        </div>
      </div>

      <div className="cb-home-bottom">
        <SpecialMoments section={model.specialMoments} />
      </div>
    </section>
  )
}
