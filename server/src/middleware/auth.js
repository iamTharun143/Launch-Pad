import jwt from 'jsonwebtoken'
import prisma from '../db.js'

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]
  const secret = process.env.JWT_SECRET || 'launchpad-dev-secret-jwt-key-2026'

  try {
    const decoded = jwt.verify(token, secret)
    
    // Look up the user in database to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, githubId: true, username: true, avatarUrl: true, createdAt: true },
    })

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User account not found' })
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Token has expired' })
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication token' })
  }
}

export default authMiddleware

