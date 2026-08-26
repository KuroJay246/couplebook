import { CalendarHeart, Clock3, HeartHandshake, Images, NotebookPen, Plus, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { PrimaryButton } from '../../components/ui/Button.jsx'

function RecentMemories({ section }) {
  const items = section.items || []

  return (
    <section className="rounded-[24px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Latest Chapter</p>
          <h2 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">Recent memories worth reopening</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cb-text-secondary)]">
            The newest moments stay close, with one quick path back to the wider story when you want it.
          </p>
        </div>
        <Link className="inline-flex min-h-10 items-center rounded-xl border border-[var(--cb-border)] px-4 text-xs font-bold text-[var(--cb-text-muted)] hover:bg-[var(--cb-accent-soft)]" to="/timeline">
          View All
        </Link>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.length > 0 ? items.map((item) => (
          <article className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface-raised)] p-4" key={item.id}>
            <span className="text-[11px] font-semibold text-[var(--cb-text-muted)]">{item.dateLabel || 'Saved memory'}</span>
            <h3 className="mt-2 text-base font-bold text-[var(--cb-text)]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">{item.description}</p>
          </article>
        )) : (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState title="No recent memories are ready yet." description="Add the next memory and it will surface here for quick return visits." />
          </div>
        )}
      </div>
    </section>
  )
}

