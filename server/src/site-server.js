import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import express from 'express'
import prisma from './db.js'

dotenv.config()

const app = express()
const SITE_PORT = process.env.SITE_PORT || 8000
const DEPLOYMENTS_ROOT = path.join(process.cwd(), 'deployments')

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Extracts the project subdomain from the Host header.
 * Example: 'portfolio.localhost:8000' -> 'portfolio'
 * Supports query param (?project=name) or header (x-project: name) as local fallback.
 */
function extractSubdomain(req) {
  const host = req.headers.host || ''
  const hostname = host.split(':')[0] // strip port

  // If request arrives via IPv4 or IPv6 literal or plain localhost
  const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === '::1'
  if (isIp || hostname === 'localhost') {
    if (req.query.project) {
      return String(req.query.project).toLowerCase().trim()
    }
    if (req.headers['x-project']) {
      return String(req.headers['x-project']).toLowerCase().trim()
    }
    return null
  }

  const parts = hostname.split('.')

  // *.localhost or *.domain.com (e.g. portfolio.localhost)
  if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www') {
    return parts[0].toLowerCase()
  }

  // Fallback for direct port 8000 queries
  if (req.query.project) {
    return String(req.query.project).toLowerCase().trim()
  }

  if (req.headers['x-project']) {
    return String(req.headers['x-project']).toLowerCase().trim()
  }

  return null
}

// Subdomain routing & static file server
app.use(async (req, res) => {
  const subdomain = extractSubdomain(req)

  // 1. If no subdomain specified, show platform welcome page
  if (!subdomain) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Launchpad Site Server</title>
          <style>
            body { background: #090a0f; color: #e5e7eb; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #0f111a; border: 1px solid #1c2030; padding: 32px; border-radius: 16px; max-width: 480px; text-align: center; }
            h1 { color: #10b981; font-size: 24px; margin-bottom: 8px; }
            p { color: #9ca3af; font-size: 14px; line-height: 1.5; }
            code { background: #1c2030; padding: 2px 6px; border-radius: 4px; color: #fff; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Launchpad Site Server</h1>
            <p>Access deployed frontend sites using their assigned subdomain:</p>
            <p><code>http://&lt;project-name&gt;.localhost:8000</code></p>
          </div>
        </body>
      </html>
    `)
  }

  try {
    // 2. Find project in database
    const project = await prisma.project.findUnique({
      where: { name: subdomain },
    })

    if (!project) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>404 - Project Not Found</title>
            <style>
              body { background: #090a0f; color: #e5e7eb; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .box { background: #0f111a; border: 1px solid #282e44; padding: 32px; border-radius: 12px; text-align: center; }
              h1 { color: #ef4444; font-size: 20px; }
              p { color: #9ca3af; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="box">
              <h1>404 - Project Not Found</h1>
              <p>No project named "<strong>${escapeHtml(subdomain)}</strong>" is registered on Launchpad.</p>
            </div>
          </body>
        </html>
      `)
    }

    // 3. Verify project has an active deployment
    if (!project.activeDeploymentId) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>404 - No Active Deployment</title>
            <style>
              body { background: #090a0f; color: #e5e7eb; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .box { background: #0f111a; border: 1px solid #282e44; padding: 32px; border-radius: 12px; text-align: center; }
              h1 { color: #f59e0b; font-size: 20px; }
              p { color: #9ca3af; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="box">
              <h1>No Active Deployment</h1>
              <p>Project "<strong>${escapeHtml(project.name)}</strong>" has not completed any successful deployments yet.</p>
            </div>
          </body>
        </html>
      `)
    }

    // 4. Resolve deployment directory
    const deployDir = path.join(DEPLOYMENTS_ROOT, project.activeDeploymentId)
    if (!fs.existsSync(deployDir)) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>500 - Assets Missing</title>
            <style>
              body { background: #090a0f; color: #e5e7eb; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .box { background: #0f111a; border: 1px solid #ef4444; padding: 32px; border-radius: 12px; text-align: center; }
              h1 { color: #ef4444; font-size: 20px; }
              p { color: #9ca3af; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="box">
              <h1>Deployment Assets Missing</h1>
              <p>The build directory for deployment <code>${escapeHtml(project.activeDeploymentId)}</code> was not found on disk.</p>
            </div>
          </body>
        </html>
      `)
    }

    // 5. Serve requested static file or fallback to index.html for SPA client-side routes
    const requestedFile = req.path === '/' ? 'index.html' : req.path.replace(/^\//, '')
    const targetFilePath = path.join(deployDir, requestedFile)

    if (fs.existsSync(targetFilePath) && fs.statSync(targetFilePath).isFile()) {
      return res.sendFile(targetFilePath)
    }

    // SPA Fallback: serve index.html for client-side routing
    const indexFallback = path.join(deployDir, 'index.html')
    if (fs.existsSync(indexFallback)) {
      return res.sendFile(indexFallback)
    }

    res.status(404).send('Not Found')
  } catch (err) {
    console.error('[site-server] Error serving request:', err)
    res.status(500).send('Internal Server Error')
  }
})

app.listen(SITE_PORT, '0.0.0.0', () => {
  console.log(`[site-server] Launchpad Site Server listening on port ${SITE_PORT}`)
  console.log(`[site-server] Routing *.localhost:${SITE_PORT} to active deployments`)
})

export default app

