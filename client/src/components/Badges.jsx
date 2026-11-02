// Small coloured labels reused on every page.

const statusStyles = {
  QUEUED: 'bg-gray-100 text-gray-700',
  BUILDING: 'bg-blue-100 text-blue-700',
  READY: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
}

const statusLabels = { QUEUED: 'Queued', BUILDING: 'Building', READY: 'Ready', FAILED: 'Failed' }

// status: QUEUED / BUILDING / READY / FAILED, or null for "never deployed"
export function StatusBadge({ status }) {
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      <span className={`size-1.5 rounded-full bg-current ${status === 'BUILDING' ? 'animate-pulse' : ''}`} />
      {statusLabels[status] ?? 'Not deployed'}
    </span>
  )
}

const roleStyles = {
  OWNER: 'border-indigo-200 text-indigo-700',
  DEVELOPER: 'border-amber-200 text-amber-700',
  VIEWER: 'border-gray-200 text-gray-600',
}

const roleLabels = { OWNER: 'Owner', DEVELOPER: 'Developer', VIEWER: 'Viewer' }

export function RoleBadge({ role }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${roleStyles[role]}`}>
      {roleLabels[role]}
    </span>
  )
}
