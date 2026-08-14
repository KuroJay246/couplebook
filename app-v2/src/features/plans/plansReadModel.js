function sortPlans(plans) {
  return [...plans].sort((left, right) => {
    const leftDate = left.targetDate || '9999-12-31'
    const rightDate = right.targetDate || '9999-12-31'
    if (left.status === 'completed' && right.status !== 'completed') return 1
    if (left.status !== 'completed' && right.status === 'completed') return -1
    return leftDate.localeCompare(rightDate) || left.title.localeCompare(right.title)
  })
}

export function buildPlansReadModel(source, { search = '', status = 'all' } = {}) {
  const plans = sortPlans(source?.data?.plans || [])
  const normalizedSearch = search.trim().toLowerCase()
  const filtered = plans.filter((plan) => {
    if (status !== 'all' && plan.status !== status) return false
    if (!normalizedSearch) return true
    return [plan.title, plan.category, plan.notes, plan.targetDate].join(' ').toLowerCase().includes(normalizedSearch)
  })
  const active = plans.filter((plan) => plan.status !== 'archived')
  return {
    status: source?.status || 'empty',
    warnings: source?.warnings || [],
    plans,
    filtered,
    counts: {
      total: active.length,
      ideas: active.filter((plan) => plan.status === 'idea').length,
      planned: active.filter((plan) => plan.status === 'planned').length,
      completed: active.filter((plan) => plan.status === 'completed').length,
    },
    emptyState: {
      title: normalizedSearch || status !== 'all' ? 'No plans match this view yet.' : 'No plans are saved yet.',
      description: normalizedSearch || status !== 'all'
        ? 'Try a different search or status filter.'
        : 'Save date ideas, places to visit, goals, and little surprises so they can become memories later.',
    },
  }
}
