import express from 'express'
import prisma from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { requireRole } from '../middleware/requireRole.js'

const router = express.Router()

// All routes here require authentication
router.use(authMiddleware)

/**
 * GET /api/me
 * Returns current authenticated user
 */
router.get('/me', (req, res) => {
  res.json(req.user)
})

/**
 * GET /api/projects
 * Returns list of projects the current user is a member of, including their role
 */
router.get('/projects', async (req, res) => {
  try {
    const memberships = await prisma.member.findMany({
      where: { userId: req.user.id },
      include: {
        project: {
          include: {
            deployments: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, status: true },
            },
          },
        },
      },
      orderBy: {
        project: {
          createdAt: 'desc',
        },
      },
    })

    const projectsWithRoles = memberships.map((m) => {
      const latest = m.project.deployments?.[0]
      const { deployments, ...projectData } = m.project
      return {
        ...projectData,
        role: m.role,
        latestDeployment: latest ? { id: latest.id, status: latest.status } : null,
      }
    })

    res.json(projectsWithRoles)
  } catch (err) {
    console.error('[projects] GET /projects error:', err)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

/**
 * POST /api/projects
 * Body: { name, repoUrl, buildCommand, outputDir }
 * Creator becomes OWNER in a transaction. Validates name with ^[a-z0-9-]{3,30}$
 */
router.post('/projects', async (req, res) => {
  const { name, repoUrl, buildCommand, outputDir } = req.body || {}

  const cleanName = typeof name === 'string' ? name.toLowerCase().trim() : ''

  // Validate project subdomain name
  if (!cleanName || !/^[a-z0-9-]{3,30}$/.test(cleanName)) {
    return res.status(400).json({
      error: 'Project name must be 3-30 lowercase alphanumeric characters or hyphens',
    })
  }

  // Validate GitHub repo URL
  if (!repoUrl || typeof repoUrl !== 'string' || !repoUrl.trim()) {
    return res.status(400).json({ error: 'GitHub repository URL is required' })
  }

  try {
    // Check for duplicate name
    const existing = await prisma.project.findUnique({
      where: { name: cleanName },
    })

    if (existing) {
      return res.status(400).json({ error: `Project name "${cleanName}" is already taken` })
    }

    // Create project and assign current user as OWNER in a transaction
    const newProject = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: {
          name: cleanName,
          repoUrl: repoUrl.trim(),
          buildCommand: buildCommand?.trim() || 'npm run build',
          outputDir: outputDir?.trim() || 'dist',
        },
      })

      await tx.member.create({
        data: {
          projectId: proj.id,
          userId: req.user.id,
          role: 'OWNER',
        },
      })

      return proj
    })

    res.status(201).json({
      ...newProject,
      role: 'OWNER',
    })
  } catch (err) {
    console.error('[projects] POST /projects error:', err)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

/**
 * GET /api/projects/:id
 * Member permission. Returns { project, members: [{ ... }] }
 */
router.get('/projects/:id', requireRole(), async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
        },
      },
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json({
      project: {
        id: project.id,
        name: project.name,
        repoUrl: project.repoUrl,
        buildCommand: project.buildCommand,
        outputDir: project.outputDir,
        activeDeploymentId: project.activeDeploymentId,
        createdAt: project.createdAt,
        role: req.member.role,
      },
      members: project.members,
    })
  } catch (err) {
    console.error('[projects] GET /projects/:id error:', err)
    res.status(500).json({ error: 'Failed to fetch project details' })
  }
})

/**
 * DELETE /api/projects/:id
 * Owner permission. Deletes project. Returns 204 No Content.
 */
router.delete('/projects/:id', requireRole('OWNER'), async (req, res) => {
  try {
    await prisma.project.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (err) {
    console.error('[projects] DELETE /projects/:id error:', err)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

/**
 * POST /api/projects/:id/deployments
 * Owner, Developer. Triggers new build. Returns deployment row in QUEUED status.
 */
router.post('/projects/:id/deployments', requireRole('OWNER', 'DEVELOPER'), async (req, res) => {
  try {
    const deployment = await prisma.deployment.create({
      data: {
        projectId: req.params.id,
        status: 'QUEUED',
        commitSha: Math.random().toString(16).substring(2, 9), // Populated fully during git clone
        triggeredBy: req.user.username,
      },
    })

    res.status(201).json(deployment)
  } catch (err) {
    console.error('[projects] POST /deployments error:', err)
    res.status(500).json({ error: 'Failed to queue deployment' })
  }
})

/**
 * GET /api/projects/:id/deployments
 * Member permission. Returns list of deployments sorted newest first.
 */
router.get('/projects/:id/deployments', requireRole(), async (req, res) => {
  try {
    const deployments = await prisma.deployment.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: 'desc' },
    })

    res.json(deployments)
  } catch (err) {
    console.error('[projects] GET /deployments error:', err)
    res.status(500).json({ error: 'Failed to fetch deployments' })
  }
})

/**
 * POST /api/projects/:id/rollback
 * Owner, Developer. Body: { deploymentId }.
 * Checks target is READY and belongs to project, then sets activeDeploymentId.
 */
router.post('/projects/:id/rollback', requireRole('OWNER', 'DEVELOPER'), async (req, res) => {
  const { deploymentId } = req.body || {}

  if (!deploymentId) {
    return res.status(400).json({ error: 'Deployment ID is required for rollback' })
  }

  try {
    const targetDeployment = await prisma.deployment.findFirst({
      where: {
        id: deploymentId,
        projectId: req.params.id,
      },
    })

    if (!targetDeployment) {
      return res.status(404).json({ error: 'Deployment not found for this project' })
    }

    if (targetDeployment.status !== 'READY') {
      return res.status(400).json({ error: 'Cannot rollback to a deployment that is not in READY status' })
    }

    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: { activeDeploymentId: deploymentId },
    })

    res.json({
      project: updatedProject,
      message: `Active deployment rolled back to ${deploymentId}`,
    })
  } catch (err) {
    console.error('[projects] POST /rollback error:', err)
    res.status(500).json({ error: 'Failed to execute rollback' })
  }
})

