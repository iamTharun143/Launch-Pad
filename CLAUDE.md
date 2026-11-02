# Launchpad
Mini-Vercel: deploys public GitHub frontend repos (HTML, React/Vite)
to <name>.localhost:8000. 2-person, 7-day portfolio project.

## Structure
- /client React + Vite + Tailwind, React Router, Axios (Role A)
- /server Node + Express + Prisma + PostgreSQL/Supabase (Role B)
- /docs/api-contract.md tables + endpoints. Source of truth.
  Never add or change an endpoint without asking.

## Ports
client 5173 | API 5000 | site server 8000

## How to work with us
- We are beginners. Explain what you change and why, simply.
- Make a plan before writing code bigger than one file.
- Small steps. After each step, tell us how to test it.
- Never put secrets in code. Use .env; keep .env.example updated.
- Only edit files in the folder named in the task.
- Errors from the API always use { "error": "message" }.
