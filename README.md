<div align="center">

# 🚀 Launchpad

**An open-source, self-hosted deployment platform (mini-Vercel) that transforms any GitHub repository into an active live website with subdomains, real-time build streaming, role-based teams, and instant rollbacks.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/Node.js-20.19%2B%20%7C%2022.12%2B-339933?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://prisma.io)

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-roles--permissions">RBAC</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-project-structure">Structure</a> •
  <a href="#-team">Team</a>
</p>

---

![Project Detail & Live Logs](docs/screenshots/project-logs.png)

</div>

## 📸 Interface Preview

<div align="center">

| Authentication | Project Dashboard |
|:---:|:---:|
| <img src="docs/screenshots/login.png" width="400" alt="Login page"/> | <img src="docs/screenshots/dashboard.png" width="400" alt="Dashboard overview"/> |

| Deployment History & Rollbacks | Team Management & RBAC |
|:---:|:---:|
| <img src="docs/screenshots/project-history.png" width="400" alt="Deployment history"/> | <img src="docs/screenshots/team.png" width="400" alt="Team settings"/> |

<p align="center">
  <img src="docs/screenshots/mobile-project.png" width="300" alt="Mobile responsive design" />
  <br />
  <em>Fully responsive mobile design (375px+) with accessible keyboard navigation</em>
</p>

</div>

---

## ✨ Key Features

- ⚡ **One-Click Deployments**: Clone repository → install dependencies → execute build command → copy assets → serve to custom subdomain in ~30 seconds.
- 🌐 **Isolated Subdomain Hosting**: Every project is served through its own dedicated subdomain at `<project-name>.localhost:8000`, with full single-page application (SPA) client-side routing fallback.
- 📜 **Live Terminal-Style Build Logs**: Incremental log polling engine streams stdout/stderr output from the build worker to the browser every 2 seconds.
- 🔁 **Instant Zero-Rebuild Rollbacks**: Revert to any prior healthy deployment instantly with one click by re-pointing the project's active deployment pointer.
- 👥 **Role-Based Access Control (RBAC)**: Enforced server-side permission system supporting `OWNER`, `DEVELOPER`, and `VIEWER` tiers.
- 🔒 **GitHub OAuth & Dev Fallback**: Built-in OAuth 2.0 flow with JWT session management, plus zero-config local dev authentication.
- 🛠️ **Smart Build Engine**: Automatically detects React/Vite/Next applications vs. plain static HTML sites, dynamically handles build scripts, and provides intelligent directory fallbacks.

---

## 🏛 Architecture

![Launchpad Architecture](docs/architecture.svg)

Launchpad is architected as an asynchronous, decoupled system:
1. **Frontend Dashboard (`/client`)**: Modern React 19 application consuming the backend REST API via Axios.
2. **Control Plane API (`/server`)**: Express REST API verifying JWT tokens, enforcing RBAC permissions, and managing records via Prisma ORM.
3. **Build Worker (`/server/src/worker.js`)**: Background polling daemon that isolates builds, checks out git revisions, executes sandbox commands, streams log lines, and publishes artifacts into `deployments/<id>/`.
4. **Site Server (`/server/src/site-server.js`)**: High-performance static asset server operating on port 8000 that inspects incoming `Host` headers to route traffic to the active deployment directory.

---

## 💻 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend UI** | **React 19**, **Vite 8**, **Tailwind CSS 4** | Ultra-fast client interface with dark theme and state management |
| **Routing** | **React Router 7** | Client-side routing, protected routes, and tabbed navigation |
| **Backend API** | **Node.js 20+**, **Express 4** | RESTful API endpoints following contract specifications |
| **Database** | **SQLite** (Local Dev) / **PostgreSQL** (Prod) | Relational persistence with seamless database switching |
| **ORM** | **Prisma ORM 6** | Type-safe schema definition, migrations, and relationship management |
| **Authentication** | **GitHub OAuth 2.0** + **JWT** | Secure token-based session handling |
| **Build Engine** | **Node.js `child_process.spawn`** | Isolated execution of Git clone, npm install, and custom build scripts |
| **Static Serving** | **Express Subdomain Router** | Host-header inspection serving isolated builds with SPA fallbacks |

---

## 🛡 Roles & Permissions

Every request to `/api/projects/:id/*` is validated through database-backed RBAC middleware (`requireRole`). Non-members receive `403 Forbidden`.

| Action | Owner | Developer | Viewer |
|:---|:---:|:---:|:---:|
| **View Project, Deployments & Logs** | ✅ | ✅ | ✅ |
| **Trigger New Deployments** | ✅ | ✅ | ❌ |
| **Execute Instant Rollback** | ✅ | ✅ | ❌ |
| **Manage Team (Invite, Demote, Remove)** | ✅ | ❌ | ❌ |
| **Permanently Delete Project** | ✅ | ❌ | ❌ |

> **Note:** The API guarantees ownership safety — projects require at least one active Owner, preventing accidental removal or demotion of the sole administrator.

---

## 🏁 Getting Started

### Prerequisites

