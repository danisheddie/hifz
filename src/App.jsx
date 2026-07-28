// Routing. No onboarding gate yet — that arrives with the status model.

import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './components/Home'
import SurahIndex from './components/SurahIndex'
import SurahDetail from './components/SurahDetail'
import RevisionScreen from './components/RevisionScreen'
import Settings from './components/Settings'
import { syncNow } from './utils/cloudSync'

export default function App() {
  // If the device is linked to a sync code (or Google account), reconcile
  // with the cloud on load. No-ops entirely when sync isn't configured.
  useEffect(() => {
    syncNow().catch(() => {})
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/surahs" element={<SurahIndex />} />
      <Route path="/surah/:number" element={<SurahDetail />} />
      <Route path="/revision" element={<RevisionScreen />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
