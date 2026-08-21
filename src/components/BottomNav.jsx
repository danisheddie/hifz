// Persistent bottom tab bar for the app's top-level screens (Home, Surahs,
// Reader, Profile). Deliberately not shown on drill-down screens (a surah,
// revision/bookmarks lists, help, juz) — those reach back via BackButton,
// matching the mockup's screens where only top-level tabs carry this bar.

import { NavLink } from 'react-router-dom'
import { useLang } from '../utils/i18n.jsx'

function HomeIcon(props) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="m3 11.5 9-7.5 9 7.5" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </svg>
  )
}

function SurahsIcon(props) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="4" y="4.5" width="16" height="4" rx="1" />
      <rect x="4" y="10" width="16" height="4" rx="1" />
      <rect x="4" y="15.5" width="16" height="4" rx="1" />
    </svg>
  )
}

function ReaderIcon(props) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 6.5c-2-1.4-5-1.8-8-1v13c3-.8 6-.4 8 1 2-1.4 5-1.8 8-1v-13c-3-.8-6-.4-8 1Z" />
      <path d="M12 6.5v13" />
    </svg>
  )
}

function ProfileIcon(props) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-4 3.5-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </svg>
  )
}

const TABS = [
  { to: '/', end: true, key: 'nav.home', Icon: HomeIcon },
  { to: '/surahs', end: false, key: 'nav.surahs', Icon: SurahsIcon },
  { to: '/reader', end: false, key: 'nav.reader', Icon: ReaderIcon },
  { to: '/settings', end: false, key: 'nav.profile', Icon: ProfileIcon },
]

export default function BottomNav() {
  const { t } = useLang()
  return (
    <nav className="mx-auto flex w-full max-w-2xl shrink-0 border-t border-emerald/10 bg-paper/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur">
      {TABS.map(({ to, end, key, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition active:scale-95 ${
              isActive ? 'text-emerald' : 'text-muted'
            }`
          }
        >
          <Icon />
          {t(key)}
        </NavLink>
      ))}
    </nav>
  )
}
