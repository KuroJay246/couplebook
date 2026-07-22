function FavoriteSection({ category, ownerId }) {
  return (
    <div className="favorites-section">
      <div className="favorites-section-title">
        {category.label}
        <button className="add-btn" type="button">+ Add</button>
      </div>
      <ul className="favorites-list">
        {category.items.map((item) => (
          <li key={`${ownerId}-${category.key}-${item}`}><span>{item}</span><button className="btn-icon" type="button">×</button></li>
        ))}
      </ul>
    </div>
  )
}

function FavoritesCard({ person, index }) {
  const color = index === 0 ? 'var(--color-jaylan)' : 'var(--color-omia)'
  return (
    <div className="glass-card card-story favorites-card">
      <h2 style={{ fontFamily: 'var(--font-accent)', textAlign: 'center', color, marginBottom: '1.5rem' }}>{person.displayName}'s Favorites</h2>
      {person.categories.map((category) => <FavoriteSection category={category} key={category.key} ownerId={person.id} />)}
    </div>
  )
}

export function FavoritesView({ model }) {
  const people = (model.people || []).length > 0
    ? model.people
    : [
      { id: 'jaylan-empty', displayName: 'Jaylan', categories: [] },
      { id: 'omia-empty', displayName: 'Omia', categories: [] },
    ]

  return (
    <section className="favorites-page">
      <header className="page-header">
        <div className="page-heading">
          <p className="page-eyebrow">Saved Details</p>
          <h1 className="page-title">🌟 Favorite Things</h1>
          <p className="page-subtitle">A side-by-side look at what makes Jaylan and Omia smile.</p>
        </div>
      </header>
      <div className="favorites-layout">
        {people.map((person, index) => <FavoritesCard index={index} key={person.id} person={person} />)}
      </div>
    </section>
  )
}
