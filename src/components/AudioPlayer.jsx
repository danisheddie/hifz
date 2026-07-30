// A minimal per-ayah play/pause button. Playback itself is orchestrated by
// SurahDetail so only one ayah sounds at a time.

export default function AudioPlayer({ isPlaying, isLoading, disabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
        border border-emerald/15 text-emerald transition active:scale-90 disabled:opacity-40"
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald/20 border-t-emerald" />
      ) : isPlaying ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5.14v13.72a1 1 0 0 0 1.5.87l11-6.86a1 1 0 0 0 0-1.74l-11-6.86A1 1 0 0 0 8 5.14Z" />
        </svg>
      )}
    </button>
  )
}
