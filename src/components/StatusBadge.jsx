import { STATUS_STYLE } from '../utils/statusStyle'
import { useLang } from '../utils/i18n.jsx'

export default function StatusBadge({ status, className = '' }) {
  const { t } = useLang()
  const style = STATUS_STYLE[status] || STATUS_STYLE.new
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {t(`status.${status}`)}
    </span>
  )
}
