import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import projectsRoutes from './routes/projects.js'
import deploymentsRoutes from './routes/deployments.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logger for debugging
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`[api] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`)
  })
  next()
})

// Root Health Check
app.get('/', (req, res) => {
  res.json({
    name: 'Launchpad API Server',
    status: 'healthy',
    version: '1.0.0',
    endpoints: {
      auth: '/auth/*',
      projects: '/api/projects',
      me: '/api/me',
      deployments: '/api/deployments/:id/logs',
    },
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Mount contract routes
app.use('/auth', authRoutes)
app.use('/api', projectsRoutes)
app.use('/api/deployments', deploymentsRoutes)

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` })
})

// Global Error Handler conforming strictly to { error: "message" }
app.use((err, req, res, _next) => {
  console.error('[api] Unhandled server error:', err)
  const status = err.status || 500
  const message = err.message || 'Internal Server Error'
  res.status(status).json({ error: message })
})

app.listen(PORT, () => {
  console.log(`[api] Launchpad API Server listening on port ${PORT}`)
  console.log(`[api] Ready for requests from ${process.env.CLIENT_URL || 'http://localhost:5173'}`)
})

export default app

