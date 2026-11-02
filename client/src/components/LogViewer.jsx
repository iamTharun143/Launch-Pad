import { useState, useEffect, useRef } from 'react'
import {
  Terminal,
  X,
  Copy,
  Check,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { getDeploymentLogs } from '../api'

export function LogViewer({ deployment, onClose }) {
  const [logs, setLogs] = useState([])
  const [currentStatus, setCurrentStatus] = useState(deployment?.status || 'QUEUED')
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  const logsRef = useRef([])
  const bottomRef = useRef(null)

  // Keep logsRef in sync for polling query param calculation
  useEffect(() => {
    logsRef.current = logs
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // Polling effect: incrementally queries logs with ?after=<highestId>
  useEffect(() => {
    if (!deployment?.id) return

    let timerId = null
    let isCancelled = false

    const fetchNextLogs = async () => {
      try {
        const lastLog = logsRef.current[logsRef.current.length - 1]
        const afterId = lastLog ? lastLog.id : 0

        const response = await getDeploymentLogs(deployment.id, afterId)
        if (isCancelled) return

        if (response.logs && response.logs.length > 0) {
          setLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l.id))
            const newEntries = response.logs.filter((l) => !existingIds.has(l.id))
            return [...prev, ...newEntries]
          })
        }

        if (response.status) {
          setCurrentStatus(response.status)
        }

        // Keep polling every 1.5 seconds if build is active
        if (response.status === 'QUEUED' || response.status === 'BUILDING') {
          timerId = setTimeout(fetchNextLogs, 1500)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.response?.data?.error || err.message || 'Failed to stream logs')
        }
      } finally {
        if (!isCancelled) {
          setLoadingInitial(false)
        }
      }
    }

    fetchNextLogs()

    return () => {
      isCancelled = true
      if (timerId) clearTimeout(timerId)
    }
  }, [deployment?.id])

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleCopyLogs = () => {
    const fullText = logs.map((l) => l.line).join('\n')
    navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Format line styling based on keywords
  const getLineClass = (line) => {
    if (/\[error\]|error|fail/i.test(line)) return 'text-red-400 font-semibold'
    if (/\[ready\]|\[deploy\]|live at/i.test(line)) return 'text-brand-400 font-semibold'
    if (/\[vite\]|✓/i.test(line)) return 'text-emerald-300'
    if (/\[build\]|running/i.test(line)) return 'text-cyan-300'
    if (/\[queued\]/i.test(line)) return 'text-yellow-400'
    return 'text-gray-300'
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in font-sans">
      <div className="bg-dark-900 border border-dark-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Terminal Header */}
        <div className="px-5 py-3.5 bg-dark-950 border-b border-dark-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-dark-800 font-mono text-xs">
              <Terminal className="w-4 h-4 text-brand-500" />
              <span className="text-white font-semibold">{deployment.id}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">commit {deployment.commitSha}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className="flex items-center gap-1.5 font-mono text-xs">
              {currentStatus === 'READY' ? (
                <span className="text-brand-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> READY
                </span>
              ) : currentStatus === 'FAILED' ? (
                <span className="text-red-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> FAILED
                </span>
              ) : (
                <span className="text-yellow-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 animate-spin" /> {currentStatus}
                </span>
              )}
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopyLogs}
              disabled={logs.length === 0}
              className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-400 hover:text-white transition disabled:opacity-40"
              title="Copy logs to clipboard"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-brand-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-400 hover:text-white transition"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 bg-black/95 p-4 sm:p-5 overflow-y-auto font-mono text-xs leading-relaxed select-text">
          {/* Initial Loading */}
          {loadingInitial && logs.length === 0 && (
            <div className="py-20 text-center animate-pulse">
              <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
              <p className="text-gray-500">Connecting to build process stream...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 my-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <div>
                <p className="font-semibold">Log Streaming Error</p>
                <p className="text-[11px] text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loadingInitial && !error && logs.length === 0 && (
            <div className="py-20 text-center text-gray-500">
              <Terminal className="w-8 h-8 mx-auto mb-2 text-dark-700" />
              <p>No log output produced for this deployment yet.</p>
            </div>
          )}

          {/* Log Lines */}
          {logs.map((log, index) => (
            <div
              key={log.id || index}
              className="flex items-start gap-4 hover:bg-white/[0.03] px-2 py-0.5 rounded transition-colors"
            >
              <span className="text-gray-600 select-none w-8 text-right shrink-0">
                {index + 1}
              </span>
              <span className="text-gray-500 select-none shrink-0 hidden sm:inline">
                {new Date(log.createdAt).toLocaleTimeString()}
              </span>
              <span className={`break-all ${getLineClass(log.line)}`}>{log.line}</span>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Terminal Footer Bar */}
        <div className="px-5 py-2.5 bg-dark-950 border-t border-dark-800 flex items-center justify-between text-[11px] font-mono text-gray-400 shrink-0">
          <div className="flex items-center gap-3">
            <span>{logs.length} lines</span>
            <span>•</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded bg-dark-800 border-dark-700 text-brand-500 focus:ring-0"
              />
              Auto-scroll
            </label>
          </div>

          <div className="text-gray-500 hidden sm:block">
            Endpoint: <code className="text-gray-400">GET /api/deployments/:id/logs?after=...</code>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogViewer

