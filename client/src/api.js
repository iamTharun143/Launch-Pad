import axios from 'axios'
import * as mock from './mocks/data.js'

// The only file that talks to the server. Pages call the functions at the
// bottom (getMe, getProjects, ...) and never use axios directly.
//
// VITE_USE_MOCKS=true in .env  -> answers come from src/mocks/data.js
// VITE_USE_MOCKS=false         -> real requests to VITE_API_URL (Role B's API)

export const API_URL = import.meta.env.VITE_API_URL
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

// ---- Token storage ----
const TOKEN_KEY = 'launchpad_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// ---- Axios instance ----
const api = axios.create({ baseURL: API_URL })

// Runs before every request: attach the JWT if we have one.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Runs after every response: a 401 means the token is missing or expired,
// so log out and go to the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)

// Turns any failed request into a sentence we can show the user.
// The API always sends errors as { "error": "message" }.
export function getErrorMessage(error) {
  if (error.response?.data?.error) return error.response.data.error
  if (error.response) return `Request failed (${error.response.status})`
  if (error.request) return 'Cannot reach the server. Is the API running on port 5000?'
  return error.message || 'Something went wrong'
}

// ---- Mock helpers ----
// Wait a little so loading states are visible, like a real network call.
const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms))

// Builds an error that looks like an axios error, so getErrorMessage works the same.
function mockError(status, message) {
  const error = new Error(message)
  error.response = { status, data: { error: message } }
  return error
}

// Which fake user is logged in: the token is "mock-token-<userId>".
// The plain "mock-token" from earlier days means user 1.
function mockUserId() {
  const match = /^mock-token-(\d+)$/.exec(getToken() ?? '')
  return match ? Number(match[1]) : 1
}

// ---- Endpoints (see docs/api-contract.md) ----

// GET /api/me
export async function getMe() {
  if (USE_MOCKS) {
    await delay(300)
    return mock.users.find((u) => u.id === mockUserId()) ?? mock.me
  }
  const { data } = await api.get('/api/me')
  return data
}

// GET /api/projects
export async function getProjects() {
  if (USE_MOCKS) {
    await delay()
    return mock.getMyProjects(mockUserId())
  }
  const { data } = await api.get('/api/projects')
  // The server's list has no deployment info, so ask each project for its newest
  // deployment (one small request per project) to fill the Dashboard status badge.
  return Promise.all(
    data.map(async (project) => {
      try {
        const { data: deployments } = await api.get(`/api/projects/${project.id}/deployments`)
        const latest = deployments[0]
        return { ...project, latestDeployment: latest ? { id: latest.id, status: latest.status } : null }
      } catch {
        return { ...project, latestDeployment: null }
      }
    }),
  )
}

// POST /api/projects  body: { name, repoUrl, buildCommand, outputDir }
export async function createProject(project) {
  if (USE_MOCKS) {
    await delay()
    if (mock.projects.some((p) => p.name === project.name)) {
      throw mockError(400, 'A project with that name already exists')
    }
    return mock.addProject(project, mockUserId())
  }
  const { data } = await api.post('/api/projects', project)
  return data
}

// GET /api/projects/:id -> project + members
export async function getProject(id) {
  if (USE_MOCKS) {
    await delay()
    const project = mock.getProject(id)
    if (!project) throw mockError(404, 'Project not found')
    if (!mock.getRole(id, mockUserId())) throw mockError(403, 'You are not a member of this project')
    return project
  }
  const { data } = await api.get(`/api/projects/${id}`)
  // The server answers { project, members }; pages use one object: { ...project, members }.
  return { ...data.project, members: data.members }
}

// GET /api/projects/:id/deployments -> newest first
export async function getDeployments(projectId) {
  if (USE_MOCKS) {
    await delay(300)
    return mock.getDeployments(projectId)
  }
  const { data } = await api.get(`/api/projects/${projectId}/deployments`)
  return data
}

// POST /api/projects/:id/deployments -> new QUEUED deployment
export async function createDeployment(projectId) {
  if (USE_MOCKS) {
    await delay(300)
    const role = mock.getRole(projectId, mockUserId())
    if (role !== 'OWNER' && role !== 'DEVELOPER') {
      throw mockError(403, 'Only Owners and Developers can deploy')
    }
    return mock.addDeployment(projectId, mockUserId())
  }
  const { data } = await api.post(`/api/projects/${projectId}/deployments`)
  return data
}

