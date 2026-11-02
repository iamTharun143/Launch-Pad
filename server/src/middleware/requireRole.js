import prisma from '../db.js'

/**
 * Role-Based Access Control middleware for project routes.
 *
 * @param {...string} allowedRoles - 'OWNER' | 'DEVELOPER' | 'VIEWER'
 */
export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    const projectId = req.params.id || req.params.projectId

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    try {
      const member = await prisma.member.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: req.user.id,
          },
        },
        include: {
          project: true,
        },
      })

      if (!member) {
        return res.status(403).json({ error: 'Forbidden: You are not a member of this project' })
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        return res.status(403).json({
          error: `Forbidden: Action requires role [${allowedRoles.join(' or ')}]. Your role is ${member.role}`,
        })
      }

      req.member = member
      req.project = member.project
      next()
    } catch (err) {
      console.error('requireRole error:', err)
      return res.status(500).json({ error: 'Internal server error checking permissions' })
    }
  }
}

export default requireRole

