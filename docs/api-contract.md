# Launchpad API contract

Source of truth for both Role A (client) and Role B (server).
Do not change it without telling each other.

## Tables

| Table | Columns |
|---|---|
| users | id, githubId, username, avatarUrl, createdAt |
| projects | id, name (unique, used as subdomain), repoUrl, buildCommand, outputDir, activeDeploymentId, createdAt |
| members | id, projectId, userId, role (OWNER / DEVELOPER / VIEWER) |
| deployments | id, projectId, status (QUEUED / BUILDING / READY / FAILED), commitSha, triggeredBy, createdAt, finishedAt |
| logs | id, deploymentId, line, createdAt |

Project names must match `^[a-z0-9-]{3,30}$` (safe as a subdomain and folder name).

## Endpoints

All routes except `/auth/*` need `Authorization: Bearer <JWT>`.

| Method + path | Who | Returns |
|---|---|---|
| GET /auth/github | anyone | Redirect to GitHub login |
| GET /auth/github/callback | anyone | Redirect to client `/auth/callback?token=<JWT>` |
| GET /api/me | logged in | Current user |
| GET /api/projects | logged in | Projects you are a member of, with your role |
| POST /api/projects | logged in | New project; you become Owner |
| GET /api/projects/:id | member | Project + members |
| DELETE /api/projects/:id | Owner | 204 |
| POST /api/projects/:id/deployments | Owner, Developer | New deployment (QUEUED) |
| GET /api/projects/:id/deployments | member | List, newest first |
| GET /api/deployments/:id/logs?after=<logId> | member | Log lines after that id (for polling) |
| POST /api/projects/:id/rollback | Owner, Developer | Sets activeDeploymentId |
| POST /api/projects/:id/members | Owner | Adds member by GitHub username + role |
| PATCH /api/projects/:id/members/:memberId | Owner | Changes role |
| DELETE /api/projects/:id/members/:memberId | Owner | Removes member |

## Errors

Every error uses `{ "error": "message" }` with status 400 / 401 / 403 / 404.

## Permissions

| Action | Owner | Developer | Viewer |
|---|---|---|---|
| View project, deployments, logs | Yes | Yes | Yes |
| Trigger a deploy | Yes | Yes | No |
| Roll back | Yes | Yes | No |
| Invite / remove members, change roles | Yes | No | No |
| Delete project | Yes | No | No |

A non-member gets 403 for everything in that project.

## Open questions (settle at the evening sync)

- Callback token handoff: the client assumes `/auth/callback?token=<JWT>`.
- Exact JSON shape of `GET /api/projects` items: the client assumes each project
  object has its fields plus `role` and `latestDeployment` (the newest deployment as
  `{ id, status }`, or `null`). The dashboard shows its status as the project badge.
- `GET /api/projects/:id` members: the client assumes each member includes
  `user: { id, username, avatarUrl }`.
- `POST /api/projects/:id/rollback` body: the client assumes `{ "deploymentId": <id> }`.
- Rollback is a Must in the Role A handbook but a Stretch in the PRD.
