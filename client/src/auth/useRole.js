import { useAuth } from './useAuth.js'

// What each role may do (the PRD's permissions table, in one place).
// This only decides what the UI shows. The server checks every request again.
const PERMISSIONS = {
  OWNER: { canDeploy: true, canRollback: true, canManageTeam: true, canDelete: true },
  DEVELOPER: { canDeploy: true, canRollback: true, canManageTeam: false, canDelete: false },
  VIEWER: { canDeploy: false, canRollback: false, canManageTeam: false, canDelete: false },
}
const NOTHING = PERMISSIONS.VIEWER

// My role in a project (from GET /api/projects/:id members) plus yes/no flags.
// Safe to call while the project is still loading (project = null).
export function useRole(project) {
  const { user } = useAuth()
  const role = project?.members.find((m) => m.user.id === user?.id)?.role ?? null
  return { role, ...(PERMISSIONS[role] ?? NOTHING) }
}
