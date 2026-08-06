// Shared "nothing here yet" state — icon + message + an optional way back to
// doing something — reused by Revision and Bookmarks so an empty list isn't
// just bare gray text with no path forward.

import { Link } from 'react-router-dom'

export default function EmptyState({ icon, message, actionLabel, actionTo }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald/5 text-emerald/50">
        {icon}
      </div>
      <p className="max-w-[220px] text-sm text-muted">{message}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-ghost px-5 py-2 text-sm">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
