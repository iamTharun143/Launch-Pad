// Small "opens in a new tab" arrow. An SVG, because the ↗ character shows as an emoji on Windows.
export default function ExternalIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="inline size-3.5 shrink-0" aria-hidden="true">
      <path d="M6 3h7v7M13 3 4 12" />
    </svg>
  )
}
