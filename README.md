# Launchpad

**A mini-Vercel: one click turns a GitHub project into a live website, with teams, roles and live build logs.**

Log in with GitHub, paste a repo URL, click **Deploy**. About 30 seconds later the site is live at
`<project>.localhost:8000`. Every deploy keeps its own copy, so a broken version can be rolled back in one click.

> 🎥 **Demo video (2 min):** _link coming soon_

![Project page with live build logs](docs/screenshots/project-logs.png)

## Screenshots

| Login | Dashboard |
|---|---|
| ![Login with GitHub](docs/screenshots/login.png) | ![Dashboard with project cards, roles and status badges](docs/screenshots/dashboard.png) |

| Deployment history and rollback | Team settings |
|---|---|
| ![Project page with deployment history, live tag and rollback](docs/screenshots/project-history.png) | ![Team settings with invite form, roles and delete project](docs/screenshots/team.png) |

<p align="center"><img src="docs/screenshots/mobile-project.png" alt="Project page at phone width" width="300"></p>

## Features

- **GitHub login** (OAuth) with JWT sessions; refresh keeps you logged in.
- **Projects from any public GitHub repo**: plain HTML or React/Vite apps that build to static files.
- **One-click deploy**: clone → `npm install` → build → serve.
- **Live build logs** in a terminal-style viewer that streams new lines every 2 seconds.
- **Status everywhere**: Queued → Building → Ready / Failed, updating without a refresh.
- **Your own subdomain**: `<project>.localhost:8000`, including client-side routes.
- **Teams and roles**: invite by GitHub username as Owner, Developer or Viewer.
- **Instant rollback** to any earlier successful deployment, with no rebuild.
- **Works on phones** (375 px and up) and with the keyboard.

## Architecture

![Launchpad architecture](docs/architecture.svg)

The dashboard only talks to the API. The build worker and the site server never talk to the browser
directly: they share state through the database and the `deployments/` folder. The worker picks up
QUEUED deployments, builds them into `deployments/<id>/`, and the site server serves whichever deployment
is active for the subdomain in the request's `Host` header.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS 4, React Router, Axios |
| Backend API | Node.js + Express |
| Database | PostgreSQL on Supabase + Prisma ORM |
| Auth | GitHub OAuth App + JWT (`jsonwebtoken`) |
| Build worker | Node script + `child_process.spawn` (`git clone`, `npm install`, build) |
| Job queue | The `deployments` table itself (the worker polls QUEUED rows) |
| Site serving | Express reads the subdomain from the `Host` header |

## Roles and permissions

The server checks the role on every request. The UI only hides buttons a role can't use.

| Action | Owner | Developer | Viewer |
|---|:-:|:-:|:-:|
| View project, deployments, logs | ✅ | ✅ | ✅ |
| Trigger a deploy | ✅ | ✅ | — |
| Roll back | ✅ | ✅ | — |
| Invite / remove members, change roles | ✅ | — | — |
| Delete project | ✅ | — | — |

Whoever creates a project becomes its Owner. Non-members get `403 Forbidden` for everything in it.

## Run it locally

You need **Node.js 20.19+ or 22.12+** (Vite 8 requires it), **git**, a free **Supabase** project, and a browser where `*.localhost` works
(Chrome, Edge and Firefox do, with no DNS setup).

### 1. Clone

```bash
git clone <this repo's URL> launchpad
cd launchpad
```

### 2. Client (React dashboard, port 5173)

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

| Variable | Example | What it is |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Where the API runs |
| `VITE_USE_MOCKS` | `true` | `true` = use built-in fake data, no server needed. `false` = talk to the real API |

With `VITE_USE_MOCKS=true` you can try the whole UI right away: the login page lets you pick a fake
Owner, Developer or Viewer, and fake builds run through Queued → Building → Ready with streaming logs.

### 3. Server (API port 5000, site server port 8000)

1. Create a **GitHub OAuth App** (GitHub → Settings → Developer settings → OAuth Apps):
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5000/auth/github/callback`
2. Set up the server and create the database tables:

```bash
cd server
npm install
cp .env.example .env
npm run db:push
```

| Variable | Example | What it is |
|---|---|---|
| `PORT` | `5000` | API port |
| `SITE_PORT` | `8000` | Site server port (serves `<name>.localhost`) |
| `CLIENT_URL` | `http://localhost:5173` | Where to send users back after login |
| `DATABASE_URL` | `postgresql://postgres:…@db.….supabase.co:5432/postgres` | Supabase → Project Settings → Database → Connection string (URI) |
| `JWT_SECRET` | any long random string | Signs login tokens. Change the example value |
| `GITHUB_CLIENT_ID` | | From your GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | | From your GitHub OAuth App (never commit it) |
| `GITHUB_CALLBACK_URL` | `http://localhost:5000/auth/github/callback` | Must match the OAuth App |

3. Start the three server processes, each in its own terminal:

```bash
npm run dev
```

```bash
npm run worker
```

```bash
npm run site
```

`dev` is the API (5000), `worker` builds queued deployments, and `site` serves the live sites (8000).

4. In `client/.env`, set `VITE_USE_MOCKS=false` and restart the client.

### 4. Try the demo flow

Log in → **New Project** → paste a public Vite repo, name it `portfolio` → **Deploy** → watch the logs →
open `portfolio.localhost:8000` → invite a teammate as Viewer → roll back to an earlier deployment.

## Project structure

```
launchpad/
├── client/                 React dashboard (Role A)
│   └── src/
│       ├── api.js          the only file that talks to the server (adds JWT, logs out on 401, mock switch)
│       ├── auth/           AuthProvider, useAuth, useRole (the permissions table)
│       ├── components/     Layout, ProtectedRoute, LogViewer, badges, shared states
│       ├── pages/          Login, AuthCallback, Dashboard, NewProject, ProjectDetail, TeamSettings
│       └── mocks/data.js   fake data + a fake build worker, shaped exactly like the API
├── server/                 Express API, Prisma schema, build worker, site server (Role B)
└── docs/
    ├── api-contract.md     tables + endpoints, the source of truth for both halves
    ├── architecture.svg
    ├── demo-script.md      2-minute demo script, resume line, launch post draft
    └── screenshots/
```

## Safety note

Launchpad runs `npm install` and the build command of the repos you deploy **on your own machine**.
Only deploy repositories you trust. Running builds inside Docker is on the stretch list.

## Built by

A 2-person, 7-day project.

- **Ajay Balaji**: Frontend & Product (dashboard, live build logs, role-aware UI, README, demo)
- **&lt;Teammate name&gt;**: Backend & Deploy Engine (API, auth, build worker, site server)
