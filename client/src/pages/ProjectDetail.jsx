import { useParams } from 'react-router-dom'

export default function ProjectDetail() {
  // useParams reads the :id part of the URL, e.g. /projects/2 -> "2"
  const { id } = useParams()
  return <h1 className="text-2xl font-bold">Project {id}</h1>
}
