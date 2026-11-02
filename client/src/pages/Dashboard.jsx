import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage, getProjects } from '../api.js'
import { RoleBadge, StatusBadge } from '../components/Badges.jsx'
import { liveUrl } from '../utils.js'
import { usePageTitle } from '../usePageTitle.js'
import { EmptyState, ErrorState } from '../components/States.jsx'

const POLL_MS = 2000

export default function Dashboard() {
  usePageTitle('Projects')
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Bumping this number makes the effect below run again (used by Retry).
  const [attempt, setAttempt] = useState(0)

  // Load the projects when the page opens, and again on every Retry.
  // State is only set inside .then/.catch, i.e. after the request finishes.
  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [attempt])

  // While any project is QUEUED or BUILDING, refresh every 2 s so its badge
  // changes by itself (same idea as the Project detail page).
  const hasRunning = projects.some((p) => ['QUEUED', 'BUILDING'].includes(p.latestDeployment?.status))
  useEffect(() => {
    if (!hasRunning) return
    const timer = setInterval(() => {
      getProjects()
        .then(setProjects)
        .catch(() => {}) // keep the last list; the next tick tries again
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [hasRunning])

  function retry() {
    setLoading(true)
    setError('')
    setAttempt((n) => n + 1)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Link to="/projects/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
          New Project
        </Link>
      </div>

      {loading ? (
        <ProjectGrid>
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-32 animate-pulse rounded-xl border border-gray-200 bg-white" />
          ))}
        </ProjectGrid>
      ) : error ? (
        <ErrorState title="Could not load projects" message={error} onRetry={retry} showBackLink={false} />
      ) : projects.length === 0 ? (
        <EmptyState title="No projects yet" text="Create your first project to deploy a GitHub repo.">
          <Link to="/projects/new" className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
            New Project
          </Link>
        </EmptyState>
      ) : (
        <ProjectGrid>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </ProjectGrid>
      )}
    </div>
  )
}

function ProjectGrid({ children }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

function ProjectCard({ project }) {
  return (
    // "relative" + the title link's "after:" box makes the whole card clickable,
    // while the live-site link (z-10) stays clickable on its own.
    <div className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/projects/${project.id}`} className="truncate font-semibold after:absolute after:inset-0">
          {project.name}
        </Link>
        <RoleBadge role={project.role} />
      </div>
      {project.activeDeploymentId ? (
        <a
          href={liveUrl(project.name)}
          target="_blank"
          rel="noreferrer"
          className="relative z-10 mt-1 block truncate text-sm text-indigo-600 hover:underline"
        >
          {project.name}.localhost:8000
        </a>
      ) : (
        <p className="mt-1 text-sm text-gray-400">Not live yet</p>
      )}
      <div className="mt-4">
        <StatusBadge status={project.latestDeployment?.status ?? null} />
      </div>
    </div>
  )
}
