// Minimal date helpers for the revision list ("last revised 3 days ago").

export function daysAgo(iso) {
  if (!iso) return Infinity
  const then = new Date(iso)
  const now = new Date()
  const ms = now.setHours(0, 0, 0, 0) - new Date(then).setHours(0, 0, 0, 0)
  return Math.round(ms / 86400000)
}
