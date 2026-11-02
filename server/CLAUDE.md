# Server (Role B)
- Express app in src/, Prisma schema in prisma/schema.prisma.
- Files: src/index.js (API), src/worker.js (builds), src/site-server.js (port 8000).
- Every /api/projects/:id route uses auth + requireRole middleware following the permissions table. Never trust the client.
- Shell commands: child_process.spawn with an args array, 5 min timeout.
- Project names must match ^[a-z0-9-]{3,30}$.
- Secrets only from process.env. Update .env.example.
- Do not edit anything in /client.

