import axios from 'axios'
import { mockServer } from './mocks/mockServer'

// Token management helpers
export const TOKEN_KEY = 'launchpad_auth_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const removeToken = () => localStorage.removeItem(TOKEN_KEY)

const isMock = import.meta.env.VITE_USE_MOCKS === 'true'

// Create Axios client with Base URL from import.meta.env.VITE_API_URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  ...(isMock ? { adapter: (config) => mockServer.handleRequest(config) } : {}),
})

// Request interceptor: adds Bearer token
api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: logs out and redirects on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken()
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/auth')
      ) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

/* =========================================================================
   Contract API functions matching docs/api-contract.md
   ========================================================================= */

// Auth & User
export const getMe = () => api.get('/api/me').then((res) => res.data)

// Projects
export const getProjects = () => api.get('/api/projects').then((res) => res.data)
export const getProject = (id) => api.get(`/api/projects/${id}`).then((res) => res.data)
export const createProject = (projectData) => api.post('/api/projects', projectData).then((res) => res.data)
export const deleteProject = (id) => api.delete(`/api/projects/${id}`).then((res) => res.data)

// Deployments
export const getDeployments = (projectId) =>
  api.get(`/api/projects/${projectId}/deployments`).then((res) => res.data)
export const triggerDeployment = (projectId) =>
  api.post(`/api/projects/${projectId}/deployments`).then((res) => res.data)
export const getDeploymentLogs = (deploymentId, after = 0) =>
  api.get(`/api/deployments/${deploymentId}/logs`, { params: { after } }).then((res) => res.data)
export const rollbackDeployment = (projectId, deploymentId) =>
  api.post(`/api/projects/${projectId}/rollback`, { deploymentId }).then((res) => res.data)

// Project Members
export const addProjectMember = (projectId, { username, role }) =>
  api.post(`/api/projects/${projectId}/members`, { username, role }).then((res) => res.data)
export const updateMemberRole = (projectId, memberId, role) =>
  api.patch(`/api/projects/${projectId}/members/${memberId}`, { role }).then((res) => res.data)
export const removeProjectMember = (projectId, memberId) =>
  api.delete(`/api/projects/${projectId}/members/${memberId}`).then((res) => res.data)

export default api

