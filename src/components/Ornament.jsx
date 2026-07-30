// A small rosette divider built from the same two-overlapping-squares
// construction as the Rub el Hizb mark printed in mushafs to flag Hizb
// quarters — used here purely as a decorative divider between sections, not
// implying an actual Hizb boundary.

export default function Ornament({ className = '', size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
      className={className}
    >
      <rect x="6" y="6" width="12" height="12" />
      <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}
