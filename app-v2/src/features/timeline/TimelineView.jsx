import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { EditorialEmptyState, EditorialSection, QuietStatus, SharedSpaceHeader } from '../../components/PageLayout'
import { WriteWorkflowPanel } from '../../components/WriteWorkflowPanel'

const ORDINARY_GROUP_LIMIT = 4
const TYPE_FILTERS = Object.freeze([
  { key: 'all', label: 'All' },
  { key: 'special', label: 'Special moments' },
  { key: 'photo', label: 'Photos' },
  { key: 'video', label: 'Videos' },
  { key: 'no-media', label: 'No media' },
])

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function renderTimelineStatusLabel(status) {
  if (status === 'ready') return 'Read-only story'
  if (status === 'partial') return 'Partial story bridge'
  if (status === 'unavailable') return 'Story source unavailable'
  if (status === 'invalid') return 'Needs review'
  return 'Awaiting story entries'
}

function renderCompatibilityStateLabel(compatibilityState) {
  if (compatibilityState === 'loading') return 'Refreshing'
  if (compatibilityState === 'error') return 'Needs review'
  if (compatibilityState === 'ready') return 'Ready'
  return 'Waiting'
}

function describeTimelineState(model) {
  if (model.status === 'ready') {
    return 'The relationship story now opens as a protected, read-only timeline with years, chapters, and private media kept behind the boundary.'
  }

  if (model.status === 'partial') {
    return 'Some preserved memories can be read here now, while deferred sources and unavailable media remain clearly marked instead of being guessed.'
  }

  if (model.status === 'unavailable') {
    return 'The private legacy story has not been connected to this build yet. The routed page stays live without pretending the archive is empty.'
  }

  if (model.status === 'invalid') {
    return 'Stored story data needs review before this route can safely render the timeline.'
  }

  return 'This route is ready for protected story entries, but no readable memories are available in this build yet.'
}

function mediaStatusLabel(memory) {
  if (memory.media.status === 'private-legacy-reference') {
    return memory.media.kind === 'video' ? 'Private video stays local' : 'Private photo stays local'
  }

  if (memory.media.status === 'invalid-reference') return 'Media reference needs review'
  if (memory.media.status === 'special-route-only') return 'Protected moment route'
  if (memory.media.kind === 'video') return 'Video memory'
  if (memory.media.kind === 'image') return 'Photo memory'
  return 'No media attached'
}

function TimelineDetailDialog({ memory, onClose }) {
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)

  useEffect(() => {
    if (!memory || !dialogRef.current) return
    if (!dialogRef.current.open) {
      dialogRef.current.showModal()
    }
    closeButtonRef.current?.focus()
  }, [memory])

  if (!memory) return null

  return createPortal(
    <dialog aria-labelledby="timeline-detail-title" className="timeline-detail-dialog" onClose={onClose} ref={dialogRef}>
      <button aria-label="Close memory detail" className="timeline-detail-close" onClick={onClose} ref={closeButtonRef} type="button">
        Close
      </button>
      <div className="timeline-detail-date">
        <span>{memory.typeLabel}</span>
        <strong>{memory.displayDate || 'Date to review'}</strong>
      </div>
      <div className="timeline-detail-copy">
        <h2 id="timeline-detail-title">{memory.displayTitle}</h2>
        <p>{memory.displayDescription}</p>
      </div>
      {memory.tags.length > 0 ? (
        <ul className="timeline-detail-tags" aria-label="Memory detail tags">
          {memory.tags.slice(0, 6).map((tag) => (
            <li key={tag.key}>{tag.label}</li>
          ))}
        </ul>
      ) : null}
      <dl className="timeline-detail-list">
        <div>
          <dt>Media</dt>
          <dd>{mediaStatusLabel(memory)}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>Read-only protected story metadata</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{memory.warnings.length > 0 ? 'Held with review notes' : 'Ready'}</dd>
        </div>
      </dl>
      {memory.specialMoment.route ? (
        <Link className="timeline-special-link" onClick={onClose} to={memory.specialMoment.route}>
          Open protected moment
        </Link>
      ) : null}
    </dialog>,
    document.body,
  )
}

