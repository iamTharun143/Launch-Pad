export default function Spinner({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-gray-500">
      <span className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      {label}
    </div>
  )
}
