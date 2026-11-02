import { Link } from 'react-router-dom'
import { getMyProjects } from '../mocks/data.js'

export default function Dashboard() {
  // Day 1: fake data. Day 3: replace with GET /api/projects through src/api.js.
  const projects = getMyProjects()

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Dashboard</h1>
      <ul className="space-y-2">
        {projects.map((project) => (
          <li key={project.id}>
            <Link to={`/projects/${project.id}`} className="text-blue-600 hover:underline">
              {project.name}
            </Link>{' '}
            <span className="text-sm text-gray-500">({project.role})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