function matchesTypeFilter(memory, typeFilter) {
  if (typeFilter === 'all') return true
  if (typeFilter === 'special') return memory.specialMoment.isSpecial
  if (typeFilter === 'photo') return memory.media.kind === 'image'
  if (typeFilter === 'video') return memory.media.kind === 'video'
  if (typeFilter === 'no-media') return memory.media.status === 'none' || memory.media.status === 'special-route-only'
  return true
}

function filterChapters(chapters, filters) {
  return chapters
    .map((chapter) => {
      const groups = chapter.groups
        .map((group) => ({
          ...group,
          memories: group.memories.filter((memory) => {
            if (!matchesTypeFilter(memory, filters.type)) return false
            if (filters.year !== 'all' && String(memory.date.year) !== filters.year) return false
            return true
          }),
        }))
        .filter((group) => group.memories.length > 0)

      return {
        ...chapter,
        groups,
        memories: groups.flatMap((group) => group.memories),
      }
    })
    .filter((chapter) => chapter.groups.length > 0)
}

function createChapterDomId(chapterId) {
  return `timeline-chapter-${chapterId.replace(/[^a-z0-9]+/gi, '-')}`
}

function OpeningNote({ model }) {
  return (
    <QuietStatus
      className="timeline-opening-note"
      description="The page reads normalized memory metadata only. Images, videos, editing, deleting, and synchronization stay outside this route."
      eyebrow={renderTimelineStatusLabel(model.status)}
      items={[
        pluralize(model.summary.totalMemories, 'memory'),
        pluralize(model.summary.specialMoments, 'special moment'),
        pluralize(model.summary.unavailableMedia + model.summary.invalidMedia, 'media item held back'),
      ]}
      title="The story is readable without reopening private files."
    />
  )
}

