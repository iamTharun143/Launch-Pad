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

// ---- Endpoints (see docs/api-contract.md) ----

// GET /api/me
export async function getMe() {
  if (USE_MOCKS) {
    await delay(300)
    return mock.me
  }
  const { data } = await api.get('/api/me')
  return data
}

// GET /api/projects
export async function getProjects() {
  if (USE_MOCKS) {
    await delay()
    return mock.getMyProjects()
  }
  const { data } = await api.get('/api/projects')
  return data
}

// POST /api/projects  body: { name, repoUrl, buildCommand, outputDir }
export async function createProject(project) {
  if (USE_MOCKS) {
    await delay()
    if (mock.projects.some((p) => p.name === project.name)) {
      throw mockError(400, 'A project with that name already exists')
    }
    return mock.addProject(project)
  }
  const { data } = await api.post('/api/projects', project)
  return data
}

export default api
