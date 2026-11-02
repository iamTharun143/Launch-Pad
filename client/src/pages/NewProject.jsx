import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProject, getErrorMessage, getProjects } from '../api.js'
import { usePageTitle } from '../usePageTitle.js'

const REPO_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+?(\.git)?\/?$/
const NAME_PATTERN = /^[a-z0-9-]{3,30}$/

// Returns { fieldName: 'message' } for every field that is wrong.
// This is only for a friendly UI; the server checks everything again.
function validate(form, takenNames) {
  const errors = {}
  if (!REPO_URL_PATTERN.test(form.repoUrl.trim())) {
    errors.repoUrl = 'Use a GitHub repo URL like https://github.com/owner/repo'
  }
  if (!NAME_PATTERN.test(form.name)) {
    errors.name = '3–30 characters: lowercase letters, numbers and dashes only'
  } else if (takenNames.includes(form.name)) {
    errors.name = 'You already have a project with this name'
  }
  if (!form.buildCommand.trim()) errors.buildCommand = 'Build command is required'
  if (!form.outputDir.trim()) errors.outputDir = 'Output folder is required'
  return errors
}

export default function NewProject() {
  usePageTitle('New project')
  const navigate = useNavigate()
  const [form, setForm] = useState({ repoUrl: '', name: '', buildCommand: 'npm run build', outputDir: 'dist' })
  // Which fields the user has left at least once; we only show their errors after that.
  const [touched, setTouched] = useState({})
  const [takenNames, setTakenNames] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  // Load existing project names so we can warn about duplicates early.
  // If it fails we just skip the check; the server still rejects duplicates.
  useEffect(() => {
    getProjects()
      .then((projects) => setTakenNames(projects.map((p) => p.name)))
      .catch(() => {})
  }, [])

  const errors = validate(form, takenNames)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleBlur(event) {
    setTouched((prev) => ({ ...prev, [event.target.name]: true }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    // Pressing submit shows every error at once.
    setTouched({ repoUrl: true, name: true, buildCommand: true, outputDir: true })
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    setServerError('')
    try {
      const project = await createProject({
        repoUrl: form.repoUrl.trim(),
        name: form.name,
        buildCommand: form.buildCommand.trim(),
        outputDir: form.outputDir.trim(),
      })
      navigate(`/projects/${project.id}`)
    } catch (err) {
      setServerError(getErrorMessage(err))
      setSubmitting(false)
    }
  }

  // Shared props for each input, so the four fields stay consistent.
  const field = (name) => ({
    id: name,
    name,
    value: form[name],
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': Boolean(touched[name] && errors[name]),
    className: `mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${
      touched[name] && errors[name]
        ? 'border-red-400 focus:ring-red-200'
        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
    }`,
  })

  return (
    <div className="mx-auto max-w-lg">
      <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
        ← Back to projects
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold">New Project</h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {serverError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <Field label="GitHub repo URL" name="repoUrl" error={touched.repoUrl && errors.repoUrl}>
          <input {...field('repoUrl')} type="url" placeholder="https://github.com/you/portfolio" />
        </Field>

        <Field
          label="Project name"
          name="name"
          error={touched.name && errors.name}
          hint={form.name && !errors.name ? `Live at ${form.name}.localhost:8000` : 'Used in the site address'}
        >
          <input {...field('name')} placeholder="portfolio" autoCapitalize="none" spellCheck="false" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Build command" name="buildCommand" error={touched.buildCommand && errors.buildCommand}>
            <input {...field('buildCommand')} className={`${field('buildCommand').className} font-mono`} />
          </Field>
          <Field
            label="Output folder"
            name="outputDir"
            error={touched.outputDir && errors.outputDir}
            hint="Vite: dist · Create React App: build"
          >
            <input {...field('outputDir')} className={`${field('outputDir').className} font-mono`} />
          </Field>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-gray-900 px-4 py-2.5 font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create project'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, name, error, hint, children }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  )
}
