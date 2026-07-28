// Routing. No onboarding gate yet — that arrives with the status model.

import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './components/Home'
import SurahIndex from './components/SurahIndex'
import SurahDetail from './components/SurahDetail'
import RevisionScreen from './components/RevisionScreen'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/surahs" element={<SurahIndex />} />
      <Route path="/surah/:number" element={<SurahDetail />} />
      <Route path="/revision" element={<RevisionScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
