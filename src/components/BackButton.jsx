// The back-chevron button repeated at the top of every non-dashboard screen.

import { useLang } from '../utils/i18n.jsx'

export default function BackButton({ onClick }) {
  const { t } = useLang()
  return (
    <button
      onClick={onClick}
      aria-label={t('common.back')}
      className="rounded-full p-1.5 text-muted transition active:scale-90"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  )
}
