// First-launch experience: welcome, a name (so the dashboard can greet you),
// an optional quick-start for surahs already memorized (so the dashboard
// isn't empty on day one), then a soft bismillah before entering the app.
// Runs only when localStorage has no `onboarded` flag.

import { useEffect, useState } from 'react'
import { listSurahs } from '../utils/api'
import { completeOnboarding, setSurahStatus } from '../utils/storage'
import { schedulePush } from '../utils/cloudSync'
import { useLang } from '../utils/i18n.jsx'
import BackButton from './BackButton'

// Juz 30 (surahs 78–114) — the shortest surahs, and in practice where most
// people's hifz journey actually starts.
const QUICK_START_RANGE = [78, 114]

export default function Onboarding({ onDone }) {
  const { t } = useLang()
  // 0 welcome, 1 name, 2 quick-start, 3 bismillah
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [surahs, setSurahs] = useState([])
  const [picked, setPicked] = useState(() => new Set())

  useEffect(() => {
    listSurahs().then((list) =>
      setSurahs(list.filter((s) => s.number >= QUICK_START_RANGE[0] && s.number <= QUICK_START_RANGE[1]))
    )
  }, [])

  function toggle(number) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(number)) next.delete(number)
      else next.add(number)
      return next
    })
  }

  function finish() {
    for (const number of picked) setSurahStatus(number, 'memorized')
    completeOnboarding(name)
    schedulePush()
    onDone?.()
  }

  const TOTAL_STEPS = 3

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      {step >= 1 && (
        <div className="absolute inset-x-0 top-0 mx-auto flex max-w-md items-center justify-between px-6 pt-6">
          <BackButton onClick={() => setStep(step - 1)} />
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i + 1 === step ? 'w-5 bg-emerald' : 'w-1.5 bg-emerald/20'
                }`}
              />
            ))}
          </div>
          <span className="w-8" aria-hidden="true" />
        </div>
      )}

      {step === 0 && (
        // mb pulls the centered block upward within the screen rather than
        // sitting dead-center with a large, seemingly-accidental empty gap
        // below the button on tall viewports.
        <div className="mb-28 animate-fade-in">
          <p className="font-quran text-4xl leading-loose text-emerald sm:text-5xl" dir="rtl" lang="ar">
            حِفْظ
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-emerald">
            {t('common.appName')}
          </h1>
          <p className="mt-4 text-lg text-muted">{t('common.appTagline')}</p>
          <p className="mx-auto mt-8 max-w-xs text-sm leading-relaxed text-muted">
            {t('onboarding.welcomeBody')}
          </p>
          <button className="btn-primary mt-10 w-full" onClick={() => setStep(1)}>
            {t('onboarding.begin')}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="w-full animate-fade-in">
          <h2 className="text-2xl font-semibold text-emerald">{t('onboarding.nameTitle')}</h2>
          <p className="mt-2 text-sm text-muted">{t('onboarding.nameSub')}</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) setStep(2)
            }}
            placeholder={t('onboarding.namePlaceholder')}
            autoFocus
            maxLength={40}
            className="mt-8 w-full rounded-2xl border border-emerald/15 bg-transparent px-5 py-4 text-center text-lg text-emerald outline-none transition placeholder:text-muted/60 focus:border-emerald"
          />
          <button
            className="btn-primary mt-8 w-full disabled:opacity-40"
            disabled={!name.trim()}
            onClick={() => setStep(2)}
          >
            {t('common.continue')}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="w-full animate-fade-in">
          <h2 className="text-2xl font-semibold text-emerald">{t('onboarding.quickStartTitle')}</h2>
          <p className="mt-2 text-sm text-muted">{t('onboarding.quickStartSub')}</p>
          <div className="mt-6 flex max-h-72 flex-wrap gap-2 overflow-y-auto text-left">
            {surahs.map((s) => (
              <button
                key={s.number}
                type="button"
                onClick={() => toggle(s.number)}
                aria-pressed={picked.has(s.number)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
                  picked.has(s.number)
                    ? 'bg-emerald text-paper'
                    : 'text-muted ring-1 ring-emerald/15'
                }`}
              >
                {s.englishName}
              </button>
            ))}
          </div>
          <button className="btn-primary mt-8 w-full" onClick={() => setStep(3)}>
            {picked.size > 0 ? t('common.continue') : t('onboarding.skipForNow')}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="animate-scale-in">
          <p
            className="font-quran text-3xl leading-loose text-emerald sm:text-4xl"
            dir="rtl"
            lang="ar"
          >
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <p className="mt-4 text-sm text-muted">{t('onboarding.bismillahMeaning')}</p>
          <button className="btn-primary mt-12 w-full" onClick={finish}>
            {t('onboarding.enter')}
          </button>
        </div>
      )}
    </div>
  )
}
