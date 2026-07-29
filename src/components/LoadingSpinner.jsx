// A centered loading spinner for full-screen async states, with an optional
// label underneath.

export default function LoadingSpinner({ label }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald/20 border-t-emerald" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}
