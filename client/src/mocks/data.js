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
]

// ---------------------------------------------------------------
// Helpers that build endpoint-shaped responses from the tables above.
// The extra fields (role, latestDeployment, user) are the shapes listed
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
  advanceSimulatedDeployments() // so activeDeploymentId is up to date
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

// My role in a project, or null if I'm not a member (the server would answer 403).
export function getRole(projectId, userId = me.id) {
  return members.find((m) => m.projectId === Number(projectId) && m.userId === userId)?.role ?? null
}

// ---------------------------------------------------------------
// Fake build worker: deployments listed here move forward on their own,
// like the real worker would: QUEUED (0-3 s) -> BUILDING (3-10 s) -> READY.
// Projects with "broken" in the name end as FAILED instead.
// ---------------------------------------------------------------
const QUEUED_MS = 3000
const BUILD_MS = 10000
const simulated = new Map() // deploymentId -> { startedAt (ms), emitted (log lines written so far) }

// The fake build output: [ms after queueing, text]. Lines appear once their time has passed.
function buildScript(project, deployment) {
  const common = [
    [3000, `Cloning ${project.repoUrl} (depth 1)...`],
    [3600, `HEAD is now at ${deployment.commitSha}`],
    [4200, '$ npm install'],
    [5500, 'added 214 packages, and audited 215 packages in 6s'],
    [6000, 'found 0 vulnerabilities'],
    [6500, `$ ${project.buildCommand}`],
    [7200, '> vite build'],
    [7800, 'vite v8.3.5 building for production...'],
    [8600, '✓ 32 modules transformed.'],
  ]
  if (project.name.includes('broken')) {
    return common.concat([
      [9200, 'error during build:'],
      [9400, '[vite]: Rollup failed to resolve import "./Header" from "src/App.jsx".'],
      [9800, 'Build failed: command exited with code 1'],
      [10000, `Deployment #${deployment.id} FAILED`],
    ])
  }
  return common.concat([
    [9200, `${project.outputDir}/index.html                 0.45 kB`],
    [9500, '✓ built in 1.62s'],
    [9800, `Copied ${project.outputDir}/ to deployments/${deployment.id}/`],
    [10000, `Deployment #${deployment.id} is READY`],
  ])
}

function advanceSimulatedDeployments() {
  const now = Date.now()
  for (const [id, sim] of simulated) {
    const deployment = deployments.find((d) => d.id === id)
    const project = projects.find((p) => p.id === deployment.projectId)
    const elapsed = now - sim.startedAt
    if (elapsed < QUEUED_MS) continue

    deployment.commitSha ??= Math.random().toString(16).slice(2, 9)

    // Write every log line whose time has come.
    const script = buildScript(project, deployment)
    while (sim.emitted < script.length && script[sim.emitted][0] <= elapsed) {
      const [at, line] = script[sim.emitted]
      logs.push({ id: Math.max(...logs.map((l) => l.id)) + 1, deploymentId: id, line, createdAt: new Date(sim.startedAt + at).toISOString() })
      sim.emitted++
    }

    if (elapsed < BUILD_MS) {
      deployment.status = 'BUILDING'
      continue
    }
    // Every fake build "takes" BUILD_MS, counted from when the deployment was created.
    deployment.finishedAt = new Date(new Date(deployment.createdAt).getTime() + BUILD_MS).toISOString()
    if (project.name.includes('broken')) {
      deployment.status = 'FAILED'
    } else {
      deployment.status = 'READY'
      project.activeDeploymentId = deployment.id
    }
    simulated.delete(id)
  }
}

// The two unfinished sample deployments (todo-app) finish soon after page load.
simulated.set(4, { startedAt: Date.now() - 5000, emitted: 0 })
simulated.set(5, { startedAt: Date.now(), emitted: 0 })

// POST /api/projects/:id/deployments -> new QUEUED deployment
export function addDeployment(projectId, userId = me.id) {
  const deployment = {
    id: Math.max(...deployments.map((d) => d.id)) + 1,
    projectId: Number(projectId),
    status: 'QUEUED',
    commitSha: null,
    triggeredBy: userId,
    createdAt: new Date().toISOString(),
    finishedAt: null,
  }
  deployments.push(deployment)
  simulated.set(deployment.id, { startedAt: Date.now(), emitted: 0 })
  return { ...deployment }
}

// GET /api/projects/:id/deployments -> newest first
export function getDeployments(projectId) {
  advanceSimulatedDeployments()
  return deployments
    .filter((d) => d.projectId === Number(projectId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((d) => ({ ...d }))
}

// GET /api/deployments/:id/logs?after=<logId> -> oldest first
export function getLogs(deploymentId, after = 0) {
  advanceSimulatedDeployments()
  return logs
    .filter((l) => l.deploymentId === Number(deploymentId) && l.id > Number(after))
    .map((l) => ({ ...l }))
}

// Which project a deployment belongs to (the real API checks membership this way).
export const getDeploymentProjectId = (deploymentId) =>
  deployments.find((d) => d.id === Number(deploymentId))?.projectId ?? null

// ---------------------------------------------------------------
// Team members and rollback
// ---------------------------------------------------------------

const memberWithUser = (m) => {
  const { id, username, avatarUrl } = findUser(m.userId)
  return { ...m, user: { id, username, avatarUrl } }
}

// POST /api/projects/:id/members -> new member (with user).
// A username that has never logged in gets a user row now, so they see
// the project on their first login (open question for Role B).
export function addMember(projectId, username, role) {
  let user = users.find((u) => u.username.toLowerCase() === username.toLowerCase())
  if (!user) {
    const id = Math.max(...users.map((u) => u.id)) + 1
    user = { id, githubId: 1000 + id, username, avatarUrl: `https://avatars.githubusercontent.com/u/${1000 + id}`, createdAt: new Date().toISOString() }
    users.push(user)
  }
  if (members.some((m) => m.projectId === Number(projectId) && m.userId === user.id)) return null
  const member = { id: Math.max(...members.map((m) => m.id)) + 1, projectId: Number(projectId), userId: user.id, role }
  members.push(member)
  return memberWithUser(member)
}

export const findMember = (projectId, memberId) =>
  members.find((m) => m.id === Number(memberId) && m.projectId === Number(projectId)) ?? null

export const countOwners = (projectId) =>
  members.filter((m) => m.projectId === Number(projectId) && m.role === 'OWNER').length

// PATCH /api/projects/:id/members/:memberId -> updated member
export function updateMemberRole(member, role) {
  member.role = role
  return memberWithUser(member)
}

// DELETE /api/projects/:id/members/:memberId
export function deleteMember(member) {
  members.splice(members.indexOf(member), 1)
}

// POST /api/projects/:id/rollback -> updated project (with members)
export function setActiveDeployment(projectId, deploymentId) {
  const deployment = deployments.find((d) => d.id === Number(deploymentId) && d.projectId === Number(projectId))
  if (!deployment || deployment.status !== 'READY') return null
  projects.find((p) => p.id === Number(projectId)).activeDeploymentId = deployment.id
  return getProject(projectId)
}
