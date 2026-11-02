// Small helpers shared by several pages.

// Where the site server (Role B, port 8000) serves a project.
export const liveUrl = (name) => `http://${name}.localhost:8000`

// "just now", "5 min ago", "3 h ago", "2 days ago"
export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// How long a deployment took: "42s" or "1m 05s"
export function duration(start, end) {
  const seconds = Math.round((new Date(end) - new Date(start)) / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

// Commit ids are long; 7 characters is what GitHub shows.
export const shortSha = (sha) => (sha ? sha.slice(0, 7) : null)
