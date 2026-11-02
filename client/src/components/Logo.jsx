// Launchpad mark: an upward arrow in a rounded square, plus the name.
export default function Logo({ size = 'md' }) {
  const box = size === 'lg' ? 'size-12' : 'size-7'
  const text = size === 'lg' ? 'text-3xl' : 'text-lg'
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`${box} inline-flex items-center justify-center rounded-lg bg-indigo-600 text-white`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3/5" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </span>
      <span className={`${text} font-bold tracking-tight`}>Launchpad</span>
    </span>
  )
}
