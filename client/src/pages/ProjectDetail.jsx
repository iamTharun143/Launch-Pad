import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createDeployment, getDeployments, getErrorMessage, getProject } from '../api.js'
import { useAuth } from '../auth/useAuth.js'
import { RoleBadge, StatusBadge } from '../components/Badges.jsx'
import { duration, liveUrl, shortSha, timeAgo } from '../utils.js'

// While a deployment is QUEUED or BUILDING, re-check every few seconds.
const POLL_MS = 3000
const isRunning = (d) => d.status === 'QUEUED' || d.status === 'BUILDING'

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [project, setProject] = useState(null)
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null) // { status, message }
  const [attempt, setAttempt] = useState(0) // bumped by Retry

  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState('')

  // 1) Load the project and its deployments when the page opens (and on Retry).
  useEffect(() => {
    Promise.all([getProject(id), getDeployments(id)])
      .then(([projectData, deploymentData]) => {
        setProject(projectData)
        setDeployments(deploymentData)
      })
      .catch((err) => setError({ status: err.response?.status, message: getErrorMessage(err) }))
      .finally(() => setLoading(false))
  }, [id, attempt])

  // 2) While something is building, refresh every POLL_MS so statuses change by themselves.
  //    When nothing is running, hasRunning becomes false and the timer is cleared.
  const hasRunning = deployments.some(isRunning)
  useEffect(() => {
    if (!hasRunning) return
    const timer = setInterval(() => {
      // Refresh the project too: a finished build changes activeDeploymentId.
      Promise.all([getProject(id), getDeployments(id)])
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

  async function handleDeploy() {
    setDeploying(true)
    setDeployError('')
    try {
      const deployment = await createDeployment(id)
      // Show it at the top right away; polling takes it from here.
      setDeployments((prev) => [deployment, ...prev])
    } catch (err) {
      setDeployError(getErrorMessage(err))
    } finally {
      setDeploying(false)
    }
  }

  if (loading) return <DetailSkeleton />
  if (error) return <DetailError error={error} onRetry={retry} />

  const myRole = project.members.find((m) => m.user.id === user.id)?.role
  // triggeredBy is a user id; show the member's username when we know it.
  const usernameOf = (userId) => project.members.find((m) => m.user.id === userId)?.user.username ?? `user #${userId}`

  return (
    <div>
      <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
        ← Back to projects
      </Link>

      {/* Header: name, role, links, Deploy button */}
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold">{project.name}</h1>
            {myRole && <RoleBadge role={myRole} />}
          </div>
          <div className="mt-1 flex flex-col gap-1 text-sm sm:flex-row sm:gap-4">
            {project.activeDeploymentId ? (
              <a href={liveUrl(project.name)} target="_blank" rel="noreferrer" className="truncate font-medium text-indigo-600 hover:underline">
                {project.name}.localhost:8000 ↗
              </a>
            ) : (
              <span className="text-gray-400">Not live yet</span>
            )}
            <a href={project.repoUrl} target="_blank" rel="noreferrer" className="truncate text-gray-500 hover:text-gray-900">
              {project.repoUrl.replace('https://', '')}
            </a>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Build <code className="rounded bg-gray-100 px-1 py-0.5">{project.buildCommand}</code> · Output{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">{project.outputDir}</code>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deploying ? 'Deploying…' : 'Deploy'}
          </button>
          {deployError && (
            <p role="alert" className="text-xs text-red-600">
              {deployError}
            </p>
          )}
        </div>
      </div>

      {/* Deployment history */}
      <h2 className="mt-8 mb-3 text-lg font-semibold">Deployments</h2>
      {deployments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="font-medium">No deployments yet</p>
          <p className="mt-1 text-sm text-gray-500">Click Deploy to build this project and put it online.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {deployments.map((d) => (
            <DeploymentRow
              key={d.id}
              deployment={d}
              isLive={d.id === project.activeDeploymentId}
              triggeredBy={usernameOf(d.triggeredBy)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function DeploymentRow({ deployment, isLive, triggeredBy }) {
  const { id, status, commitSha, createdAt, finishedAt } = deployment
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="w-24">
        <StatusBadge status={status} />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
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

function DetailError({ error, onRetry }) {
  const title =
    error.status === 404 ? 'Project not found' : error.status === 403 ? "You don't have access to this project" : 'Could not load this project'
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-medium text-red-700">{title}</p>
      {error.status !== 404 && error.status !== 403 && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
      <div className="mt-4 flex justify-center gap-2">
        {error.status !== 404 && error.status !== 403 && (
          <button onClick={onRetry} className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
            Retry
          </button>
        )}
        <Link to="/dashboard" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-100">
          Back to projects
        </Link>
      </div>
    </div>
  )
}
