import { useEffect } from 'react'

// Sets the browser tab title, e.g. "portfolio · Launchpad".
// Pass null while data is loading to show just "Launchpad".
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Launchpad` : 'Launchpad'
  }, [title])
}
