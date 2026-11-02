import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  FolderGit2,
  Play,
  RotateCcw,
  Users,
  Trash2,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Lock,
} from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { LogViewer } from '../components/LogViewer'
import { useRole } from '../hooks/useRole'
import {
  getProject,
  getDeployments,
  triggerDeployment,
  rollbackDeployment,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  updateMemberRole,
} from '../api'

export function ProjectDetail() {
  const { id } = useParams()
  const [projectData, setProjectData] = useState(null)
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('deployments') // 'deployments' | 'team'
  const [selectedDeployment, setSelectedDeployment] = useState(null)
  const [isBusy, setIsBusy] = useState(false)

  // Member form state
  const [newMemberUsername, setNewMemberUsername] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('DEVELOPER')

  const project = projectData?.project
  const members = projectData?.members || []
  const { role, isOwner, isViewer, canDeploy, canRollback, canManageMembers, canDeleteProject } =
    useRole(project)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pData, dData] = await Promise.all([getProject(id), getDeployments(id)])
      setProjectData(pData)
      setDeployments(dData)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load project details')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let ignore = false
    Promise.all([getProject(id), getDeployments(id)])
      .then(([pData, dData]) => {
        if (!ignore) {
          setProjectData(pData)
          setDeployments(dData)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.response?.data?.error || err.message || 'Failed to load project details')
          setLoading(false)
        }
      })
    return () => {
      ignore = true
    }
  }, [id])

  const handleTriggerDeploy = async () => {
    setIsBusy(true)
    try {
      const newDeployment = await triggerDeployment(id)
      setSelectedDeployment(newDeployment)
      await loadData()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to queue deployment')
    } finally {
      setIsBusy(false)
    }
  }

  const handleRollback = async (deploymentId) => {
    if (!confirm(`Rollback live site to deployment ${deploymentId}?`)) return
    setIsBusy(true)
    try {
      await rollbackDeployment(id, deploymentId)
      await loadData()
    } catch (err) {
      alert(err.response?.data?.error || 'Rollback failed')
    } finally {
      setIsBusy(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${project?.name}"?`)) return
    setIsBusy(true)
    try {
      await deleteProject(id)
      window.location.href = '/'
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed')
      setIsBusy(false)
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!newMemberUsername.trim()) return
    setIsBusy(true)
    try {
      await addProjectMember(id, {
        username: newMemberUsername.trim(),
        role: newMemberRole,
      })
      setNewMemberUsername('')
      await loadData()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add member')
    } finally {
      setIsBusy(false)
    }
  }

  const handleRemoveMember = async (memberId, username) => {
    if (!confirm(`Remove @${username} from project?`)) return
    setIsBusy(true)
    try {
      await removeProjectMember(id, memberId)
      await loadData()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member')
    } finally {
      setIsBusy(false)
    }
  }

  const handleUpdateRole = async (memberId, updatedRole) => {
    setIsBusy(true)
    try {
      await updateMemberRole(id, memberId, updatedRole)
      await loadData()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 text-gray-100 flex flex-col font-sans">
      <Navbar currentProjectName={project?.name} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
        </Link>

        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center animate-pulse">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-mono text-gray-400">Loading project details...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 rounded-2xl bg-red-950/20 border border-red-900/40 text-center max-w-md mx-auto my-12">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white">Project Error</h2>
            <p className="text-xs text-red-300 font-mono mt-2 mb-6">{error}</p>
            <Link
              to="/"
              className="px-4 py-2 rounded-xl bg-dark-900 border border-dark-700 hover:border-dark-600 text-xs font-mono text-white transition"
            >
              Return to Dashboard
            </Link>
          </div>
        )}

        {/* Project View */}
        {!loading && !error && project && (
          <div>
            {/* Project Header Banner */}
            <div className="p-6 rounded-2xl bg-dark-900 border border-dark-800 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-sm">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white font-mono">{project.name}</h1>
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
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-mono">
                  {project.activeDeploymentId ? (
                    <a
                      href={`http://${project.name}.localhost:8000`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-400 hover:underline flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                      <span>{project.name}.localhost:8000</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      No active deployment
                    </span>
                  )}

                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-gray-400 hover:text-white flex items-center gap-1.5"
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>{project.repoUrl.replace(/^https?:\/\/github\.com\//, '')}</span>
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={loadData}
                  disabled={loading || isBusy}
                  className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-400 hover:text-white transition"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
                </button>

                {canDeploy && (
                  <button
                    onClick={handleTriggerDeploy}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-2 shadow-lg shadow-brand-500/10 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {isBusy ? 'Queuing...' : 'Deploy Now'}
                  </button>
                )}

                {canDeleteProject && (
                  <button
                    onClick={handleDeleteProject}
                    disabled={isBusy}
                    className="p-2 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 transition"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mt-8 border-b border-dark-800 pb-2">
              <button
                onClick={() => setActiveTab('deployments')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                  activeTab === 'deployments'
                    ? 'bg-dark-800 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Deployments ({deployments.length})
              </button>

              <button
                onClick={() => setActiveTab('team')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                  activeTab === 'team' ? 'bg-dark-800 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Team &amp; Roles ({members.length})
              </button>
            </div>

            {/* Tab 1: Deployments List */}
            {activeTab === 'deployments' && (
              <div className="mt-6 space-y-3">
                {deployments.length === 0 ? (
                  <div className="p-12 rounded-2xl bg-dark-900/30 border border-dark-800 text-center">
                    <p className="text-sm text-gray-400 font-mono">No deployments yet.</p>
                    {canDeploy && (
                      <button
                        onClick={handleTriggerDeploy}
                        className="mt-4 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Trigger First Build
                      </button>
                    )}
                  </div>
                ) : (
                  deployments.map((dep) => {
                    const isLiveDeployment = project.activeDeploymentId === dep.id
                    return (
                      <div
                        key={dep.id}
                        className="p-4 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition"
                      >
                        <div className="flex items-center gap-3">
                          {/* Status Icon */}
                          <div>
                            {dep.status === 'READY' ? (
                              <CheckCircle2 className="w-5 h-5 text-brand-500" />
                            ) : dep.status === 'FAILED' ? (
                              <XCircle className="w-5 h-5 text-red-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-yellow-500 animate-spin" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-sm font-semibold text-white">
                                {dep.status}
                              </span>
                              {isLiveDeployment && (
                                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 font-bold">
                                  Current Live
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>commit: {dep.commitSha}</span>
                              <span>•</span>
                              <span>by @{dep.triggeredBy}</span>
                              <span>•</span>
                              <span>{new Date(dep.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedDeployment(dep)}
                            className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-xs font-mono text-gray-300 hover:text-white flex items-center gap-1.5 transition"
                            title="View deployment logs"
                          >
                            <Terminal className="w-3.5 h-3.5 text-brand-500" />
                            Logs
                          </button>

                          {canRollback && dep.status === 'READY' && !isLiveDeployment && (
                            <button
                              onClick={() => handleRollback(dep.id)}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-700 text-xs font-mono text-gray-300 hover:text-white flex items-center gap-1 transition"
                              title="Rollback to this deployment"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Rollback
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* Tab 2: Team Members & Roles */}
            {activeTab === 'team' && (
              <div className="mt-6 space-y-6">
                {/* Add member form (Owner only) */}
                {canManageMembers && (
                  <form
                    onSubmit={handleAddMember}
                    className="p-5 rounded-2xl bg-dark-900 border border-dark-800 flex flex-col sm:flex-row items-center gap-3"
                  >
                    <input
                      type="text"
                      required
                      placeholder="GitHub username (e.g. alex-developer)"
                      value={newMemberUsername}
                      onChange={(e) => setNewMemberUsername(e.target.value)}
                      className="flex-1 w-full rounded-xl bg-dark-950 border border-dark-700 px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 font-mono"
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="w-full sm:w-36 rounded-xl bg-dark-950 border border-dark-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                    >
                      <option value="DEVELOPER">DEVELOPER</option>
                      <option value="VIEWER">VIEWER</option>
                      <option value="OWNER">OWNER</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isBusy || !newMemberUsername}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-medium transition"
                    >
                      Add Member
                    </button>
                  </form>
                )}

                {!canManageMembers && (
                  <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-800 text-xs text-gray-400 font-mono flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span>Only project owners can invite or edit team members.</span>
                  </div>
                )}

                {/* Members list */}
                <div className="divide-y divide-dark-800 rounded-2xl bg-dark-900 border border-dark-800 overflow-hidden">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={member.user?.avatarUrl}
                          alt={member.user?.username}
                          className="w-8 h-8 rounded-full border border-dark-700"
                        />
                        <div>
                          <p className="text-sm font-semibold text-white font-mono">
                            @{member.user?.username}
                          </p>
                          <span className="text-[11px] text-gray-500 font-mono">
                            ID: {member.userId}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {canManageMembers ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                            className="rounded-lg bg-dark-950 border border-dark-700 px-2 py-1 text-xs text-white font-mono"
                          >
                            <option value="OWNER">OWNER</option>
                            <option value="DEVELOPER">DEVELOPER</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        ) : (
                          <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-dark-800 text-gray-300">
                            {member.role}
                          </span>
                        )}

                        {canManageMembers && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.user?.username)}
                            className="p-1.5 rounded hover:bg-red-950/40 text-gray-500 hover:text-red-400 transition"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Realtime Terminal Log Viewer Modal */}
      {selectedDeployment && (
        <LogViewer
          deployment={selectedDeployment}
          onClose={() => {
            setSelectedDeployment(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}

export default ProjectDetail
