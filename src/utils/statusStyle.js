// Color-coding for the four memorization statuses, shared by the badge and
// the status control so they never drift apart.

export const STATUS_STYLE = {
  new: {
    badge: 'bg-muted/10 text-muted',
    dot: 'bg-muted/60',
    active: 'bg-muted/15 text-muted ring-1 ring-muted/30',
  },
  memorizing: {
    badge: 'bg-amber/15 text-amber',
    dot: 'bg-amber',
    active: 'bg-amber/15 text-amber ring-1 ring-amber/40',
  },
  memorized: {
    badge: 'bg-emerald/15 text-emerald',
    dot: 'bg-emerald',
    active: 'bg-emerald/15 text-emerald ring-1 ring-emerald/40',
  },
  revision: {
    badge: 'bg-clay/15 text-clay',
    dot: 'bg-clay',
    active: 'bg-clay/15 text-clay ring-1 ring-clay/40',
  },
}

// Border color for the surah-index number circle — a compact status cue
// that doesn't need the full text badge to read at a glance.
export const STATUS_RING = {
  new: 'border-emerald/15',
  memorizing: 'border-amber/60',
  memorized: 'border-emerald/60',
  revision: 'border-clay/60',
}
