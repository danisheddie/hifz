import { Link } from 'react-router-dom'
import { useLang } from '../utils/i18n.jsx'

export default function Home() {
  const { t } = useLang()
  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="font-quran text-4xl leading-loose text-emerald sm:text-5xl" dir="rtl" lang="ar">
        حِفْظ
      </p>
      <h1 className="mt-4 text-2xl font-semibold text-emerald">{t('common.appName')}</h1>
      <p className="mt-2 max-w-xs text-sm text-muted">{t('home.subtitle')}</p>
      <Link to="/surahs" className="btn-primary mt-10">
        {t('home.browseSurahs')}
      </Link>
    </div>
  )
}
