import { useParams } from 'react-router-dom'

export default function TeamSettings() {
  const { id } = useParams()
  return <h1 className="text-2xl font-bold">Team settings for project {id}</h1>
}
