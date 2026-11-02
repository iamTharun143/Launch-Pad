import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Rocket,
  RefreshCw,
  ArrowUpRight,
  Trash2,
  Play,
  Layers,
  FolderGit2,
  Lock,
  ExternalLink,
} from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/useAuth'
import { useRole } from '../hooks/useRole'
import { getProjects, createProject, deleteProject, triggerDeployment } from '../api'

function DashboardProjectCard({ project, onDelete, onDeploy, isActionRunning }) {
  const { role, isOwner, isViewer, canDeploy, canDeleteProject } = useRole(project)
  const isLive = Boolean(project.activeDeploymentId)

  return (
    <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 hover:border-dark-700 flex flex-col justify-between transition group shadow-sm">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between">
          <span
            className={`font-mono text-xs px-2.5 py-0.5 rounded-full border ${
              isOwner
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : isViewer
                  ? 'bg-purple-950/40 border-purple-500/30 text-purple-400'
                  : 'bg-blue-950/40 border-blue-500/30 text-blue-400'
            }`}
          >
            {role || 'MEMBER'}
          </span>

          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5 ${
              isLive
                ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20'
                : 'bg-dark-800 text-gray-400 border border-dark-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive ? 'bg-brand-500 animate-pulse' : 'bg-gray-500'
              }`}
            />
            {isLive ? 'LIVE' : 'NO DEPLOYMENT'}
          </span>
        </div>

        {/* Project Title & Live Subdomain */}
        <div className="mt-4">
          <Link
            to={`/projects/${project.id}`}
            className="text-lg font-bold text-white group-hover:text-brand-500 transition-colors font-mono flex items-center gap-1.5"
          >
            {project.name}
            <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {isLive ? (
            <a
              href={`http://${project.name}.localhost:8000`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-400 hover:underline inline-flex items-center gap-1 mt-1 font-mono"
            >
              <span>{project.name}.localhost:8000</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-xs text-gray-500 mt-1 font-mono">Not deployed yet</p>
          )}
        </div>

        {/* Repo link */}
        <div className="mt-3">
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 truncate font-mono"
          >
            <FolderGit2 className="w-3.5 h-3.5 shrink-0 text-gray-500" />
            <span className="truncate">{project.repoUrl.replace(/^https?:\/\/github\.com\//, '')}</span>
          </a>
        </div>

        {/* Build config */}
        <div className="mt-4 pt-3 border-t border-dark-800/80 text-[11px] text-gray-400 space-y-1 font-mono">
          <div className="flex justify-between">
            <span className="text-gray-500">Build:</span>
            <span>{project.buildCommand}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Output:</span>
            <span>{project.outputDir}/</span>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="mt-5 pt-3 border-t border-dark-800 flex items-center justify-between">
        <Link
          to={`/projects/${project.id}`}
          className="text-xs font-medium text-gray-300 hover:text-white transition"
        >
          View Details →
        </Link>

        <div className="flex items-center gap-1.5">
          {canDeploy && (
            <button
              onClick={() => onDeploy(project.id)}
              disabled={isActionRunning}
              className="px-2.5 py-1 text-xs rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium flex items-center gap-1 transition"
              title="Trigger new deployment"
            >
              <Play className="w-3 h-3" />
              Deploy
            </button>
          )}

          {canDeleteProject && (
            <button
              onClick={() => onDelete(project.id, project.name)}
              disabled={isActionRunning}
              className="p-1.5 rounded-lg hover:bg-red-950/40 text-gray-500 hover:text-red-400 transition"
              title="Delete project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {isViewer && (
            <span className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
              <Lock className="w-3 h-3" /> Read-only
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isActionRunning, setIsActionRunning] = useState(false)

  // New Project Form State
  const [formData, setFormData] = useState({
    name: '',
    repoUrl: '',
    buildCommand: 'npm run build',
    outputDir: 'dist',
  })
  const [formError, setFormError] = useState(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProjects()
      setProjects(data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    getProjects()
      .then((data) => {
        if (!ignore) {
          setProjects(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.response?.data?.error || err.message || 'Failed to fetch projects')
          setLoading(false)
        }
      })
    return () => {
      ignore = true
    }
  }, [])

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    // Subdomain validation matching contract: ^[a-z0-9-]{3,30}$
    const cleanName = formData.name.toLowerCase().trim()
    if (!/^[a-z0-9-]{3,30}$/.test(cleanName)) {
      setFormError('Project name must be 3-30 lowercase alphanumeric characters or hyphens')
      return
    }
    if (!formData.repoUrl.trim()) {
      setFormError('GitHub repository URL is required')
      return
    }

    setIsActionRunning(true)
    try {
      await createProject({
        name: cleanName,
        repoUrl: formData.repoUrl.trim(),
        buildCommand: formData.buildCommand.trim() || 'npm run build',
        outputDir: formData.outputDir.trim() || 'dist',
      })
      setIsModalOpen(false)
      setFormData({
        name: '',
        repoUrl: '',
        buildCommand: 'npm run build',
        outputDir: 'dist',
      })
      await loadProjects()
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Could not create project')
    } finally {
      setIsActionRunning(false)
    }
  }

  const handleDelete = async (projectId, projectName) => {
    if (!confirm(`Are you sure you want to permanently delete project "${projectName}"?`)) return
    setIsActionRunning(true)
    try {
      await deleteProject(projectId)
      await loadProjects()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete project')
    } finally {
      setIsActionRunning(false)
    }
  }

  const handleDeploy = async (projectId) => {
    setIsActionRunning(true)
    try {
      await triggerDeployment(projectId)
      alert('Deployment queued successfully!')
      await loadProjects()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to trigger deployment')
    } finally {
      setIsActionRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 text-gray-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-dark-800">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Projects</h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage and deploy your web applications to localhost subdomains.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadProjects}
              disabled={loading}
              className="p-2 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 text-gray-400 hover:text-white transition"
              title="Refresh projects"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-brand-500/10 transition"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center animate-pulse">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-mono text-gray-400">Loading projects...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="my-8 p-6 rounded-2xl bg-red-950/20 border border-red-900/40 text-center max-w-md mx-auto">
            <p className="font-semibold text-red-300">Unable to load projects</p>
            <p className="text-xs text-red-400 font-mono mt-1 mb-4">{error}</p>
            <button
              onClick={loadProjects}
              className="px-4 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/60 text-xs text-red-200 transition font-mono"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div className="my-16 p-12 rounded-3xl bg-dark-900/40 border border-dark-800 border-dashed text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-dark-800 flex items-center justify-center text-gray-500 mx-auto mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">No projects found</h3>
            <p className="text-sm text-gray-400 mt-2 mb-6">
              You aren't a member of any projects yet. Create your first project to start deploying.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium inline-flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {projects.map((proj) => (
              <DashboardProjectCard
                key={proj.id}
                project={proj}
                onDelete={handleDelete}
                onDeploy={handleDeploy}
                isActionRunning={isActionRunning}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-dark-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center">
                  <Rocket className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-lg">Create New Project</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-xs font-mono">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1.5">
                  Subdomain Name *
                </label>
                <div className="flex items-center rounded-xl bg-dark-950 border border-dark-700 px-3 py-2 focus-within:border-brand-500">
                  <input
                    type="text"
                    required
                    placeholder="my-portfolio"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      })
                    }
                    className="bg-transparent w-full text-sm text-white placeholder-gray-500 focus:outline-none font-mono"
                  />
                  <span className="text-xs text-gray-500 font-mono">.localhost:8000</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 font-mono">
                  3-30 lowercase letters, numbers, or hyphens.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1.5">
                  GitHub Repository URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder={`https://github.com/${user?.username || 'user'}/repo`}
                  value={formData.repoUrl}
                  onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                  className="w-full rounded-xl bg-dark-950 border border-dark-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-gray-300 mb-1.5">
                    Build Command
                  </label>
                  <input
                    type="text"
                    value={formData.buildCommand}
                    onChange={(e) => setFormData({ ...formData, buildCommand: e.target.value })}
                    className="w-full rounded-xl bg-dark-950 border border-dark-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-300 mb-1.5">
                    Output Directory
                  </label>
                  <input
                    type="text"
                    value={formData.outputDir}
                    onChange={(e) => setFormData({ ...formData, outputDir: e.target.value })}
                    className="w-full rounded-xl bg-dark-950 border border-dark-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-dark-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionRunning}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-medium transition flex items-center gap-1.5"
                >
                  {isActionRunning ? 'Creating...' : 'Create & Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
