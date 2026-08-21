import { CalendarHeart, Clock3, HeartHandshake, Images, NotebookPen, Sparkles, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'

function RecentMemories({ section }) {
  const items = section.items || []

  return (
    <section className="rounded-[24px] border border-[#ead7df] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Latest Chapter</p>
          <h2 className="mt-2 font-serif text-3xl text-[#24131d]">Recent memories worth reopening</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7a6170]">
            The newest moments stay close, with one quick path back to the wider story when you want it.
          </p>
        </div>
        <Link className="inline-flex min-h-10 items-center rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/timeline">
          View All
        </Link>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.length > 0 ? items.map((item) => (
          <article className="rounded-2xl border border-[#ead7df] bg-[#fffdfd] p-4" key={item.id}>
            <span className="text-[11px] font-semibold text-[#8a6f7c]">{item.dateLabel || 'Saved memory'}</span>
            <h3 className="mt-2 text-base font-bold text-[#24131d]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#7a6170]">{item.description}</p>
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
    <section className="rounded-[24px] border border-[#ead7df] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">{section.eyebrow}</p>
        <h2 className="mt-2 font-serif text-3xl text-[#24131d]">
          {section.daysTogether ? `${section.daysTogether} days together` : 'Your day starts here'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#7a6170]">{section.currentMilestone}</p>
      </div>
      {section.featured ? (
        <article className="mt-5 rounded-2xl border border-[#ead7df] bg-[#fffdfd] p-4">
          <StatusBadge tone="info">Featured memory</StatusBadge>
          <h3 className="mt-3 text-lg font-bold text-[#24131d]">{section.featured.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#7a6170]">{section.featured.description}</p>
          <Link className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/timeline">
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
    <section className="rounded-[24px] border border-[#ead7df] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">{section.eyebrow}</p>
      {section.memory ? (
        <>
          <h3 className="mt-2 font-serif text-2xl text-[#24131d]">{section.memory.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#7a6170]">{section.memory.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge tone="default">{section.memory.dateLabel}</StatusBadge>
            <Link className="inline-flex min-h-10 items-center rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/timeline">
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
    <section className="rounded-[24px] border border-[#ead7df] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]" aria-labelledby="daily-prompt-title">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">{section.eyebrow}</p>
      <h3 className="mt-2 font-serif text-2xl text-[#24131d]" id="daily-prompt-title">{section.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#7a6170]">{section.description}</p>
      <div className="mt-4">
        <StatusBadge tone="warning">Answer saving planned for V1.3</StatusBadge>
      </div>
    </section>
  )
}

function AnniversaryCard({ card }) {
  return (
    <div className="rounded-2xl border border-[#ead7df] bg-[#fffdfd] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-bold text-[#24131d]">{card.label}</span>
        <span className="text-xs text-[#8a6f7c]">{card.dateLabel || 'Date pending'}</span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <div className="rounded-xl bg-[#fff5f8] p-3 text-center">
          <div className="text-lg font-bold text-[#24131d]">{String(card.duration.years).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-[#8a6f7c]">Yrs</div>
        </div>
        <div className="rounded-xl bg-[#fff5f8] p-3 text-center">
          <div className="text-lg font-bold text-[#24131d]">{String(card.duration.months).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-[#8a6f7c]">Mth</div>
        </div>
        <div className="rounded-xl bg-[#fff5f8] p-3 text-center">
          <div className="text-lg font-bold text-[#24131d]">{String(card.duration.days).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-[#8a6f7c]">Days</div>
        </div>
        <div className="rounded-xl bg-[#fff5f8] p-3 text-center">
          <div className="text-lg font-bold text-[#24131d]">{String(card.duration.seconds).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-[#8a6f7c]">Sec</div>
        </div>
      </div>
      <div className="mt-3 text-center text-xs text-[#8a6f7c]">{card.totalDaysLabel}</div>
    </div>
  )
}

function Milestones({ section }) {
  const anniversaries = section.anniversaryCards || []
  const birthdays = section.birthdayCards || []

  return (
    <div className="grid gap-6">
      <div className="rounded-[24px] border border-[#ead7df] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Coming Up</p>
        <h3 className="mt-2 font-serif text-2xl text-[#24131d]">Dates worth holding close</h3>
        <p className="mt-2 text-sm leading-6 text-[#7a6170]">Anniversaries and birthdays sit together as the next page markers.</p>
        <div className="mt-5 grid gap-3">
          {anniversaries.map((card) => (
            <AnniversaryCard card={card} key={card.id} />
          ))}
        </div>
      </div>
      <div className="rounded-[24px] border border-[#ead7df] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Birthdays</p>
        <h3 className="mt-2 font-serif text-2xl text-[#24131d]">Upcoming birthdays</h3>
        <div className="mt-5 grid gap-3">
          {birthdays.map((card) => (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#ead7df] bg-[#fffdfd] p-4" key={card.id}>
              <div>
                <div className="text-sm font-bold text-[#24131d]">{card.label}</div>
                <div className="text-xs text-[#8a6f7c]">{card.dateLabel || 'Date pending'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#8f5168]">{card.countdownLabel}</div>
                <div className="text-xs text-[#8a6f7c]">{card.ageLabel}</div>
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
    <div className="rounded-[24px] border border-[#ead7df] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Keep Exploring</p>
        <h3 className="mt-2 font-serif text-2xl text-[#24131d]">Private pages with their own feeling</h3>
        <p className="mt-2 text-sm leading-6 text-[#7a6170]">Jump back into the birthday, Valentine, and confession spaces without digging through the full archive.</p>
      </div>
      <div className="mt-5 grid gap-3">
        {(section.items || []).map((item) => (
          <Link className="flex items-start justify-between gap-3 rounded-2xl border border-[#ead7df] bg-[#fffdfd] p-4 hover:bg-[#fff5f8]" key={item.href} to={item.href}>
            <div>
              <span className="block text-sm font-bold text-[#24131d]">{item.title}</span>
              <span className="mt-1 block text-sm leading-6 text-[#7a6170]">{item.description}</span>
            </div>
            <span className="text-[#8f5168]">↗</span>
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
    <section className="rounded-[24px] border border-[#ead7df] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Little Things</p>
      <h3 className="mt-2 font-serif text-2xl text-[#24131d]">The details that make it yours</h3>
      <p className="mt-2 text-sm leading-6 text-[#7a6170]">A small count of what this book is already holding.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {summary.map((item) => (
          <div className="rounded-2xl border border-[#ead7df] bg-[#fffdfd] p-4" key={item.label}>
            <span className="block text-2xl font-bold text-[#24131d]">{item.value}</span>
            <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-[#8a6f7c]">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="inline-flex min-h-10 items-center rounded-xl bg-[#8f5168] px-4 text-xs font-bold text-white" to="/favorites">Favorite Things</Link>
        <Link className="inline-flex min-h-10 items-center rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/contract">Our Promises</Link>
      </div>
    </section>
  )
}

export function DashboardView({ model }) {
  return (
    <section className="grid gap-6">
      <section className="rounded-[24px] border border-[#ead7df] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <div>
            <StatusBadge tone="info">Shared home</StatusBadge>
            <h2 className="mt-4 font-serif text-4xl text-[#24131d]">Pick up where your story left off.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#7a6170]">
              This private home opens like the first page of your memory book: recent moments first, upcoming dates close behind, and the sentimental pages always within reach.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#8f5168] px-4 text-xs font-bold text-white" to="/timeline">
                <NotebookPen className="size-4" />
                Continue The Story
              </Link>
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/gallery">
                <Images className="size-4" />
                Open Album
              </Link>
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dcc2cd] px-4 text-xs font-bold text-[#6f5462] hover:bg-[#fff5f8]" to="/favorites">
                <Star className="size-4" />
                Favorite Things
              </Link>
            </div>
          </div>
          <div className="grid gap-3 rounded-[24px] bg-[#fff5f8] p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-[#8f5168]" />
              <span className="text-sm font-bold text-[#24131d]">Warm, private, and personal</span>
            </div>
            <div className="grid gap-2">
              <StatusBadge tone="default">Recent memories first</StatusBadge>
              <StatusBadge tone="default">Upcoming dates stay visible</StatusBadge>
              <StatusBadge tone="default">Special pages stay close</StatusBadge>
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
          <div className="rounded-[24px] border border-[#ead7df] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Today</p>
            <div className="mt-3 flex items-center gap-3">
              <Clock3 className="size-5 text-[#8f5168]" />
              <div className="text-3xl font-bold text-[#24131d]">{model.hero.timestampLabel}</div>
            </div>
            <div className="mt-2 text-sm text-[#7a6170]">{model.hero.dateLabel}</div>
          </div>
          <RelationshipSummary model={model} />
          <SpecialMoments section={model.specialMoments} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Milestones section={model.milestones} />
        <div className="grid gap-6">
          <DailyPrompt section={model.prompt} />
          <section className="rounded-[24px] border border-[#ead7df] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f5168]">Keep Exploring</p>
            <h3 className="mt-2 font-serif text-2xl text-[#24131d]">The rest of the book stays one step away</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link className="flex items-center gap-3 rounded-2xl border border-[#ead7df] bg-[#fffdfd] p-4 hover:bg-[#fff5f8]" to="/timeline">
                <NotebookPen className="size-5 text-[#8f5168]" />
                <span className="text-sm font-bold text-[#24131d]">Memories Book</span>
              </Link>
              <Link className="flex items-center gap-3 rounded-2xl border border-[#ead7df] bg-[#fffdfd] p-4 hover:bg-[#fff5f8]" to="/gallery">
                <Images className="size-5 text-[#8f5168]" />
                <span className="text-sm font-bold text-[#24131d]">Media Album</span>
              </Link>
              <Link className="flex items-center gap-3 rounded-2xl border border-[#ead7df] bg-[#fffdfd] p-4 hover:bg-[#fff5f8]" to="/profile">
                <HeartHandshake className="size-5 text-[#8f5168]" />
                <span className="text-sm font-bold text-[#24131d]">Us</span>
              </Link>
              <Link className="flex items-center gap-3 rounded-2xl border border-[#ead7df] bg-[#fffdfd] p-4 hover:bg-[#fff5f8]" to="/plans">
                <CalendarHeart className="size-5 text-[#8f5168]" />
                <span className="text-sm font-bold text-[#24131d]">Plans</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}
