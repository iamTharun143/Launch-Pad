// Fake data shaped exactly like docs/api-contract.md.
// Used until the real API (Role B) is ready; on Day 3 the pages switch to src/api.js.
// Each export is named after the endpoint whose response it imitates.

// ---- users (GET /api/me returns one of these) ----
export const users = [
  { id: 1, githubId: 1001, username: 'ajay-dev', avatarUrl: 'https://avatars.githubusercontent.com/u/1001', createdAt: '2026-11-01T09:00:00.000Z' },
  { id: 2, githubId: 1002, username: 'teammate-b', avatarUrl: 'https://avatars.githubusercontent.com/u/1002', createdAt: '2026-11-01T09:05:00.000Z' },
  { id: 3, githubId: 1003, username: 'viewer-friend', avatarUrl: 'https://avatars.githubusercontent.com/u/1003', createdAt: '2026-11-01T09:10:00.000Z' },
]

// The logged-in user while we use fake data.
export const me = users[0]

// ---- projects table ----
export const projects = [
  { id: 1, name: 'portfolio', repoUrl: 'https://github.com/ajay-dev/portfolio', buildCommand: 'npm run build', outputDir: 'dist', activeDeploymentId: 3, createdAt: '2026-11-01T10:00:00.000Z' },
  { id: 2, name: 'todo-app', repoUrl: 'https://github.com/teammate-b/todo-app', buildCommand: 'npm run build', outputDir: 'dist', activeDeploymentId: null, createdAt: '2026-11-01T11:00:00.000Z' },
  { id: 3, name: 'landing-page', repoUrl: 'https://github.com/teammate-b/landing-page', buildCommand: 'npm run build', outputDir: 'build', activeDeploymentId: 6, createdAt: '2026-11-01T12:00:00.000Z' },
]

// ---- members table (user 1 has a different role in each project) ----
export const members = [
  { id: 1, projectId: 1, userId: 1, role: 'OWNER' },
  { id: 2, projectId: 1, userId: 2, role: 'DEVELOPER' },
  { id: 3, projectId: 1, userId: 3, role: 'VIEWER' },
  { id: 4, projectId: 2, userId: 2, role: 'OWNER' },
  { id: 5, projectId: 2, userId: 1, role: 'DEVELOPER' },
  { id: 6, projectId: 3, userId: 2, role: 'OWNER' },
  { id: 7, projectId: 3, userId: 1, role: 'VIEWER' },
]

// ---- deployments table (every status appears at least once) ----
export const deployments = [
  { id: 1, projectId: 1, status: 'READY', commitSha: 'a1b2c3d', triggeredBy: 1, createdAt: '2026-11-01T10:05:00.000Z', finishedAt: '2026-11-01T10:05:40.000Z' },
  { id: 2, projectId: 1, status: 'FAILED', commitSha: 'e4f5a6b', triggeredBy: 2, createdAt: '2026-11-01T14:00:00.000Z', finishedAt: '2026-11-01T14:00:25.000Z' },
  { id: 3, projectId: 1, status: 'READY', commitSha: 'c7d8e9f', triggeredBy: 1, createdAt: '2026-11-02T09:00:00.000Z', finishedAt: '2026-11-02T09:00:35.000Z' },
  { id: 4, projectId: 2, status: 'BUILDING', commitSha: '1a2b3c4', triggeredBy: 1, createdAt: '2026-11-02T10:00:00.000Z', finishedAt: null },
  { id: 5, projectId: 2, status: 'QUEUED', commitSha: null, triggeredBy: 2, createdAt: '2026-11-02T10:01:00.000Z', finishedAt: null },
  { id: 6, projectId: 3, status: 'READY', commitSha: '5d6e7f8', triggeredBy: 2, createdAt: '2026-11-01T12:10:00.000Z', finishedAt: '2026-11-01T12:10:50.000Z' },
]