// GET /api/deployments/:id/logs?after=<logId> -> only lines newer than `after`, oldest first
export async function getLogs(deploymentId, after = 0) {
  if (USE_MOCKS) {
    await delay(150)
    const projectId = mock.getDeploymentProjectId(deploymentId)
    if (!projectId) throw mockError(404, 'Deployment not found')
    if (!mock.getRole(projectId, mockUserId())) throw mockError(403, 'You are not a member of this project')
    return mock.getLogs(deploymentId, after)
  }
  const { data } = await api.get(`/api/deployments/${deploymentId}/logs`, { params: { after } })
  // The server answers { logs, status }; the log viewer only needs the lines.
  return data.logs
}

// Mock-only: the same permission checks the real server does.
function mockRequireRole(projectId, allowed, message) {
  if (!mock.getRole(projectId, mockUserId())) throw mockError(403, 'You are not a member of this project')
  if (!allowed.includes(mock.getRole(projectId, mockUserId()))) throw mockError(403, message)
}

const ROLES = ['OWNER', 'DEVELOPER', 'VIEWER']

// POST /api/projects/:id/rollback  body: { deploymentId } -> updated project (without members)
export async function rollback(projectId, deploymentId) {
  if (USE_MOCKS) {
    await delay(400)
    mockRequireRole(projectId, ['OWNER', 'DEVELOPER'], 'Only Owners and Developers can roll back')
    const project = mock.setActiveDeployment(projectId, deploymentId)
    if (!project) throw mockError(400, 'You can only roll back to a READY deployment of this project')
    return project
  }
  const { data } = await api.post(`/api/projects/${projectId}/rollback`, { deploymentId })
  // The server answers { project, message }.
  return data.project
}

// POST /api/projects/:id/members  body: { username, role } -> new member (with user)
export async function addMember(projectId, { username, role }) {
  if (USE_MOCKS) {
    await delay()
    mockRequireRole(projectId, ['OWNER'], 'Only the Owner can manage the team')
    if (!ROLES.includes(role)) throw mockError(400, 'Role must be OWNER, DEVELOPER or VIEWER')
    const member = mock.addMember(projectId, username, role)
    if (!member) throw mockError(400, `${username} is already a member of this project`)
    return member
  }
  const { data } = await api.post(`/api/projects/${projectId}/members`, { username, role })
  return data
}

// PATCH /api/projects/:id/members/:memberId  body: { role } -> updated member
export async function updateMember(projectId, memberId, { role }) {
  if (USE_MOCKS) {
    await delay(400)
    mockRequireRole(projectId, ['OWNER'], 'Only the Owner can manage the team')
    const member = mock.findMember(projectId, memberId)
    if (!member) throw mockError(404, 'Member not found')
    if (member.role === 'OWNER' && role !== 'OWNER' && mock.countOwners(projectId) === 1) {
      throw mockError(400, 'A project needs at least one Owner')
    }
    return mock.updateMemberRole(member, role)
  }
  const { data } = await api.patch(`/api/projects/${projectId}/members/${memberId}`, { role })
  return data
}

// DELETE /api/projects/:id/members/:memberId -> 204, nothing returned
export async function removeMember(projectId, memberId) {
  if (USE_MOCKS) {
    await delay(400)
    mockRequireRole(projectId, ['OWNER'], 'Only the Owner can manage the team')
    const member = mock.findMember(projectId, memberId)
    if (!member) throw mockError(404, 'Member not found')
    if (member.role === 'OWNER' && mock.countOwners(projectId) === 1) {
      throw mockError(400, 'A project needs at least one Owner')
    }
    mock.deleteMember(member)
    return
  }
  await api.delete(`/api/projects/${projectId}/members/${memberId}`)
}

// DELETE /api/projects/:id -> 204, nothing returned (Owner only)
export async function deleteProject(projectId) {
  if (USE_MOCKS) {
    await delay(600)
    mockRequireRole(projectId, ['OWNER'], 'Only the Owner can delete a project')
    mock.deleteProject(projectId)
    return
  }
  await api.delete(`/api/projects/${projectId}`)
}

export default api
