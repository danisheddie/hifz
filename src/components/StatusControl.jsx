import { STATUSES } from '../utils/storage'
import { STATUS_STYLE } from '../utils/statusStyle'
import { useLang } from '../utils/i18n.jsx'

export default function StatusControl({ status, onChange }) {
  const { t } = useLang()
  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map((s) => {
        const active = s === status
        const style = STATUS_STYLE[s]
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={active}
            className={`rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
              active ? style.active : 'text-muted ring-1 ring-emerald/10'
            }`}
          >
            {t(`status.${s}`)}
          </button>
        )
      })}
    </div>
  )
}
