# Shared API Contract (Launchpad)

Both Role A (Frontend) and Role B (Backend) build against this contract.
Base URL: `http://localhost:5000` (or `VITE_API_URL`)

## Tables

### `users`
| Column | Type | Description |
|---|---|---|
| id | string | Unique user identifier |
| githubId | string | GitHub profile ID |
| username | string | GitHub username |
| avatarUrl | string | URL of GitHub avatar |
| createdAt | string (ISO) | Timestamp of user creation |

### `projects`
| Column | Type | Description |
|---|---|---|
| id | string | Unique project identifier |
| name | string | Unique lowercase subdomain (`^[a-z0-9-]{3,30}$`) |
| repoUrl | string | GitHub repository URL |
| buildCommand | string | Command to build site (default: `npm run build`) |
| outputDir | string | Directory containing build assets (default: `dist`) |
| activeDeploymentId | string \| null | ID of currently active live deployment |
| createdAt | string (ISO) | Timestamp of project creation |

### `members`
| Column | Type | Description |
|---|---|---|
| id | string | Unique membership identifier |
| projectId | string | Foreign key to `projects.id` |
| userId | string | Foreign key to `users.id` |
| role | string | `OWNER` \| `DEVELOPER` \| `VIEWER` |

### `deployments`
| Column | Type | Description |
|---|---|---|
| id | string | Unique deployment identifier |
| projectId | string | Foreign key to `projects.id` |
| status | string | `QUEUED` \| `BUILDING` \| `READY` \| `FAILED` |
| commitSha | string | Git commit hash |
| triggeredBy | string | Username or trigger identifier |
| createdAt | string (ISO) | Timestamp when queued |
| finishedAt | string (ISO) \| null | Timestamp when completed |

### `logs`
| Column | Type | Description |
|---|---|---|
| id | string \| number | Incremental or unique log entry identifier |
| deploymentId | string | Foreign key to `deployments.id` |
| line | string | Stdout or stderr log line content |
| createdAt | string (ISO) | Timestamp of log line |

---

## Endpoints

All endpoints except `/auth/*` require `Authorization: Bearer <JWT>`.

| Method + Path | Auth / Role | Description / Returns |
|---|---|---|
| `GET /auth/github` | Public | Redirects to GitHub OAuth login page |
| `GET /auth/github/callback` | Public | Exchanges code, redirects to client with token: `http://localhost:5173/auth/callback?token=<JWT>` |
| `GET /api/me` | Logged in | Returns current authenticated user: `{ id, githubId, username, avatarUrl, createdAt }` |
| `GET /api/projects` | Logged in | Returns list of projects user is a member of, with `role`: `[{ id, name, repoUrl, buildCommand, outputDir, activeDeploymentId, createdAt, role }]` |
| `POST /api/projects` | Logged in | Body: `{ name, repoUrl, buildCommand, outputDir }`. Creator becomes `OWNER`. Returns created project. |
| `GET /api/projects/:id` | Member | Returns `{ project, members: [{ id, projectId, userId, role, user: { id, username, avatarUrl } }] }` |
| `DELETE /api/projects/:id` | Owner | Deletes project. Returns `204 No Content`. |
| `POST /api/projects/:id/deployments` | Owner, Developer | Triggers new build. Returns new deployment row with status `QUEUED`. |
| `GET /api/projects/:id/deployments` | Member | Returns array of deployments for project, sorted newest first. |
| `GET /api/deployments/:id/logs?after=<logId>` | Member | Returns `{ logs: [{ id, deploymentId, line, createdAt }], status }` where logs are newer than `after`. |
| `POST /api/projects/:id/rollback` | Owner, Developer | Body: `{ deploymentId }`. Sets `activeDeploymentId` to the specified READY deployment without rebuilding. |
| `POST /api/projects/:id/members` | Owner | Body: `{ username, role }`. Adds user by GitHub username with role `OWNER`, `DEVELOPER`, or `VIEWER`. |
| `PATCH /api/projects/:id/members/:memberId` | Owner | Body: `{ role }`. Updates member's role. |
| `DELETE /api/projects/:id/members/:memberId` | Owner | Removes member from project. |

### Error Shape
All error responses across all routes return:
```json
{
  "error": "Error description message"
}
```
With HTTP status codes `400` (Bad Request), `401` (Unauthorized), `403` (Forbidden), `404` (Not Found), or `500` (Internal Server Error).

---

## Client notes (Role A)

How the client (`client/src/api.js`) reads these responses, and two open items for Role B.

- `GET /api/projects/:id` → `{ project, members }` is flattened to `{ ...project, members }`.
- `GET /api/deployments/:id/logs` → only `logs` is used; status comes from the deployments list.
- `POST /api/projects/:id/rollback` → `project` is merged into the page's project (members kept).
- `GET /api/projects` has no deployment info, so the client asks each project for
  `GET /api/projects/:id/deployments` to show the newest status on the Dashboard.
  *Nice to have:* the server could include `latestDeployment: { id, status }` per project instead.
- Ids are compared as text (UUIDs). `triggeredBy` is shown as-is (it holds the username).

**Open items for Role B**

1. **Invite route path:** `server/src/routes/projects.js` declares `router.post('/api/projects/:id/members', …)`
   on a router mounted at `/api`, so the real path is `/api/api/projects/:id/members` and the client's
   `POST /api/projects/:id/members` gets 404. Dropping the leading `/api` fixes it.
2. **`POST /auth/dev-token`** issues a valid JWT for any username. Fine for local testing; it should be
   disabled outside development before the server is hosted anywhere.
3. **Last Owner:** PATCH/DELETE members don't stop the only Owner from being demoted or removed.
   (The UI already prevents changing your own row.)

