# Launchpad 🚀

A mini-Vercel deployment platform: one click turns a public GitHub frontend repository (HTML, React, Vite) into a live website hosted on an isolated subdomain (`<name>.localhost:8000`).

Built as a collaborative 2-role full-stack portfolio project:
- **Role A (Client)**: React 19 + Vite + Tailwind CSS + React Router + Axios
- **Role B (Server & Deploy Engine)**: Node.js + Express + Prisma + PostgreSQL (Supabase) + Build Worker + Subdomain Router

---

## 🏗️ Architecture

```
                                  ┌────────────────────────┐
                                  │      React Client      │
                                  │    (localhost:5173)    │
                                  └───────────┬────────────┘
                                              │ REST + Bearer JWT
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Express API Server (localhost:5000)                                                     │
│ - GitHub OAuth 2.0 & 7-day JWT sessions                                                │
│ - Role-Based Access Control (OWNER, DEVELOPER, VIEWER)                                 │
│ - Projects, Deployments & Members CRUD                                                 │
└───────────────────────────┬──────────────────────────────────▲─────────────────────────┘
                            │                                  │
                            ▼                                  │ reads active
┌───────────────────────────────────────────────┐              │ deployment
│ PostgreSQL (Supabase) via Prisma ORM          │              │
│ - users, projects, members, deployments, logs │              │
└───────────────────────────▲───────────────────┘              │
                            │ polls QUEUED rows                │
                            │ every 3 seconds                  │
┌───────────────────────────┴───────────────────┐ ┌────────────┴─────────────────────────┐
│ Build Worker Engine (worker.js)               │ │ Subdomain Site Server (localhost:8000│
│ - git clone --depth 1                         │ │ - Reads subdomain from Host header   │
│ - npm install                                 │ │ - http://<name>.localhost:8000       │
│ - npm run build                               │ │ - Serves static build files          │
│ - streams build logs live to database         │ │ - Client-side SPA index.html fallback│
│ - copies output to deployments/<id>/          │ └──────────────────────────────────────┘
│ - marks READY & sets active deployment        │
└───────────────────────────────────────────────┘
```

---

## ⚡ Key Features

- **GitHub OAuth Login**: Authenticate with GitHub; automatic profile sync and 7-day JWT sessions.
- **Project Management**: Register public repositories with custom build commands and output folders.
- **Automated Build Pipeline**: Worker automatically clones, installs, builds, and publishes frontend apps.
- **Live Build Logs Terminal**: Watch build progress in real-time with incremental log streaming.
- **Subdomain Routing**: Deployed sites open immediately at `<name>.localhost:8000`.
- **One-Click Instant Rollback**: Revert live sites to any previous `READY` build without rebuilding.
- **Role-Based Access Control (RBAC)**:
  - **OWNER**: Full access to deploy, rollback, manage team members, and delete projects.
  - **DEVELOPER**: Can trigger new deployments and rollbacks.
  - **VIEWER**: Read-only access to projects and deployment logs.

---

## 🔌 Ports

| Service | Port | Description |
|---|---|---|
| **Client** | `5173` | React/Vite dashboard & terminal log viewer |
| **API Server** | `5000` | Express REST API & GitHub OAuth handlers |
| **Site Server** | `8000` | Static asset server for `<name>.localhost:8000` |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/iamTharun143/Launch-Pad.git
cd Launch-Pad
```

### 2. Configure Environment Variables
Copy `.env.example` in both folders:

```bash
# Client
cp client/.env.example client/.env

# Server
cp server/.env.example server/.env
```

Set your Supabase `DATABASE_URL` and optional GitHub OAuth credentials in `server/.env`.

### 3. Install Dependencies
```bash
# Client
cd client
npm install

# Server
cd ../server
npm install
npm run db:generate
```

### 4. Run the Platform
Open separate terminals for each service:

```bash
# Terminal 1: Client
cd client && npm run dev

# Terminal 2: Backend API
cd server && npm run start

# Terminal 3: Build Worker
cd server && npm run worker

# Terminal 4: Subdomain Site Server
cd server && npm run site
```

Visit **`http://localhost:5173`** to access Launchpad!

---

## 📄 API Specification

All table schemas, shapes, error structures, and endpoints are formally documented in [docs/api-contract.md](docs/api-contract.md).
