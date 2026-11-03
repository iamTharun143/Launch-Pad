import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { addMember, deleteProject, getErrorMessage, getProject, removeMember, updateMember } from '../api.js'
import { useAuth } from '../auth/useAuth.js'
import { useRole } from '../auth/useRole.js'
import { RoleBadge } from '../components/Badges.jsx'
import { usePageTitle } from '../usePageTitle.js'
import { ErrorState } from '../components/States.jsx'
import { describeLoadError } from '../utils.js'

const ROLE_OPTIONS = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'VIEWER', label: 'Viewer' },
]

// GitHub usernames: letters, numbers and single dashes, up to 39 characters.
const GITHUB_USERNAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/

export default function TeamSettings() {
  const { id } = useParams()
  const { user } = useAuth()

  const [project, setProject] = useState(null)
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
  }

  const [savingId, setSavingId] = useState(null) // member whose row is saving
  const [rowError, setRowError] = useState(null) // { memberId, message }

  const { canManageTeam, canDelete } = useRole(project)
  usePageTitle(project ? `Team · ${project.name}` : null)

  useEffect(() => {
    getProject(id)
      .then(setProject)
      .catch((err) => setError({ status: err.response?.status, message: getErrorMessage(err) }))
      .finally(() => setLoading(false))
  }, [id, attempt])

  function retry() {
    setLoading(true)
    setError(null)
    setAttempt((n) => n + 1)
  }

  // Helper: change the members list inside the project we already have.
  const setMembers = (update) => setProject((prev) => ({ ...prev, members: update(prev.members) }))

  async function handleRoleChange(member, role) {
    setSavingId(member.id)
    setRowError(null)
    try {
      const updated = await updateMember(id, member.id, { role })
      setMembers((list) => list.map((m) => (m.id === member.id ? updated : m)))
    } catch (err) {
      setRowError({ memberId: member.id, message: getErrorMessage(err) })
    } finally {
      setSavingId(null)
    }
  }

  async function handleRemove(member) {
    if (!window.confirm(`Remove ${member.user.username} from ${project.name}?`)) return
    setSavingId(member.id)
    setRowError(null)
    try {
      await removeMember(id, member.id)
      setMembers((list) => list.filter((m) => m.id !== member.id))
    } catch (err) {
      setRowError({ memberId: member.id, message: getErrorMessage(err) })
    } finally {
      setSavingId(null)
    }
  }

  const backLink = (
    <Link to={`/projects/${id}`} className="-my-1.5 inline-block py-1.5 text-sm text-gray-500 hover:text-gray-900">
      ← Back to project
    </Link>
  )

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="mt-4 h-8 w-56 rounded bg-gray-200" />
        <div className="mt-8 space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState {...describeLoadError(error, 'Could not load the team')} onRetry={retry} />
      </div>
    )
  }

  // Members and Viewers who type the address directly. (The API would refuse anyway.)
  if (!canManageTeam) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="font-medium">Only the project Owner can manage the team</p>
        <Link to={`/projects/${id}`} className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
          Back to {project.name}
        </Link>
      </div>
    )
  }

  const others = project.members.filter((m) => m.user.id !== user.id)

  return (
    <div className="mx-auto max-w-2xl">
      {backLink}
      <h1 className="mt-2 text-2xl font-bold">Team · {project.name}</h1>
      <p className="mt-1 text-sm text-gray-500">Owners manage the team. Developers can deploy and roll back. Viewers can only look.</p>

      <InviteForm
        projectId={id}
        onInvited={(member) => setMembers((list) => [...list, member])}
      />

      <h2 className="mt-8 mb-3 text-lg font-semibold">Members ({project.members.length})</h2>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
        {project.members.map((member) => {
          const isMe = member.user.id === user.id
          const saving = savingId === member.id
          return (
            <li key={member.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <img src={member.user.avatarUrl} alt="" className="size-9 rounded-full bg-gray-200" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {member.user.username} {isMe && <span className="font-normal text-gray-500">(you)</span>}
                  </p>
                  {saving && <p className="text-xs text-gray-500">Saving…</p>}
                </div>

                {/* Your own row is read-only, so the Owner can't lock themselves out. */}
                {isMe ? (
                  <RoleBadge role={member.role} />
                ) : (
                  // On phones this takes the full width (its own line), so names aren't cut off.
                  <div className="flex w-full items-center gap-2 pl-12 sm:w-auto sm:pl-0">
                    <label className="sr-only" htmlFor={`role-${member.id}`}>
                      Role for {member.user.username}
                    </label>
                    <select
                      id={`role-${member.id}`}
                      value={member.role}
                      disabled={saving}
                      onChange={(e) => handleRoleChange(member, e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60 sm:flex-none"
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemove(member)}
                      disabled={saving}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              {rowError?.memberId === member.id && (
                <p role="alert" className="mt-2 text-xs text-red-600">
                  {rowError.message}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      {others.length === 0 && (
        <p className="mt-3 text-center text-sm text-gray-500">Only you so far – invite a teammate above.</p>
      )}

      {canDelete && <DeleteProject project={project} />}
    </div>
  )
}

// "Danger zone": the Owner types the project name to unlock the Delete button,
// so a project can't be deleted by one accidental click.
function DeleteProject({ project }) {
  const navigate = useNavigate()
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const matches = confirmName === project.name

  async function handleDelete(event) {
    event.preventDefault()
    if (!matches) return
    setDeleting(true)
    setError('')
    try {
      await deleteProject(project.id)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleDelete} className="mt-10 rounded-xl border border-red-200 bg-white p-4">
      <h2 className="font-semibold text-red-700">Delete project</h2>
      <p className="mt-1 text-sm text-gray-600">
        Removes {project.name}, its deployments, logs and team, and takes {project.name}.localhost:8000 offline. This can't be undone.
      </p>
      <label htmlFor="confirm-name" className="mt-3 block text-sm">
        Type <code className="rounded bg-gray-100 px-1 py-0.5 font-semibold">{project.name}</code> to confirm
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="confirm-name"
          aria-label={`Type ${project.name} to confirm`}
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck="false"
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
        />
        <button
          type="submit"
          disabled={!matches || deleting}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete project'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </form>
  )
}

function InviteForm({ projectId, onInvited }) {
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('DEVELOPER')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setSuccess('')
    const name = username.trim().replace(/^@/, '') // allow "@name" too
    if (!GITHUB_USERNAME.test(name)) {
      setError('Enter a valid GitHub username (letters, numbers and dashes)')
      return
    }
    setInviting(true)
    setError('')
    try {
      const member = await addMember(projectId, { username: name, role })
      onInvited(member)
      setUsername('')
      setSuccess(`${member.user.username} was added. They'll see the project next time they log in.`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setInviting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Invite a member</h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="invite-username">
          GitHub username
        </label>
        <input
          id="invite-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="GitHub username"
          autoCapitalize="none"
          spellCheck="false"
          aria-invalid={Boolean(error)}
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <label className="sr-only" htmlFor="invite-role">
          Role
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={inviting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {inviting ? 'Inviting…' : 'Invite'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
      {success && <p className="mt-2 text-xs text-green-700">{success}</p>}
    </form>
  )
}
