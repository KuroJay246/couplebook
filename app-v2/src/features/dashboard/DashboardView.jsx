import { CalendarHeart, HeartHandshake, Images, NotebookPen, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { PrimaryButton, SecondaryButton } from '../../components/ui/Button.jsx'

function MemoryLead({ memory }) {
  if (!memory) {
    return (
      <section className="cb-home-lead cb-home-lead-empty">
        <EmptyState title="No featured memory yet." description="Add one memory to make Home feel alive." />
      </section>
    )
  }

  return (
    <Link className="cb-home-lead" to="/timeline">
      <span className="cb-home-lead-label">{memory.dateLabel || 'Recent memory'}</span>
      <span className="cb-home-lead-title">{memory.title}</span>
      <span className="cb-home-lead-copy">{memory.description}</span>
    </Link>
  )
}

function CompactDate({ milestones }) {
  const anniversary = milestones?.anniversaryCards?.[0] || null
  const birthday = milestones?.birthdayCards?.[0] || null
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

function RecentMemories({ section }) {
  const items = section.items || []
  if (items.length === 0) return null

  return (
    <section className="cb-home-section">
      <div className="cb-home-section-header">
        <h2>Recent memories</h2>
        <Link to="/timeline">Story</Link>
      </div>
      <div className="cb-home-memory-list">
        {items.slice(0, 3).map((item) => (
          <Link className="cb-home-memory-row" key={item.id} to="/timeline">
            <span>{item.dateLabel || 'Saved'}</span>
            <strong>{item.title}</strong>
          </Link>
        ))}
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
  const featuredMemory = model.todayInUs?.featured || model.recentMemories?.items?.[0] || null

  return (
    <section className="cb-home-redesign" data-route="dashboard">
      <div className="cb-home-topline">
        <div>
          <h2>Omia & Jaylan</h2>
          <p>{model.todayInUs?.currentMilestone || 'Your memories, dates, and plans in one place.'}</p>
        </div>
        <PrimaryButton as={Link} to="/timeline">
          <Plus className="size-4" />
          Add Memory
        </PrimaryButton>
      </div>

      <div className="cb-home-layout">
        <MemoryLead memory={featuredMemory} />
        <div className="cb-home-side">
          <CompactDate milestones={model.milestones} />
          <section className="cb-home-row">
            <div className="cb-home-row-icon"><Images className="size-4" /></div>
            <div>
              <p className="cb-home-row-label">Album</p>
              <h2>{model.recentMemories?.totalCount || 0} saved memories</h2>
              <p>Open the photo and video library.</p>
              <SecondaryButton as={Link} to="/gallery">Open Album</SecondaryButton>
            </div>
          </section>
          <section className="cb-home-row">
            <div className="cb-home-row-icon"><HeartHandshake className="size-4" /></div>
            <div>
              <p className="cb-home-row-label">Us</p>
              <h2>Profiles and dates</h2>
              <p>Manage birthdays, anniversaries, favorites, and notes.</p>
              <SecondaryButton as={Link} to="/profile">Open Us</SecondaryButton>
            </div>
          </section>
        </div>
      </div>

      <div className="cb-home-bottom">
        <RecentMemories section={model.recentMemories} />
        <section className="cb-home-section">
          <div className="cb-home-section-header">
            <h2>Plans</h2>
            <Link to="/plans">Open</Link>
          </div>
          <Link className="cb-home-plan-link" to="/plans">
            <NotebookPen className="size-4" />
            Save the next date, trip, gift, or idea.
          </Link>
        </section>
        <SpecialMoments section={model.specialMoments} />
      </div>
    </section>
  )
}
