// Launches all three backend components in a single unified process:
// 1. API Server on port 5000
// 2. Site Server on port 8000
// 3. Deployment Build Worker
import './index.js'
import './site-server.js'
import './worker.js'