function TimelineFilters({ filters, model, onChange }) {
  return (
    <div className="timeline-toolbar" aria-label="Timeline filters">
      <div className="timeline-filter-group" role="group" aria-label="Memory type">
        {TYPE_FILTERS.map((filter) => {
          const active = filters.type === filter.key
          return (
            <button
              aria-pressed={active}
              className={`timeline-filter-button ${active ? 'timeline-filter-button-active' : ''}`}
              key={filter.key}
              onClick={() => onChange({ ...filters, type: filter.key })}
              type="button"
            >
              {filter.label}
            </button>
          )
        })}
      </div>
      <label className="timeline-year-filter">
        <span>Year</span>
        <select value={filters.year} onChange={(event) => onChange({ ...filters, year: event.target.value })}>
          <option value="all">All years</option>
          {model.filters.availableYears.map((year) => (
            <option key={year.key} value={year.key}>
              {year.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function ChapterNavigation({ chapters }) {
  if (chapters.length === 0) return null

  return (
    <nav aria-label="Timeline chapters" className="timeline-chapter-nav">
      {chapters.map((chapter) => (
        <a href={`#${createChapterDomId(chapter.id)}`} key={chapter.id}>
          <span>{chapter.label}</span>
          <small>{pluralize(chapter.memories.length, 'memory')}</small>
        </a>
      ))}
    </nav>
  )
}

function MemoryCard({ memory, onSelect }) {
  return (
    <article className={`timeline-memory-card ${memory.specialMoment.isSpecial ? 'timeline-memory-card-special' : ''}`}>
      <div className="timeline-memory-card-meta">
        <span>{memory.typeLabel}</span>
        <span>{memory.displayDate || 'Date to review'}</span>
      </div>
      <div className="timeline-memory-card-copy">
        <h4>{memory.displayTitle}</h4>
        <p>{memory.displayDescription}</p>
      </div>
      {memory.tags.length > 0 ? (
        <ul className="timeline-tag-list" aria-label="Memory tags">
          {memory.tags.slice(0, 4).map((tag) => (
            <li key={tag.key}>{tag.label}</li>
          ))}
        </ul>
      ) : null}
      <div className="timeline-memory-card-footer">
        <span className={`timeline-media-pill timeline-media-pill-${memory.media.status}`}>{mediaStatusLabel(memory)}</span>
        <button className="timeline-detail-trigger" onClick={() => onSelect(memory)} type="button">
          View memory
        </button>
        {memory.specialMoment.route ? (
          <Link className="timeline-special-link" to={memory.specialMoment.route}>
            Open protected moment
          </Link>
        ) : null}
      </div>
    </article>
  )
}

function TimelineGroup({ expandedGroups, group, onSelect, onToggle }) {
  const isExpandable = group.kind !== 'special' && group.memories.length > ORDINARY_GROUP_LIMIT
  const isExpanded = expandedGroups.has(group.id)
  const visibleMemories = isExpandable && !isExpanded ? group.memories.slice(0, ORDINARY_GROUP_LIMIT) : group.memories

  return (
    <section className="timeline-group" aria-labelledby={`timeline-group-${group.id.replace(/[^a-z0-9]+/gi, '-')}`}>
      <div className="timeline-group-heading">
        <h3 id={`timeline-group-${group.id.replace(/[^a-z0-9]+/gi, '-')}`}>{group.label}</h3>
        <span>{pluralize(group.memories.length, 'memory')}</span>
      </div>
      <div className="timeline-memory-list">
        {visibleMemories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} onSelect={onSelect} />
        ))}
      </div>
      {isExpandable ? (
        <button className="timeline-show-more" onClick={() => onToggle(group.id)} type="button">
          {isExpanded ? 'Show less' : `Show ${group.memories.length - ORDINARY_GROUP_LIMIT} more`}
        </button>
      ) : null}
    </section>
  )
}

function TimelineChapters({ chapters, onSelect }) {
  const [expandedGroups, setExpandedGroups] = useState(() => new Set())

  const toggleGroup = (groupId) => {
    setExpandedGroups((current) => {
      const next = new Set(current)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  return (
    <div className="timeline-chapter-stack">
      {chapters.map((chapter) => (
        <article className="timeline-chapter" id={createChapterDomId(chapter.id)} key={chapter.id}>
          <header className="timeline-chapter-heading">
            <span className="folio-mark">{chapter.kind === 'undated' ? 'Date review' : 'Year chapter'}</span>
            <h2>{chapter.label}</h2>
          </header>
          <div className="timeline-group-stack">
            {chapter.groups.map((group) => (
              <TimelineGroup expandedGroups={expandedGroups} group={group} key={group.id} onSelect={onSelect} onToggle={toggleGroup} />
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}

function TimelineEmptyState({ filters, model }) {
  if (model.status === 'unavailable') {
    return (
      <EditorialEmptyState
        description="The private legacy story is not connected to this build. This is a source boundary, not an empty archive."
        title="The private story bridge is unavailable here."
        titleAs="h3"
      />
    )
  }

  if (model.status === 'invalid') {
    return (
      <EditorialEmptyState
        description="The page is holding back stored story data until it can be reviewed safely."
        title="The story needs review before it can render."
        titleAs="h3"
      />
    )
  }

  if (model.summary.totalMemories > 0) {
    return (
      <EditorialEmptyState
        description="Try a different type or year filter. Hidden results remain read-only and unchanged."
        title="No memories match these filters."
        titleAs="h3"
      />
    )
  }

  return (
    <EditorialEmptyState
      description={`No readable memories are available for ${filters.year === 'all' ? 'this view' : filters.year}. The route does not invent story entries.`}
      title="No readable memories are available yet."
      titleAs="h3"
    />
  )
}

function SourceStateSection({ compatibilityError, compatibilityState, model, onRefresh }) {
  const sourceCards = [
    {
      key: 'base',
      label: 'Private story archive',
      status: model.sourceStatus.base.status,
      summary:
        model.sourceStatus.base.status === 'ready'
          ? `${pluralize(model.sourceStatus.base.count, 'archive memory')} available through the local bridge.`
          : 'The base story archive is not connected in this build.',
    },
    {
      key: 'custom',
      label: 'Local custom notes',
      status: model.sourceStatus.custom.status,
      summary: `${pluralize(model.sourceStatus.custom.count, 'custom memory')} visible through read-only compatibility.`,
    },
    {
      key: 'overrides',
      label: 'Preserved corrections',
      status: model.sourceStatus.overrides.status,
      summary: `${pluralize(model.sourceStatus.overrides.count, 'preserved correction')} applied before rendering.`,
    },
    {
      key: 'deferred',
      label: 'Deferred media scan',
      status: 'deferred',
      summary: 'Automatic media inventory and fallback seed entries remain outside app-v2 until a safer boundary exists.',
    },
  ]

  return (
    <EditorialSection
      action={{ label: 'Refresh reads', onClick: onRefresh, tone: 'secondary' }}
      className="timeline-section"
      description="Timeline reports safe read state without exposing storage keys, adapter names, raw paths, or old static routes."
      eyebrow="Source status"
      title="Source status stays readable and narrow."
    >
      <div className="source-status-toolbar">
        <div className="source-status-copy">
          <span className="source-status-pill">{renderCompatibilityStateLabel(compatibilityState)}</span>
          <p>Unavailable, empty, partial, and invalid story states stay distinct so the page never flattens missing data into a false empty archive.</p>
        </div>
      </div>
      {compatibilityError ? (
        <div className="dashboard-inline-alert">
          <strong>Compatibility refresh issue</strong>
          <p>The latest protected refresh did not complete. Existing read-only timeline content remains unchanged.</p>
        </div>
      ) : null}
      <div className="source-status-grid">
        {sourceCards.map((item) => (
          <article className="source-card" key={item.key}>
            <div className="source-card-header">
              <strong>{item.label}</strong>
              <span className={`source-card-status source-card-status-${item.status}`}>{item.status}</span>
            </div>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </EditorialSection>
  )
}

export function TimelineView({ compatibilityError, compatibilityState, model, onRefresh }) {
  const [filters, setFilters] = useState({ type: 'all', year: 'all' })
  const [selectedMemory, setSelectedMemory] = useState(null)
  const visibleChapters = filterChapters(model.chapters, filters)

  return (
    <section className="timeline-page">
      <SharedSpaceHeader
        actions={[
          { href: '/gallery', label: 'Open gallery' },
          { href: '/profile', label: 'Open profile', tone: 'secondary' },
        ]}
        aside={<OpeningNote model={model} />}
        className="timeline-hero"
        description={describeTimelineState(model)}
        eyebrow="Story"
        folio={renderTimelineStatusLabel(model.status)}
        title="Our story timeline"
      />

      <WriteWorkflowPanel kind="memory" onRefresh={onRefresh} />
      <EditorialSection
        className="timeline-section"
        description="Years lead the structure, special moments stay distinct, and dense periods open a few entries at a time."
        eyebrow="Timeline"
        title="Read the story by chapter."
      >
        <TimelineFilters filters={filters} model={model} onChange={setFilters} />
        <ChapterNavigation chapters={visibleChapters} />
        {compatibilityState === 'loading' && model.summary.totalMemories === 0 ? (
          <EditorialEmptyState
            description="The protected shell is restoring the read-only story state."
            title="Restoring timeline reads."
            titleAs="h3"
          />
        ) : visibleChapters.length > 0 ? (
          <TimelineChapters chapters={visibleChapters} onSelect={setSelectedMemory} />
        ) : (
          <TimelineEmptyState filters={filters} model={model} />
        )}
      </EditorialSection>

      {model.status === 'partial' ? (
        <EditorialSection
          className="timeline-section timeline-section-subdued"
          description="Some legacy memory sources are still deferred. The visible chapters are not rewritten or synchronized from this route."
          eyebrow="Partial bridge"
          title="The route shows what is safe now."
        >
          <p className="timeline-boundary-note">Private media files, automatic scans, editing, deleting, adding, and Storage remain out of scope.</p>
        </EditorialSection>
      ) : null}

      <SourceStateSection
        compatibilityError={compatibilityError}
        compatibilityState={compatibilityState}
        model={model}
        onRefresh={onRefresh}
      />
      <TimelineDetailDialog memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
    </section>
  )
}
