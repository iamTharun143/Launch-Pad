import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getErrorMessage, getLogs } from '../api.js'

const POLL_MS = 2000
// "Near the bottom" = within this many pixels. Used to decide whether to auto-scroll.
const STICKY_PX = 40

// Colours for special lines: commands, success and errors.
function lineColor(line) {
  if (/error|failed/i.test(line)) return 'text-red-400'
  if (line.startsWith('$')) return 'text-cyan-300'
  if (line.startsWith('✓') || /is READY/.test(line)) return 'text-green-400'
  return 'text-gray-200'
}

// Terminal-style build log for one deployment.
// Polls for new lines every 2 s while the build runs; stops once READY or FAILED.
// The parent gives it key={deploymentId}, so switching deployments starts fresh.
export default function LogViewer({ deploymentId, status }) {
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('') // the very first request failed
  const [reconnecting, setReconnecting] = useState(false) // a later request failed
  const [attempt, setAttempt] = useState(0) // bumped by Retry

  // Refs keep values between renders without causing a re-render.
  const lastIdRef = useRef(0) // id of the newest line we have; sent as ?after=
  const hasLoadedRef = useRef(false)
  const boxRef = useRef(null)
  const stickToBottomRef = useRef(true)

  const isFinished = status === 'READY' || status === 'FAILED'

  useEffect(() => {
    let cancelled = false // set by cleanup, so a late answer is ignored
    let inFlight = false // skip a tick if the previous request hasn't answered yet

    async function fetchNewLines() {
      if (inFlight) return
      inFlight = true
      try {
        const newLines = await getLogs(deploymentId, lastIdRef.current)
        if (cancelled) return
        if (newLines.length > 0) {
          lastIdRef.current = newLines[newLines.length - 1].id
          setLines((prev) => [...prev, ...newLines])
        }
        hasLoadedRef.current = true
        setError('')
        setReconnecting(false)
      } catch (err) {
        if (cancelled) return
        if (hasLoadedRef.current) setReconnecting(true)
        else setError(getErrorMessage(err))
      } finally {
        inFlight = false
        if (!cancelled) setLoading(false)
      }
    }

    // Fetch right away. When the build has just finished, this is the
    // "one last fetch" that picks up the final lines; then no timer is started.
    fetchNewLines()
    const timer = isFinished ? null : setInterval(fetchNewLines, POLL_MS)

    // Cleanup: runs when the build finishes, on Retry, or when we leave.
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [deploymentId, isFinished, attempt])

  // Remember whether the user is at the bottom every time they scroll.
  function handleScroll() {
    const box = boxRef.current
    stickToBottomRef.current = box.scrollHeight - box.scrollTop - box.clientHeight < STICKY_PX
  }

  // After new lines are drawn, scroll down, but only if the user was already at the bottom.
  useLayoutEffect(() => {
    const box = boxRef.current
    if (box && stickToBottomRef.current) box.scrollTop = box.scrollHeight
  }, [lines])

  function retry() {
    setLoading(true)
    setError('')
    setAttempt((n) => n + 1)
  }

  let emptyText = 'No logs for this deployment'
  if (status === 'QUEUED') emptyText = 'Waiting for the build to start…'
  else if (status === 'BUILDING') emptyText = 'Starting build…'

  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-950 shadow-sm">
      <div
        ref={boxRef}
        onScroll={handleScroll}
        className="h-72 overflow-auto px-4 py-3 font-mono text-xs leading-5 sm:h-96 sm:text-sm sm:leading-6"
      >
        {loading ? (
          <p className="text-gray-500">Loading logs…</p>
        ) : error ? (
          <div className="text-red-400">
            <p>Could not load logs: {error}</p>
            <button onClick={retry} className="mt-2 rounded border border-red-400/50 px-3 py-1 text-xs hover:bg-red-400/10">
              Retry
            </button>
          </div>
        ) : lines.length === 0 ? (
          <p className="text-gray-500">{emptyText}</p>
        ) : (
          // w-max lets long lines scroll sideways inside the box instead of wrapping.
          <ol className="w-max min-w-full">
            {lines.map((log, index) => (
              <li key={log.id} className="flex gap-4 whitespace-pre">
                <span className="w-6 shrink-0 text-right text-gray-600 select-none">{index + 1}</span>
                <span className={lineColor(log.line)}>{log.line}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Footer: is it still running? */}
      <div className="flex items-center gap-2 border-t border-gray-800 px-4 py-2 text-xs text-gray-400">
        {reconnecting ? (
          <span className="text-amber-400">Reconnecting…</span>
        ) : isFinished ? (
          <span>Build finished · {lines.length} lines</span>
        ) : (
          <>
            <span className="size-2 animate-pulse rounded-full bg-blue-400" />
            <span>Live · checking every {POLL_MS / 1000}s</span>
          </>
        )}
      </div>
    </div>
  )
}