/**
 * POST /api/projects/:id/members
 * Owner permission. Body: { username, role }.
 * Adds user by GitHub username with role OWNER, DEVELOPER, or VIEWER.
 */
router.post('/projects/:id/members', requireRole('OWNER'), async (req, res) => {
  const { username, role } = req.body || {}

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' })
  }

  if (!['OWNER', 'DEVELOPER', 'VIEWER'].includes(role)) {
    return res.status(400).json({ error: 'Role must be OWNER, DEVELOPER, or VIEWER' })
  }

  try {
    // Find or create user record by username
    let targetUser = await prisma.user.findFirst({
      where: { username: username.trim() },
    })

    if (!targetUser) {
      // Create user placeholder if not registered yet
      const randomGithubId = String(Math.floor(Math.random() * 9000000) + 1000000)
      targetUser = await prisma.user.create({
        data: {
          username: username.trim(),
          githubId: randomGithubId,
          avatarUrl: `https://avatars.githubusercontent.com/u/${randomGithubId}?v=4`,
        },
      })
    }

    // Check if already a member
    const existing = await prisma.member.findUnique({
      where: {
        projectId_userId: {
          projectId: req.params.id,
          userId: targetUser.id,
        },
      },
    })

    if (existing) {
      return res.status(400).json({ error: `User @${username} is already a member of this project` })
    }

    const newMember = await prisma.member.create({
      data: {
        projectId: req.params.id,
        userId: targetUser.id,
        role,
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    })

    res.status(201).json(newMember)
  } catch (err) {
    console.error('[projects] POST /members error:', err)
    res.status(500).json({ error: 'Failed to add member' })
  }
})

/**
 * PATCH /api/projects/:id/members/:memberId
 * Owner permission. Body: { role }.
 * Updates member's role.
 */
router.patch('/projects/:id/members/:memberId', requireRole('OWNER'), async (req, res) => {
  const { role } = req.body || {}

  if (!['OWNER', 'DEVELOPER', 'VIEWER'].includes(role)) {
    return res.status(400).json({ error: 'Role must be OWNER, DEVELOPER, or VIEWER' })
  }

  try {
    const member = await prisma.member.findFirst({
      where: {
        id: req.params.memberId,
        projectId: req.params.id,
      },
    })

    if (!member) {
      return res.status(404).json({ error: 'Member not found' })
    }

    // Guard: Prevent demoting the last Owner of the project
    if (member.role === 'OWNER' && role !== 'OWNER') {
      const ownerCount = await prisma.member.count({
        where: { projectId: req.params.id, role: 'OWNER' },
      })
      if (ownerCount <= 1) {
        return res.status(400).json({ error: 'A project needs at least one Owner' })
      }
    }

    const updated = await prisma.member.update({
      where: { id: member.id },
      data: { role },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    })

    res.json(updated)
  } catch (err) {
    console.error('[projects] PATCH /members/:memberId error:', err)
    res.status(500).json({ error: 'Failed to update member role' })
  }
})

/**
 * DELETE /api/projects/:id/members/:memberId
 * Owner permission. Removes member from project.
 */
router.delete('/projects/:id/members/:memberId', requireRole('OWNER'), async (req, res) => {
  try {
    const member = await prisma.member.findFirst({
      where: {
        id: req.params.memberId,
        projectId: req.params.id,
      },
    })

    if (!member) {
      return res.status(404).json({ error: 'Member not found' })
    }

    // Guard: Prevent removing the last Owner of the project
    if (member.role === 'OWNER') {
      const ownerCount = await prisma.member.count({
        where: { projectId: req.params.id, role: 'OWNER' },
      })
      if (ownerCount <= 1) {
        return res.status(400).json({ error: 'A project needs at least one Owner' })
      }
    }

    await prisma.member.delete({
      where: { id: member.id },
    })

    res.status(204).send()
  } catch (err) {
    console.error('[projects] DELETE /members/:memberId error:', err)
    res.status(500).json({ error: 'Failed to remove member' })
  }
})

export default router

