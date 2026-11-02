# Launchpad Server (Role B: Backend & Deploy Engine)

Backend API, automated build engine, and subdomain static site server for Launchpad (mini-Vercel).

## Architecture

```
                  ┌─────────────────────────────────────────┐
                  │          React Client (5173)            │
                  └────────────────────┬────────────────────┘
                                       │ REST API + Bearer JWT
                                       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ Express API Server (5000)                                                  │
│ - GitHub OAuth & 7-day JWT sessions                                       │
│ - Projects & Members RBAC (/api/projects)                                 │
│ - Deployments Trigger & Logs (/api/projects/:id/deployments)              │
└──────────────────────┬────────────────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ PostgreSQL (Supabase) via Prisma ORM                                      │
│ - users, projects, members, deployments, logs                             │
└──────────────────────▲───────────────────────────────▲────────────────────┘
                       │ polls QUEUED rows             │ reads active
                       │ every 3s                      │ deployment ID
┌──────────────────────┴───────────────┐ ┌─────────────┴────────────────────┐
│ Build Worker Engine (worker.js)      │ │ Subdomain Site Server (8000)     │
│ - git clone --depth 1                │ │ - Reads Host header              │
│ - npm install                        │ │ - <name>.localhost:8000          │
│ - npm run build (or custom command)  │ │ - Serves static build files      │
│ - saves stdout/stderr to logs table  │ │ - SPA index.html fallback        │
│ - copies output to deployments/<id>/ │ └──────────────────────────────────┘
└──────────────────────────────────────┘
```

---

## Prerequisites & Setup

### 1. Database Setup (Supabase PostgreSQL)
1. Go to [database.new](https://database.new) and create a free Supabase project.
2. In your Supabase Dashboard, navigate to **Project Settings** → **Database**.
3. Under **Connection String**, select **URI** and copy the connection string.
4. Paste it into `server/.env` as `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   ```
5. Apply the schema migration:
   ```bash
   cd server
   npm run db:push
   ```

### 2. GitHub OAuth App Setup
1. Go to [GitHub Developer Settings](https://github.com/settings/developers) → **New OAuth App**.
2. Fill in:
   - **Application name**: `Launchpad Local`
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5000/auth/github/callback`
3. Generate a Client Secret and copy both `Client ID` and `Client Secret` into `server/.env`:
   ```env
   GITHUB_CLIENT_ID="your_client_id"
   GITHUB_CLIENT_SECRET="your_client_secret"
   ```

---

## Running the Backend

You can run the three services in separate terminals:

### Terminal 1: API Server (Port 5000)
```bash
cd server
npm run start
```

### Terminal 2: Build Worker
```bash
cd server
npm run worker
```

### Terminal 3: Subdomain Site Server (Port 8000)
```bash
cd server
npm run site
```

---

## Role Permissions Matrix

| Action | OWNER | DEVELOPER | VIEWER |
|---|---|---|---|
| View project, deployments & logs | ✅ Yes | ✅ Yes | ✅ Yes |
| Trigger new deployment (`POST /api/projects/:id/deployments`) | ✅ Yes | ✅ Yes | ❌ 403 Forbidden |
| Rollback deployment (`POST /api/projects/:id/rollback`) | ✅ Yes | ✅ Yes | ❌ 403 Forbidden |
| Add / update / remove members (`/members`) | ✅ Yes | ❌ 403 Forbidden | ❌ 403 Forbidden |
| Delete project (`DELETE /api/projects/:id`) | ✅ Yes | ❌ 403 Forbidden | ❌ 403 Forbidden |

Creator becomes `OWNER` automatically. Non-members receive `403 Forbidden`.

