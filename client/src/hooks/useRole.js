import { useMemo } from 'react'
import { useAuth } from '../context/useAuth'

/**
 * Hook for role-based permissions on a project.
 * UI hiding is cosmetic; the server enforces actual permissions.
 *
 * @param {Object|string|null} projectOrRole - Project object, project with members, or role string
 * @returns {Object} Role flags and permission capabilities
 */
export function useRole(projectOrRole) {
  const { user } = useAuth()

  return useMemo(() => {
    let resolvedRole = null

    if (typeof projectOrRole === 'string') {
      resolvedRole = projectOrRole.toUpperCase()
    } else if (projectOrRole && typeof projectOrRole === 'object') {
      // 1. Direct role field attached to project
      if (projectOrRole.role) {
        resolvedRole = projectOrRole.role.toUpperCase()
      }
      // 2. Lookup in project.members array matching current user
      else if (Array.isArray(projectOrRole.members) && user?.id) {
        const memberRecord = projectOrRole.members.find(
          (m) => m.userId === user.id || m.user?.id === user.id
        )
        if (memberRecord?.role) {
          resolvedRole = memberRecord.role.toUpperCase()
        }
      }
    }

    const isOwner = resolvedRole === 'OWNER'
    const isDeveloper = resolvedRole === 'DEVELOPER'
    const isViewer = resolvedRole === 'VIEWER'
    const isMember = isOwner || isDeveloper || isViewer

    return {
      role: resolvedRole,
      isOwner,
      isDeveloper,
      isViewer,
      isMember,
      // Capabilities derived from docs/api-contract.md
      canDeploy: isOwner || isDeveloper,
      canRollback: isOwner || isDeveloper,
      canManageMembers: isOwner,
      canDeleteProject: isOwner,
    }
  }, [projectOrRole, user])
}

export default useRole
