import {
  mockCurrentUser,
  mockUsers,
  initialProjects,
  initialMembers,
  initialDeployments,
  initialLogs,
} from './data'

class MockServer {
  constructor() {
    this.reset()
  }

  reset() {
    this.currentUser = { ...mockCurrentUser }
    this.users = [...mockUsers]
    this.projects = JSON.parse(JSON.stringify(initialProjects))
    this.members = JSON.parse(JSON.stringify(initialMembers))
    this.deployments = JSON.parse(JSON.stringify(initialDeployments))
    this.logs = JSON.parse(JSON.stringify(initialLogs))
  }

  // Delay simulation for realistic network latency
  async delay(ms = 150) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  createResponse(status, data) {
    return {
      status,
      data,
      headers: {},
      config: {},
    }
  }

  createError(status, message) {
    const error = new Error(message)
    error.response = {
      status,
      data: { error: message },
    }
    return Promise.reject(error)
  }

  getUserRole(projectId) {
    const member = this.members.find(
      (m) => m.projectId === projectId && m.userId === this.currentUser.id
    )
    return member ? member.role : null
  }

  async handleRequest(config) {
    await this.delay()

    const method = config.method ? config.method.toUpperCase() : 'GET'
    const fullUrl = config.url || ''
    // Strip base URL and query params
    const urlWithoutQuery = fullUrl.split('?')[0].replace(/^https?:\/\/[^/]+/, '')
    const searchParams = new URLSearchParams(fullUrl.includes('?') ? fullUrl.split('?')[1] : '')
    const body = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {}

    // Check token if not /auth routes
    const authHeader = config.headers?.Authorization || config.headers?.authorization
    if (!urlWithoutQuery.startsWith('/auth') && (!authHeader || !authHeader.startsWith('Bearer '))) {
      return this.createError(401, 'Unauthorized: Missing or invalid token')
    }

    // 1. GET /api/me
    if (method === 'GET' && urlWithoutQuery === '/api/me') {
      return this.createResponse(200, { ...this.currentUser })
    }

    // 2. GET /api/projects
    if (method === 'GET' && urlWithoutQuery === '/api/projects') {
      const userProjects = this.projects
        .filter((p) => this.getUserRole(p.id) !== null)
        .map((p) => ({
          ...p,
          role: this.getUserRole(p.id),
        }))
      return this.createResponse(200, userProjects)
    }

    // 3. POST /api/projects
    if (method === 'POST' && urlWithoutQuery === '/api/projects') {
      const { name, repoUrl, buildCommand, outputDir } = body
      if (!name || !/^[a-z0-9-]{3,30}$/.test(name)) {
        return this.createError(400, 'Project name must be 3-30 lowercase alphanumeric characters or hyphens')
      }
      if (!repoUrl) {
        return this.createError(400, 'GitHub repository URL is required')
      }
      if (this.projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        return this.createError(400, `Project name "${name}" is already taken`)
      }

      const newProject = {
        id: `proj_${Date.now()}`,
        name: name.toLowerCase().trim(),
        repoUrl: repoUrl.trim(),
        buildCommand: buildCommand?.trim() || 'npm run build',
        outputDir: outputDir?.trim() || 'dist',
        activeDeploymentId: null,
        createdAt: new Date().toISOString(),
        role: 'OWNER',
      }
      this.projects.push(newProject)

      // Add user as OWNER
      this.members.push({
        id: `mem_${Date.now()}`,
        projectId: newProject.id,
        userId: this.currentUser.id,
        role: 'OWNER',
        user: { ...this.currentUser },
      })

      return this.createResponse(201, newProject)
    }

    // 4. GET /api/projects/:id
    const projectMatch = urlWithoutQuery.match(/^\/api\/projects\/([^/]+)$/)
    if (method === 'GET' && projectMatch) {
      const projectId = projectMatch[1]
      const project = this.projects.find((p) => p.id === projectId)
      if (!project) {
        return this.createError(404, 'Project not found')
      }
      const role = this.getUserRole(projectId)
      if (!role) {
        return this.createError(403, 'Forbidden: You are not a member of this project')
      }

      const projectMembers = this.members.filter((m) => m.projectId === projectId)
      return this.createResponse(200, {
        project: { ...project, role },
        members: projectMembers,
      })
    }

    // 5. DELETE /api/projects/:id
    if (method === 'DELETE' && projectMatch) {
      const projectId = projectMatch[1]
      const role = this.getUserRole(projectId)
      if (role !== 'OWNER') {
        return this.createError(403, 'Only project owners can delete this project')
      }
      this.projects = this.projects.filter((p) => p.id !== projectId)
      this.members = this.members.filter((m) => m.projectId !== projectId)
      return this.createResponse(204, null)
    }

    // 6. POST /api/projects/:id/deployments
    const newDeployMatch = urlWithoutQuery.match(/^\/api\/projects\/([^/]+)\/deployments$/)
    if (method === 'POST' && newDeployMatch) {
      const projectId = newDeployMatch[1]
      const role = this.getUserRole(projectId)
      if (!role || (role !== 'OWNER' && role !== 'DEVELOPER')) {
        return this.createError(403, 'Forbidden: Insufficient permissions to trigger deployments')
      }

      const depId = `dep_${Date.now()}`
      const newDeployment = {
        id: depId,
        projectId,
        status: 'QUEUED',
        commitSha: Math.random().toString(16).substring(2, 9),
        triggeredBy: this.currentUser.username,
        createdAt: new Date().toISOString(),
        finishedAt: null,
      }
      this.deployments.unshift(newDeployment)
      this.logs[depId] = [
        { id: 1, deploymentId: depId, line: `[queued] Build queued by ${this.currentUser.username}...`, createdAt: new Date().toISOString() },
      ]

      // Asynchronously advance build simulation
      setTimeout(() => {
        newDeployment.status = 'BUILDING'
        this.logs[depId].push(
          { id: 2, deploymentId: depId, line: '[build] Cloning repository...', createdAt: new Date().toISOString() },
          { id: 3, deploymentId: depId, line: '[build] Executing npm run build...', createdAt: new Date().toISOString() }
        )
      }, 1000)

      setTimeout(() => {
        newDeployment.status = 'READY'
        newDeployment.finishedAt = new Date().toISOString()
        const project = this.projects.find((p) => p.id === projectId)
        if (project) {
          project.activeDeploymentId = depId
        }
        this.logs[depId].push(
          { id: 4, deploymentId: depId, line: '[vite] ✓ built in 1.42s', createdAt: new Date().toISOString() },
          { id: 5, deploymentId: depId, line: `[ready] Deployment live at http://${project?.name || 'app'}.localhost:8000`, createdAt: new Date().toISOString() }
        )
      }, 2500)

      return this.createResponse(201, newDeployment)
    }

    // 7. GET /api/projects/:id/deployments
    if (method === 'GET' && newDeployMatch) {
      const projectId = newDeployMatch[1]
      const role = this.getUserRole(projectId)
      if (!role) {
        return this.createError(403, 'Forbidden: You are not a member of this project')
      }
      const projectDeployments = this.deployments
        .filter((d) => d.projectId === projectId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return this.createResponse(200, projectDeployments)
    }

    // 8. GET /api/deployments/:id/logs
    const logsMatch = urlWithoutQuery.match(/^\/api\/deployments\/([^/]+)\/logs$/)
    if (method === 'GET' && logsMatch) {
      const deploymentId = logsMatch[1]
      const deployment = this.deployments.find((d) => d.id === deploymentId)
      if (!deployment) {
        return this.createError(404, 'Deployment not found')
      }
      const role = this.getUserRole(deployment.projectId)
      if (!role) {
        return this.createError(403, 'Forbidden: You are not a member of this project')
      }

      const after = Number(searchParams.get('after') || 0)
      const allLogs = this.logs[deploymentId] || []
      const filteredLogs = allLogs.filter((l) => l.id > after)

      return this.createResponse(200, {
        logs: filteredLogs,
        status: deployment.status,
      })
    }

    // 9. POST /api/projects/:id/rollback
    const rollbackMatch = urlWithoutQuery.match(/^\/api\/projects\/([^/]+)\/rollback$/)
    if (method === 'POST' && rollbackMatch) {
      const projectId = rollbackMatch[1]
      const role = this.getUserRole(projectId)
      if (!role || (role !== 'OWNER' && role !== 'DEVELOPER')) {
        return this.createError(403, 'Forbidden: Only owners and developers can rollback')
      }
      const { deploymentId } = body
      const deployment = this.deployments.find((d) => d.id === deploymentId && d.projectId === projectId)
      if (!deployment) {
        return this.createError(404, 'Deployment not found for this project')
      }
      if (deployment.status !== 'READY') {
        return this.createError(400, 'Cannot rollback to a deployment that is not READY')
      }
      const project = this.projects.find((p) => p.id === projectId)
      if (!project) {
        return this.createError(404, 'Project not found')
      }
      project.activeDeploymentId = deploymentId
      return this.createResponse(200, { project, message: `Active deployment rolled back to ${deploymentId}` })
    }

    // 10. POST /api/projects/:id/members
    const membersMatch = urlWithoutQuery.match(/^\/api\/projects\/([^/]+)\/members$/)
    if (method === 'POST' && membersMatch) {
      const projectId = membersMatch[1]
      const role = this.getUserRole(projectId)
      if (role !== 'OWNER') {
        return this.createError(403, 'Forbidden: Only project owners can manage members')
      }
      const { username, role: newMemberRole } = body
      if (!username || !['OWNER', 'DEVELOPER', 'VIEWER'].includes(newMemberRole)) {
        return this.createError(400, 'Valid username and role (OWNER, DEVELOPER, VIEWER) are required')
      }

      let targetUser = this.users.find((u) => u.username.toLowerCase() === username.toLowerCase())
      if (!targetUser) {
        targetUser = {
          id: `usr_${Date.now()}`,
          githubId: String(Math.floor(Math.random() * 90000000) + 10000000),
          username,
          avatarUrl: `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 100000)}?v=4`,
          createdAt: new Date().toISOString(),
        }
        this.users.push(targetUser)
      }

      const existingMember = this.members.find(
        (m) => m.projectId === projectId && m.userId === targetUser.id
      )
      if (existingMember) {
        return this.createError(400, `User @${username} is already a member of this project`)
      }

      const newMember = {
        id: `mem_${Date.now()}`,
        projectId,
        userId: targetUser.id,
        role: newMemberRole,
        user: targetUser,
      }
      this.members.push(newMember)
      return this.createResponse(201, newMember)
    }

    // 11. PATCH /api/projects/:id/members/:memberId
    const memberItemMatch = urlWithoutQuery.match(/^\/api\/projects\/([^/]+)\/members\/([^/]+)$/)
    if (method === 'PATCH' && memberItemMatch) {
      const [_, projectId, memberId] = memberItemMatch
      const role = this.getUserRole(projectId)
      if (role !== 'OWNER') {
        return this.createError(403, 'Forbidden: Only project owners can edit member roles')
      }
      const member = this.members.find((m) => m.id === memberId && m.projectId === projectId)
      if (!member) {
        return this.createError(404, 'Member not found')
      }
      const { role: updatedRole } = body
      if (!['OWNER', 'DEVELOPER', 'VIEWER'].includes(updatedRole)) {
        return this.createError(400, 'Invalid role. Must be OWNER, DEVELOPER, or VIEWER')
      }
      member.role = updatedRole
      return this.createResponse(200, member)
    }

    // 12. DELETE /api/projects/:id/members/:memberId
    if (method === 'DELETE' && memberItemMatch) {
      const [_, projectId, memberId] = memberItemMatch
      const role = this.getUserRole(projectId)
      if (role !== 'OWNER') {
        return this.createError(403, 'Forbidden: Only project owners can remove members')
      }
      const index = this.members.findIndex((m) => m.id === memberId && m.projectId === projectId)
      if (index === -1) {
        return this.createError(404, 'Member not found')
      }
      this.members.splice(index, 1)
      return this.createResponse(204, null)
    }

    return this.createError(404, `Endpoint not found: ${method} ${urlWithoutQuery}`)
  }
}

export const mockServer = new MockServer()

