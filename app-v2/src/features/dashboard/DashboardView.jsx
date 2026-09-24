import { CalendarHeart } from 'lucide-react'

function CompactDate({ milestones }) {
  const personalBirthday = milestones?.viewerBirthday || null
  const birthday = milestones?.birthdayCards?.[0] || null
  const anniversary = milestones?.anniversaryCards?.[0] || null
  const date = personalBirthday || birthday || anniversary

  return (
    <section className="cb-home-row">
      <div className="cb-home-row-icon"><CalendarHeart className="size-4" /></div>
      <div>
        <p className="cb-home-row-label">{personalBirthday ? 'Your birthday' : 'Next birthday'}</p>
        <h2>{personalBirthday ? 'Your birthday' : date?.label || 'Add an important date'}</h2>
        <p>{date?.countdownLabel || anniversary?.totalDaysLabel || 'Add dates from Us.'}</p>
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
          <h2>{model.hero?.coupleTitle || 'Home'}</h2>
          <p>{model.todayInUs?.currentMilestone || 'Your memories, dates, and plans in one place.'}</p>
        </div>
        <div className="cb-home-topline-actions">
          {timestampLabel ? (
            <div className="cb-home-clock" aria-label={`Current time ${timestampLabel}${dateLabel ? `, ${dateLabel}` : ''}`}>
              <span>{timestampLabel}</span>
              {dateLabel ? <small>{dateLabel}</small> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="cb-home-layout">
        <CompactDate milestones={model.milestones} />
      </div>
    </section>
  )
}
