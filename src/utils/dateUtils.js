// Minimal date helpers for the revision list ("last revised 3 days ago").

export function daysAgo(iso) {
  if (!iso) return Infinity
  const then = new Date(iso)
  const now = new Date()
  const ms = now.setHours(0, 0, 0, 0) - new Date(then).setHours(0, 0, 0, 0)
  return Math.round(ms / 86400000)
}

// Shared by the dashboard's revision preview and the full Revision screen.
export function formatLastRevised(t, lastRevised) {
  if (!lastRevised) return t('dashboard.lastRevisedNever')
  const n = daysAgo(lastRevised)
  if (n <= 0) return t('dashboard.lastRevisedToday')
  if (n === 1) return t('dashboard.lastRevisedYesterday')
  return t('dashboard.lastRevisedDaysAgo', { n })
}
