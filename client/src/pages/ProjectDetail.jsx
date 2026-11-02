import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { createDeployment, getDeployments, getErrorMessage, getProject, rollback } from '../api.js'
import { useRole } from '../auth/useRole.js'
import { RoleBadge, StatusBadge } from '../components/Badges.jsx'
import LogViewer from '../components/LogViewer.jsx'
import { describeLoadError, duration, liveUrl, shortSha, timeAgo } from '../utils.js'
import { usePageTitle } from '../usePageTitle.js'
import { EmptyState, ErrorState } from '../components/States.jsx'
import ExternalIcon from '../components/ExternalIcon.jsx'

// While a deployment is QUEUED or BUILDING, re-check every 2 s (same pace as the logs).
const POLL_MS = 2000
const isRunning = (d) => d.status === 'QUEUED' || d.status === 'BUILDING'

// Deployments first, THEN the project. The two answers can't arrive "at the same moment",
// so this order guarantees the project (its live deployment) is never older than the list.
// Otherwise a build could finish between the requests: the list says READY, polling stops,
// and the Live tag would be stuck on the old deployment.
async function fetchProjectAndDeployments(id) {
  const deployments = await getDeployments(id)
  const project = await getProject(id)
  return [project, deployments]
}

export default function ProjectDetail() {
  const { id } = useParams()
  // The selected deployment lives in the URL (?deployment=7), so refresh keeps it.
  const [searchParams, setSearchParams] = useSearchParams()

  const [project, setProject] = useState(null)
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null) // { status, message }
  const [attempt, setAttempt] = useState(0) // bumped by Retry

  // Opened a different project on the same page (new :id)? Start over with the loading state.
  const [shownId, setShownId] = useState(id)
  if (id !== shownId) {
    setShownId(id)
    setLoading(true)
    setError(null)
    setProject(null)
    setDeployments([])
  }

  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState('')

  const [rollingBackId, setRollingBackId] = useState(null) // deployment being made live
  const [rollbackError, setRollbackError] = useState('')

  // My role and what it lets me do. Hides buttons only; the server still checks.
  const { role, canDeploy, canRollback, canManageTeam } = useRole(project)
  usePageTitle(project?.name)

  // 1) Load the project and its deployments when the page opens (and on Retry).
  useEffect(() => {
    fetchProjectAndDeployments(id)
      .then(([projectData, deploymentData]) => {
        setProject(projectData)
        setDeployments(deploymentData)
      })
      .catch((err) => setError({ status: err.response?.status, message: getErrorMessage(err) }))
      .finally(() => setLoading(false))
  }, [id, attempt])

  // Re-draw every 30 s so times like "5 min ago" keep up while the page is open.
  const [, setClock] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setClock((n) => n + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  // 2) While something is building, refresh every POLL_MS so statuses change by themselves.
  //    When nothing is running, hasRunning becomes false and the timer is cleared.
  const hasRunning = deployments.some(isRunning)
  useEffect(() => {
    if (!hasRunning) return
    const timer = setInterval(() => {
      // Refresh the project too: a finished build changes activeDeploymentId.
      fetchProjectAndDeployments(id)
        .then(([projectData, deploymentData]) => {
          setProject(projectData)
          setDeployments(deploymentData)
        })
        .catch(() => {}) // keep showing the last data; the next tick tries again
    }, POLL_MS)
    // Cleanup: runs when hasRunning changes or we leave the page.
    return () => clearInterval(timer)
  }, [id, hasRunning])

  function retry() {
    setLoading(true)
    setError(null)
    setAttempt((n) => n + 1)
  }

  // replace: true so clicking through deployments doesn't fill the Back button history.
  function selectDeployment(deploymentId) {
    setSearchParams({ deployment: deploymentId }, { replace: true })
  }

  async function handleDeploy() {
    setDeploying(true)
    setDeployError('')
    try {
      const deployment = await createDeployment(id)
      // Show it at the top right away and open its logs; polling takes it from here.
      setDeployments((prev) => [deployment, ...prev])
      selectDeployment(deployment.id)
    } catch (err) {
      setDeployError(getErrorMessage(err))
    } finally {
      setDeploying(false)
    }
  }

  async function handleRollback(deployment) {
    if (!window.confirm(`Make #${deployment.id} the live version of ${project.name}?`)) return
    setRollingBackId(deployment.id)
    setRollbackError('')
    try {
      // The server answers with the updated project (new activeDeploymentId).
      setProject(await rollback(id, deployment.id))
    } catch (err) {
      setRollbackError(getErrorMessage(err))
    } finally {
      setRollingBackId(null)
    }
  }

  if (loading) return <DetailSkeleton />
  if (error) return <ErrorState {...describeLoadError(error, 'Could not load this project')} onRetry={retry} />

  // triggeredBy is a user id; show the member's username when we know it.
  const usernameOf = (userId) => project.members.find((m) => m.user.id === userId)?.user.username ?? `user #${userId}`

  // The one from ?deployment=, or the newest if that's missing or unknown.
  const selected =
    deployments.find((d) => d.id === Number(searchParams.get('deployment'))) ?? deployments[0] ?? null

  return (
    <div>
      <Link to="/dashboard" className="-my-1.5 inline-block py-1.5 text-sm text-gray-500 hover:text-gray-900">
        ← Back to projects
      </Link>

      {/* Header: name, role, links, Deploy button */}
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold break-all">{project.name}</h1>
            {role && <RoleBadge role={role} />}
          </div>
          <div className="mt-1 flex flex-col text-sm sm:flex-row sm:gap-4">
            {project.activeDeploymentId ? (
              <a
                href={liveUrl(project.name)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-w-0 items-center gap-1 py-1 font-medium text-indigo-600 hover:underline"
              >
                <span className="truncate">{project.name}.localhost:8000</span>
                <ExternalIcon />
              </a>
            ) : (
              <span className="py-1 text-gray-500">Not live yet</span>
            )}
            <a href={project.repoUrl} target="_blank" rel="noreferrer" className="truncate py-1 text-gray-500 hover:text-gray-900">
              {project.repoUrl.replace('https://', '')}
            </a>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Build <code className="rounded bg-gray-100 px-1 py-0.5">{project.buildCommand}</code> · Output{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">{project.outputDir}</code>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
          <div className="flex gap-2">
            {canManageTeam && (
              <Link
                to={`/projects/${project.id}/team`}
                className="flex-1 whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium hover:bg-gray-100"
              >
                Team settings
              </Link>
            )}
            {canDeploy && (
              <button
                onClick={handleDeploy}
                disabled={deploying}
                className="flex-1 whitespace-nowrap rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deploying ? 'Deploying…' : 'Deploy'}
              </button>
            )}
          </div>
          {!canDeploy && <p className="text-sm text-gray-500">You have view-only access</p>}
          {deployError && (
            <p role="alert" className="text-xs text-red-600">
              {deployError}
            </p>
          )}
        </div>
      </div>

      {/* Build logs for the selected deployment */}
      {selected && (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold">Build logs · #{selected.id}</h2>
            <StatusBadge status={selected.status} />
          </div>
          {/* key: a different deployment gets a brand-new LogViewer (fresh lines, fresh polling) */}
          <LogViewer key={selected.id} deploymentId={selected.id} status={selected.status} />
        </section>
      )}

      {/* Deployment history */}
      <h2 className="mt-8 mb-3 text-lg font-semibold">Deployments</h2>
      {rollbackError && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Rollback failed: {rollbackError}
        </p>
      )}
      {deployments.length === 0 ? (
        <EmptyState
          title="No deployments yet"
          text={canDeploy ? 'Click Deploy to build this project and put it online.' : 'An Owner or Developer needs to deploy it first.'}
        />
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {deployments.map((d) => (
            <DeploymentRow
              key={d.id}
              deployment={d}
              isLive={d.id === project.activeDeploymentId}
              isSelected={d.id === selected?.id}
              onSelect={() => selectDeployment(d.id)}
              triggeredBy={usernameOf(d.triggeredBy)}
              // Rollback: any READY deployment that isn't live, if my role allows it.
              canRollBack={canRollback && d.status === 'READY' && d.id !== project.activeDeploymentId}
              rollingBack={rollingBackId === d.id}
              onRollback={() => handleRollback(d)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function DeploymentRow({ deployment, isLive, isSelected, onSelect, triggeredBy, canRollBack, rollingBack, onRollback }) {
  const { id, status, commitSha, createdAt, finishedAt } = deployment
  return (
    // Two buttons side by side (a button can't contain another button):
    // the row itself shows the logs, the small one on the right rolls back.
    <li className={`flex items-center ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
      <button
        onClick={onSelect}
        aria-current={isSelected}
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left"
      >
        <div className="w-24">
          <StatusBadge status={status} />
        </div>
        {/* No min-w-0 here: when space runs out, the time text wraps to its own line instead of overlapping. */}
        <div className="flex flex-1 items-center gap-2">
          <span className="font-medium">#{id}</span>
          {commitSha && <code className="text-xs text-gray-500">{shortSha(commitSha)}</code>}
          {isLive && (
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">Live</span>
          )}
        </div>
        <div className="text-right text-xs text-gray-500">
          <span>
            {timeAgo(createdAt)} by {triggeredBy}
          </span>
          {finishedAt && <span> · {duration(createdAt, finishedAt)}</span>}
        </div>
      </button>
      {canRollBack && (
        <button
          onClick={onRollback}
          disabled={rollingBack}
          className="mr-3 shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-100 disabled:opacity-60"
        >
          {rollingBack ? 'Rolling back…' : 'Rollback'}
        </button>
      )}
    </li>
  )
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-28 rounded bg-gray-200" />
      <div className="mt-4 h-8 w-48 rounded bg-gray-200" />
      <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
      <div className="mt-10 space-y-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-12 rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  )
}
