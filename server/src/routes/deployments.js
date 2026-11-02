import express from 'express'
import prisma from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

router.use(authMiddleware)

/**
 * GET /api/deployments/:id/logs?after=<logId>
 * Member of project permission.
 * Returns { logs: [{ id, deploymentId, line, createdAt }], status }
 */
router.get('/:id/logs', async (req, res) => {
  const deploymentId = req.params.id
  const afterId = req.query.after ? Number(req.query.after) : 0

  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        project: {
          include: {
            members: {
              where: { userId: req.user.id },
            },
          },
        },
      },
    })

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' })
    }

    // Verify requesting user is a member of this deployment's project
    if (!deployment.project.members || deployment.project.members.length === 0) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this project' })
    }

    // Query logs newer than afterId
    const logs = await prisma.log.findMany({
      where: {
        deploymentId,
        ...(afterId > 0 ? { id: { gt: afterId } } : {}),
      },
      orderBy: { id: 'asc' },
    })

    res.json({
      logs,
      status: deployment.status,
    })
  } catch (err) {
    console.error('[deployments] GET /:id/logs error:', err)
    res.status(500).json({ error: 'Failed to fetch deployment logs' })
  }
})

export default router