// ---- logs table ----
export const logs = [
  { id: 1, deploymentId: 3, line: 'Cloning https://github.com/ajay-dev/portfolio ...', createdAt: '2026-11-02T09:00:01.000Z' },
  { id: 2, deploymentId: 3, line: '$ npm install', createdAt: '2026-11-02T09:00:05.000Z' },
  { id: 3, deploymentId: 3, line: 'added 212 packages in 14s', createdAt: '2026-11-02T09:00:19.000Z' },
  { id: 4, deploymentId: 3, line: '$ npm run build', createdAt: '2026-11-02T09:00:20.000Z' },
  { id: 5, deploymentId: 3, line: 'vite v8.3.5 building for production...', createdAt: '2026-11-02T09:00:21.000Z' },
  { id: 6, deploymentId: 3, line: '✓ built in 1.84s', createdAt: '2026-11-02T09:00:33.000Z' },
  { id: 7, deploymentId: 3, line: 'Copied dist/ to deployments/3/', createdAt: '2026-11-02T09:00:35.000Z' },
  { id: 8, deploymentId: 2, line: '$ npm run build', createdAt: '2026-11-01T14:00:20.000Z' },
  { id: 9, deploymentId: 2, line: "Error: Cannot find module './Header'", createdAt: '2026-11-01T14:00:24.000Z' },
  { id: 10, deploymentId: 2, line: 'Build failed with exit code 1', createdAt: '2026-11-01T14:00:25.000Z' },
  { id: 11, deploymentId: 4, line: 'Cloning https://github.com/teammate-b/todo-app ...', createdAt: '2026-11-02T10:00:01.000Z' },
  { id: 12, deploymentId: 4, line: '$ npm install', createdAt: '2026-11-02T10:00:04.000Z' },
]

// ---------------------------------------------------------------
// Helpers that build endpoint-shaped responses from the tables above.
// The extra fields (role, activeDeployment, user) are the shapes listed
// under "Open questions" in docs/api-contract.md; confirm them with Role B.
// ---------------------------------------------------------------

const findUser = (userId) => users.find((u) => u.id === userId)

// GET /api/projects -> projects I'm a member of, with my role and newest deployment
export function getMyProjects(userId = me.id) {
  return members
    .filter((m) => m.userId === userId)
    .map((m) => {
      const project = projects.find((p) => p.id === m.projectId)
      const latest = getDeployments(project.id)[0]
      return {
        ...project,
        role: m.role,
        latestDeployment: latest ? { id: latest.id, status: latest.status } : null,
      }
    })
}

// POST /api/projects -> new project; the creator becomes OWNER.
// Only lives in memory, so it disappears when the page reloads.
export function addProject({ name, repoUrl, buildCommand, outputDir }, userId = me.id) {
  const project = {
    id: Math.max(...projects.map((p) => p.id)) + 1,
    name,
    repoUrl,
    buildCommand,
    outputDir,
    activeDeploymentId: null,
    createdAt: new Date().toISOString(),
  }
  projects.push(project)
  members.push({ id: Math.max(...members.map((m) => m.id)) + 1, projectId: project.id, userId, role: 'OWNER' })
  return project
}

// GET /api/projects/:id -> project + members (each with its user)
export function getProject(projectId) {
  const project = projects.find((p) => p.id === Number(projectId))
  if (!project) return null
  return {
    ...project,
    members: members
      .filter((m) => m.projectId === project.id)
      .map((m) => {
        const { id, username, avatarUrl } = findUser(m.userId)
        return { ...m, user: { id, username, avatarUrl } }
      }),
  }
}

// GET /api/projects/:id/deployments -> newest first
export function getDeployments(projectId) {
  return deployments
    .filter((d) => d.projectId === Number(projectId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

// GET /api/deployments/:id/logs?after=<logId>
export function getLogs(deploymentId, after = 0) {
  return logs.filter((l) => l.deploymentId === Number(deploymentId) && l.id > after)
}