function TodayInUs({ section }) {
  return (
    <section className="rounded-[24px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">{section.eyebrow}</p>
        <h2 className="mt-2 font-serif text-3xl text-[var(--cb-text)]">
          {section.daysTogether ? `${section.daysTogether} days together` : 'Your day starts here'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">{section.currentMilestone}</p>
      </div>
      {section.featured ? (
        <article className="mt-5 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface-raised)] p-4">
          <StatusBadge tone="info">Featured memory</StatusBadge>
          <h3 className="mt-3 text-lg font-bold text-[var(--cb-text)]">{section.featured.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">{section.featured.description}</p>
          <Link className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-[var(--cb-border)] px-4 text-xs font-bold text-[var(--cb-text-muted)] hover:bg-[var(--cb-accent-soft)]" to="/timeline">
            Open memory
          </Link>
        </article>
      ) : (
        <div className="mt-5">
          <EmptyState title="No featured memory yet." description="Add a memory or connect the archive to make Home feel more alive." />
        </div>
      )}
    </section>
  )
}

function OnThisDay({ section }) {
  return (
    <section className="rounded-[24px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">{section.eyebrow}</p>
      {section.memory ? (
        <>
          <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">{section.memory.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">{section.memory.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge tone="default">{section.memory.dateLabel}</StatusBadge>
            <Link className="inline-flex min-h-10 items-center rounded-xl border border-[var(--cb-border)] px-4 text-xs font-bold text-[var(--cb-text-muted)] hover:bg-[var(--cb-accent-soft)]" to="/timeline">
              Open Memory
            </Link>
          </div>
        </>
      ) : (
        <div className="mt-3">
          <EmptyState title={section.emptyState.title} description={section.emptyState.description} />
        </div>
      )}
    </section>
  )
}

function DailyPrompt({ section }) {
  return (
    <section className="rounded-[24px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]" aria-labelledby="daily-prompt-title">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">{section.eyebrow}</p>
      <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]" id="daily-prompt-title">{section.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">{section.description}</p>
      <div className="mt-4">
        <Link className="inline-flex min-h-10 items-center rounded-xl border border-[var(--cb-border)] px-4 text-xs font-bold text-[var(--cb-text-muted)] hover:bg-[var(--cb-accent-soft)]" to="/timeline">
          Save today as a memory
        </Link>
      </div>
    </section>
  )
}

function AnniversaryCard({ card }) {
  return (
    <div className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface-raised)] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-bold text-[var(--cb-text)]">{card.label}</span>
        <span className="text-xs text-[var(--cb-text-muted)]">{card.dateLabel || 'Date pending'}</span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="rounded-xl bg-[var(--cb-accent-soft)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--cb-text)]">{String(card.duration.years).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Yrs</div>
        </div>
        <div className="rounded-xl bg-[var(--cb-accent-soft)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--cb-text)]">{String(card.duration.months).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Mth</div>
        </div>
        <div className="rounded-xl bg-[var(--cb-accent-soft)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--cb-text)]">{String(card.duration.days).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Days</div>
        </div>
        <div className="rounded-xl bg-[var(--cb-accent-soft)] p-3 text-center">
          <div className="text-lg font-bold text-[var(--cb-text)]">{String(card.duration.seconds).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">Sec</div>
        </div>
      </div>
      <div className="mt-3 text-center text-xs text-[var(--cb-text-muted)]">{card.totalDaysLabel}</div>
    </div>
  )
}

function Milestones({ section }) {
  const anniversaries = section.anniversaryCards || []
  const birthdays = section.birthdayCards || []

  return (
    <div className="grid gap-6">
      <div className="rounded-[24px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Coming Up</p>
        <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">Dates worth holding close</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">Anniversaries and birthdays sit together as the next page markers.</p>
        <div className="mt-5 grid gap-3">
          {anniversaries.map((card) => (
            <AnniversaryCard card={card} key={card.id} />
          ))}
        </div>
      </div>
      <div className="rounded-[24px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Birthdays</p>
        <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">Upcoming birthdays</h3>
        <div className="mt-5 grid gap-3">
          {birthdays.map((card) => (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface-raised)] p-4" key={card.id}>
              <div>
                <div className="text-sm font-bold text-[var(--cb-text)]">{card.label}</div>
                <div className="text-xs text-[var(--cb-text-muted)]">{card.dateLabel || 'Date pending'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[var(--cb-accent)]">{card.countdownLabel}</div>
                <div className="text-xs text-[var(--cb-text-muted)]">{card.ageLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SpecialMoments({ section }) {
  return (
    <div className="rounded-[24px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Keep Exploring</p>
        <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">Private pages with their own feeling</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">Jump back into the birthday, Valentine, and confession spaces without digging through the full archive.</p>
      </div>
      <div className="mt-5 grid gap-3">
        {(section.items || []).map((item) => (
          <Link className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface-raised)] p-4 hover:bg-[var(--cb-accent-soft)]" key={item.href} to={item.href}>
            <div>
              <span className="block text-sm font-bold text-[var(--cb-text)]">{item.title}</span>
              <span className="mt-1 block text-sm leading-6 text-[var(--cb-text-secondary)]">{item.description}</span>
            </div>
            <span className="text-[var(--cb-accent)]">↗</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function RelationshipSummary({ model }) {
  const summary = [
    { label: 'Memories saved', value: model.recentMemories?.totalCount || 0 },
    { label: 'Special pages', value: (model.specialMoments?.items || []).length },
    { label: 'Birthday reminders', value: (model.milestones?.birthdayCards || []).length },
  ]

  return (
    <section className="rounded-[24px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Little Things</p>
      <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">The details that make it yours</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">A small count of what this book is already holding.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {summary.map((item) => (
          <div className="rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface-raised)] p-4" key={item.label}>
            <span className="block text-2xl font-bold text-[var(--cb-text)]">{item.value}</span>
            <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-[var(--cb-text-muted)]">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="inline-flex min-h-10 items-center rounded-xl bg-[var(--cb-accent)] px-4 text-xs font-bold text-white" to="/favorites">Favorite Things</Link>
        <Link className="inline-flex min-h-10 items-center rounded-xl border border-[var(--cb-border)] px-4 text-xs font-bold text-[var(--cb-text-muted)] hover:bg-[var(--cb-accent-soft)]" to="/contract">Our Promises</Link>
      </div>
    </section>
  )
}

export function DashboardView({ model }) {
  const featuredMemory = model.todayInUs?.featured
  const birthdayCard = model.milestones?.birthdayCards?.[0]

  return (
    <section className="grid gap-6">
      <section className="cb-editorial-hero rounded-[28px] border border-[var(--cb-border)] p-6 shadow-[0_10px_34px_rgba(84,53,67,0.06)] lg:p-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <div>
            <StatusBadge tone="info">Our space</StatusBadge>
            <h2 className="mt-4 max-w-xl font-serif text-4xl text-[var(--cb-text)] lg:text-5xl">Our memories, plans, and special moments in one place.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--cb-text-secondary)]">
              Start with the part of the relationship that still feels closest, then move into the album, the story, or what is coming up next.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PrimaryButton as={Link} className="cb-button-pill" to="/timeline">
                <span className="cb-button-pill-icon" aria-hidden="true">
                  <Plus className="size-4" />
                </span>
                Add memory
              </PrimaryButton>
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--cb-border)] px-4 text-xs font-bold text-[var(--cb-text-muted)] hover:bg-[var(--cb-accent-soft)]" to="/gallery">
                <Images className="size-4" />
                Open Album
              </Link>
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--cb-border)] px-4 text-xs font-bold text-[var(--cb-text-muted)] hover:bg-[var(--cb-accent-soft)]" to="/plans">
                <CalendarHeart className="size-4" />
                See plans
              </Link>
            </div>
          </div>
          <div className="cb-editorial-photo">
            <div className="cb-editorial-photo-grid">
              <div className="cb-editorial-photo-card ml-auto">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Featured memory</p>
                <p className="mt-2 text-lg font-semibold text-[var(--cb-text)]">{featuredMemory?.title || 'Your next favorite memory goes here'}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--cb-text-secondary)]">{featuredMemory?.description || 'Add one good photo, one honest note, or one saved video and Home will start feeling lived in.'}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="cb-editorial-photo-card">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Together</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--cb-text)]">{model.todayInUs?.daysTogether || 0}</p>
                  <p className="mt-1 text-sm text-[var(--cb-text-secondary)]">days together</p>
                </div>
                <div className="cb-editorial-photo-card">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Coming up</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--cb-text)]">{birthdayCard?.label || 'A saved date'}</p>
                  <p className="mt-1 text-sm text-[var(--cb-text-secondary)]">{birthdayCard?.countdownLabel || 'Add birthdays and plans to keep the next milestone close.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <TodayInUs section={model.todayInUs} />
        <OnThisDay section={model.onThisDay} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <RecentMemories section={model.recentMemories} />
        <div className="grid gap-6">
          <div className="rounded-[24px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Today</p>
            <div className="mt-3 flex items-center gap-3">
              <Clock3 className="size-5 text-[var(--cb-accent)]" />
              <div className="text-3xl font-bold text-[var(--cb-text)]">{model.hero.timestampLabel}</div>
            </div>
            <div className="mt-2 text-sm text-[var(--cb-text-secondary)]">{model.hero.dateLabel}</div>
          </div>
          <RelationshipSummary model={model} />
          <SpecialMoments section={model.specialMoments} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Milestones section={model.milestones} />
        <div className="grid gap-6">
          <DailyPrompt section={model.prompt} />
          <section className="rounded-[24px] border border-[var(--cb-border)] bg-[var(--cb-surface)] p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--cb-accent)]">Keep exploring</p>
            <h3 className="mt-2 font-serif text-2xl text-[var(--cb-text)]">Everything else is one step away</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link className="flex items-center gap-3 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface-raised)] p-4 hover:bg-[var(--cb-accent-soft)]" to="/timeline">
                <NotebookPen className="size-5 text-[var(--cb-accent)]" />
                <span className="text-sm font-bold text-[var(--cb-text)]">Story</span>
              </Link>
              <Link className="flex items-center gap-3 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface-raised)] p-4 hover:bg-[var(--cb-accent-soft)]" to="/gallery">
                <Images className="size-5 text-[var(--cb-accent)]" />
                <span className="text-sm font-bold text-[var(--cb-text)]">Album</span>
              </Link>
              <Link className="flex items-center gap-3 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface-raised)] p-4 hover:bg-[var(--cb-accent-soft)]" to="/profile">
                <HeartHandshake className="size-5 text-[var(--cb-accent)]" />
                <span className="text-sm font-bold text-[var(--cb-text)]">Us</span>
              </Link>
              <Link className="flex items-center gap-3 rounded-2xl border border-[var(--cb-border)] bg-[var(--cb-surface-raised)] p-4 hover:bg-[var(--cb-accent-soft)]" to="/plans">
                <CalendarHeart className="size-5 text-[var(--cb-accent)]" />
                <span className="text-sm font-bold text-[var(--cb-text)]">Plans</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}
