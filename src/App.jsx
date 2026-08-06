// Routing + first-launch gate. Onboarding takes over until a name is set;
// afterwards the core routes are available.

import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { isOnboarded } from './utils/storage'
import Onboarding from './components/Onboarding'
import Home from './components/Home'
import SurahIndex from './components/SurahIndex'
import SurahDetail from './components/SurahDetail'
import RevisionScreen from './components/RevisionScreen'
import Settings from './components/Settings'
import Help from './components/Help'
import Bookmarks from './components/Bookmarks'
import JuzIndex from './components/JuzIndex'
import { syncNow } from './utils/cloudSync'

export default function App() {
  const [onboarded, setOnboarded] = useState(() => isOnboarded())

  // If the device is linked to a sync code (or Google account), reconcile
  // with the cloud on load. No-ops entirely when sync isn't configured.
  useEffect(() => {
    syncNow().catch(() => {})
  }, [])

  if (!onboarded) {
    return <Onboarding onDone={() => setOnboarded(true)} />
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/surahs" element={<SurahIndex />} />
      <Route path="/surah/:number" element={<SurahDetail />} />
      <Route path="/revision" element={<RevisionScreen />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/help" element={<Help />} />
      <Route path="/bookmarks" element={<Bookmarks />} />
      <Route path="/juz" element={<JuzIndex />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