- **Node.js**: `v20.19+` or `v22.12+` (Required by Vite 8)
- **npm**: `v10+` or `pnpm`
- **Git**: Installed and accessible in PATH
- Modern web browser supporting RFC 6761 `*.localhost` resolution (Chrome, Edge, Firefox, Brave)

---

### 1. Clone the Repository

```bash
git clone https://github.com/iamTharun143/Launch-Pad.git
cd Launch-Pad
```

---

### 2. Configure & Run Backend Server (Port 5000 & 8000)

```bash
cd server
npm install
cp .env.example .env
npm run db:push
```

#### Environment Variables (`server/.env`)

```ini
PORT=5000
SITE_PORT=8000
CLIENT_URL=http://localhost:5173

# SQLite is enabled by default for zero-setup local dev:
DATABASE_URL="file:./dev.db"

# Or configure Supabase / PostgreSQL for production:
# DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

JWT_SECRET="launchpad-dev-secret-jwt-key-2026"

# Optional: Add GitHub OAuth app credentials for real GitHub sign-in:
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_CALLBACK_URL="http://localhost:5000/auth/github/callback"
```

#### Starting Backend Services

You can run all three backend services together in a single unified process:

```bash
npm run all
```

*Or launch each service individually across dedicated terminals:*
- **API Server**: `npm run dev` (Port 5000)
- **Deployment Worker**: `npm run worker` (Polls every 3s)
- **Site Server**: `npm run site` (Port 8000)

---

### 3. Configure & Run Frontend Client (Port 5173)

In a new terminal window:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

#### Environment Variables (`client/.env`)

```ini
VITE_API_URL=http://localhost:5000
# Set to 'false' to communicate with the real backend, or 'true' for offline in-memory mocks
VITE_USE_MOCKS=false
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

### 4. Running the Automated Test Suite

Launchpad includes a comprehensive 14-endpoint automated integration test suite:

```bash
cd server
npm test
```

```
--- Starting Integration Tests ---
✓ Health check passed
✓ Dev token passed, user ID: ...
✓ GET /api/me passed
✓ POST /api/projects passed
✓ GET /api/projects passed
✓ GET /api/projects/:id passed
✓ POST /api/projects/:id/members passed
✓ PATCH /api/projects/:id/members/:memberId passed
✓ POST /api/projects/:id/deployments passed
✓ GET /api/projects/:id/deployments passed
✓ GET /api/deployments/:id/logs passed
✓ DELETE member passed
✓ DELETE project passed
✓ Site server test passed

🎉 ALL 14 INTEGRATION TESTS PASSED WITH ZERO ERRORS!
```

---

## 📂 Project Structure

```
launchpad/
├── client/                     # Frontend Application (Role A)
│   ├── src/
│   │   ├── api.js              # Centralized API layer with JWT interceptors
│   │   ├── auth/               # AuthContext, useAuth, and useRole hooks
│   │   ├── components/         # Layout, Badges, LogViewer, States, Spinner
│   │   ├── pages/              # Login, AuthCallback, Dashboard, NewProject, ProjectDetail, TeamSettings
│   │   └── mocks/              # Mock server and seed fixtures
│   ├── vite.config.js          # Vite build & plugin configurations
│   └── package.json
│
├── server/                     # Backend Platform (Role B)
│   ├── prisma/
│   │   └── schema.prisma       # Database schema (User, Project, Member, Deployment, Log)
│   ├── src/
│   │   ├── db.js               # Prisma singleton client
│   │   ├── index.js            # Express API application & error handlers
│   │   ├── worker.js           # Build worker daemon & process execution engine
│   │   ├── site-server.js      # Host-header subdomain router & asset server
│   │   ├── all.js              # Unified runner for API, worker, and site server
│   │   ├── middleware/         # Authentication & RBAC enforcement
│   │   └── routes/             # Auth, projects, deployments, and member endpoints
│   ├── test-integration.js     # 14-step automated API & routing test suite
│   └── package.json
│
├── docs/                       # Specifications & Assets
│   ├── api-contract.md         # Single source of truth API contract
│   ├── architecture.svg        # Architecture and flow diagram
│   ├── demo-script.md          # 2-minute demonstration walkthrough
│   └── screenshots/            # UI reference screenshots
│
├── LICENSE                     # MIT License
└── README.md                   # Project documentation
```

---

## 🔒 Security & Sandboxing Note

Launchpad executes `git clone`, `npm install`, and project build commands directly on the host machine. Ensure you only build repositories you trust, or deploy the build worker within an isolated containerized environment (e.g., Docker) in production.

---

## 👥 Authors & Team

Designed and developed as a collaborative 2-person engineering project:

- **Tharun ([@iamTharun143](https://github.com/iamTharun143))** — Backend Architecture, REST API, Deploy Engine, SQLite/Prisma Integration & Site Server
- **Ajay Balaji ([@Phantom-deluxe06](https://github.com/Phantom-deluxe06))** — Frontend Client, UI/UX Design, Real-time Logs Viewer, RBAC Controls & Documentation

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
