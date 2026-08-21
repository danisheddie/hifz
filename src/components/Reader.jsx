// The "Reader" tab: jumps straight to wherever you last left off reading,
// via the same lastRead pointer SurahDetail keeps updated. No screen of its
// own — just a resume shortcut — except the first time, before there's any
// reading history yet.

import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getLastRead } from '../utils/storage'
import { useLang } from '../utils/i18n.jsx'
import BottomNav from './BottomNav'

export default function Reader() {
  const navigate = useNavigate()
  const { t } = useLang()
  const lastRead = getLastRead()

  useEffect(() => {
    if (lastRead) navigate(`/surah/${lastRead.surah}?ayah=${lastRead.ayah}`, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (lastRead) return null

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="max-w-[220px] text-sm text-muted">{t('reader.empty')}</p>
        <Link to="/surahs" className="btn-primary mt-6">
          {t('home.browseSurahs')}
        </Link>
      </div>
      <BottomNav />
    </div>
  )
}
