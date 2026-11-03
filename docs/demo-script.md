# Demo video script (2 minutes) and launch kit

## Before you record

- **Real mode:** `VITE_USE_MOCKS=false`, API on 5000 and site server on 8000 running. (Mock mode works for
  a rehearsal, but the live link only opens a real site in real mode.)
- **Two GitHub accounts**, each logged in in its own browser window: an **Owner** (normal window) and a
  **Viewer** (incognito / second profile).
- **Two repos:** a small working Vite app, and a copy with a broken import (for the Failed build).
- **Clean state:** delete leftover test projects so the dashboard starts empty or tidy.
- **Browser at 1280 × 800**, zoom 100%, bookmarks bar hidden, notifications off.
- **Pre-deploy once** so the project has an older Ready deployment to roll back to. (Or deploy twice
  during the recording; the script below assumes an earlier Ready deployment exists.)

**Recording on Windows:** Xbox Game Bar, **Win + Alt + R** to start and stop (saves to *Videos → Captures*),
or OBS Studio for more control. Upload to YouTube as **Unlisted** and paste the link at the top of the README.

## Script

| Time | Do | Say |
|---|---|---|
| 0:00–0:12 | Show the Login page. | "Putting a website online is painful: servers, tools, URLs, and you repeat it every change. Launchpad is a mini-Vercel: one click turns a GitHub project into a live website." |
| 0:12–0:22 | Click **Continue with GitHub** → Dashboard. | "I log in with GitHub. No passwords stored: the API exchanges the OAuth code and gives the browser a JWT." |
| 0:22–0:38 | **New Project** → paste repo URL, name `portfolio`, keep `npm run build` / `dist` → **Create**. | "A project is a repo plus a build command and output folder. The name becomes the subdomain, so it's validated as lowercase letters, numbers and dashes." |
| 0:38–1:00 | Click **Deploy**. Let the logs stream to Ready. | "Deploy creates a queued job. A worker picks it up, clones the repo, installs, builds, and copies the output into its own folder. The logs stream in every two seconds, with no refresh." |
| 1:00–1:10 | Click the **portfolio.localhost:8000** link; show the live site. | "It's live on its own subdomain. The site server reads the subdomain from the request and serves the active deployment." |
| 1:10–1:28 | **Team settings** → invite the Viewer account by username as **Viewer**. Switch to the Viewer window, open the project. | "Teams have three roles. My teammate is a Viewer: they can see the project and its logs, but there's no Deploy or Rollback button…" |
| 1:28–1:40 | In the Viewer window, open DevTools console and run the forced deploy (below), show the 403. | "…and hiding buttons isn't the security. If they call the API directly, the server checks the role and answers 403." |
| 1:40–1:55 | Back as Owner: click **Rollback** on the older Ready deployment, refresh the live site. | "Every deploy keeps its folder, so rollback just switches which one is live. No rebuild, instant." |
| 1:55–2:00 | Back to Dashboard. | "React, Node, PostgreSQL, GitHub OAuth. Built by two people in seven days. Link to the code is below." |

**Forced deploy for 1:28** (paste in the Viewer's DevTools console on the project page, using that
project's id from the address bar):

```js
fetch('http://localhost:5000/api/projects/1/deployments', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + localStorage.getItem('launchpad_token') },
}).then((r) => r.status)
```

It should print `403`.

## Resume line

> Built Launchpad, a Vercel-style deployment platform with GitHub OAuth, role-based access control, a build
> pipeline and subdomain routing (React, Node.js, PostgreSQL).

Your part to highlight in interviews: **the dashboard, live build logs and role-aware UI**.

## LinkedIn post (draft – edit before posting)

> I spent the last 7 days building **Launchpad** with **&lt;teammate name&gt;**: a mini-Vercel that turns any
> public GitHub frontend repo into a live website in one click.
>
> Log in with GitHub → pick a repo → Deploy. About 30 seconds later it's live on its own subdomain, with
> build logs streaming in while it builds. Teams get Owner / Developer / Viewer roles, and any earlier
> deployment can be rolled back instantly.
>
> I owned the frontend (React, Vite, Tailwind):
> • a live log viewer that polls for new lines and only auto-scrolls when you're at the bottom
> • role-aware UI on top of server-side checks (the API still answers 403, hiding buttons is just UX)
> • a mock mode with a fake build worker, so the UI was built and tested before the backend existed
>
> &lt;teammate name&gt; built the API, GitHub OAuth, the build worker and the subdomain router (Node, Express,
> PostgreSQL, Prisma).
>
> 🎥 2-minute demo: &lt;YouTube link&gt;
> 💻 Code: &lt;GitHub link&gt;
>
> #React #NodeJS #WebDevelopment #BuildInPublic
