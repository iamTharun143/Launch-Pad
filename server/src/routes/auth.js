import express from 'express'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import prisma from '../db.js'

const router = express.Router()

// Helper to sign JWT valid for 7 days
function signUserToken(user) {
  const secret = process.env.JWT_SECRET || 'launchpad-dev-secret-jwt-key-2026'
  return jwt.sign(
    { id: user.id, username: user.username, githubId: user.githubId },
    secret,
    { expiresIn: '7d' }
  )
}

/**
 * GET /auth/github
 * Redirects user to GitHub OAuth login page
 */
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

  // If GitHub OAuth credentials are not provided, offer seamless dev mock login
  if (!clientId) {
    console.log('[auth] GITHUB_CLIENT_ID not set. Redirecting to dev mock login callback.')
    return res.redirect(`${clientUrl}/auth/callback?token=mock_jwt_token_for_dev`)
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user`
  res.redirect(githubAuthUrl)
})

/**
 * GET /auth/github/callback
 * Exchanges authorization code for an access token, fetches profile,
 * upserts user in DB, signs 7-day JWT, and redirects to client.
 */
router.get('/github/callback', async (req, res) => {
  const { code } = req.query
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

  if (!code) {
    return res.redirect(`${clientUrl}/login?error=missing_code`)
  }

  try {
    let profileData

    // Check if real GitHub OAuth app credentials exist
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      // 1. Exchange code for access token
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: { Accept: 'application/json' },
        }
      )

      const accessToken = tokenResponse.data?.access_token
      if (!accessToken) {
        console.error('[auth] GitHub OAuth error:', tokenResponse.data)
        return res.redirect(`${clientUrl}/login?error=oauth_exchange_failed`)
      }

      // 2. Fetch GitHub profile
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Launchpad-Platform',
        },
      })

      profileData = userResponse.data
    } else {
      // Fallback dev profile if running in offline/mock mode
      profileData = {
        id: 583231,
        login: 'octocat',
        avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
      }
    }

    // 3. Upsert user in database
    const user = await prisma.user.upsert({
      where: { githubId: String(profileData.id) },
      update: {
        username: profileData.login,
        avatarUrl: profileData.avatar_url,
      },
      create: {
        githubId: String(profileData.id),
        username: profileData.login,
        avatarUrl: profileData.avatar_url,
      },
    })

    // 4. Sign JWT session token valid for 7 days
    const token = signUserToken(user)

    // 5. Redirect to frontend with token
    res.redirect(`${clientUrl}/auth/callback?token=${token}`)
  } catch (err) {
    console.error('[auth] GitHub callback error:', err.response?.data || err.message)
    res.redirect(`${clientUrl}/login?error=authentication_failed`)
  }
})

/**
 * POST /auth/dev-token (Convenience endpoint for curl testing & dev)
 * Generates a valid JWT for any username without going through browser redirect
 */
router.post('/dev-token', async (req, res) => {
  const username = req.body?.username || 'octocat'
  const githubId = String(req.body?.githubId || Math.floor(Math.random() * 900000) + 100000)
  const avatarUrl =
    req.body?.avatarUrl || `https://avatars.githubusercontent.com/u/${githubId}?v=4`

  try {
    const user = await prisma.user.upsert({
      where: { githubId },
      update: { username, avatarUrl },
      create: { githubId, username, avatarUrl },
    })

    const token = signUserToken(user)
    res.json({ token, user })
  } catch (err) {
    console.error('[auth] dev-token error:', err)
    res.status(500).json({ error: 'Failed to generate token' })
  }
})

export default router

