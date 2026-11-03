# UI review – Day 6

## Outcome

All Must and Should items are fixed, plus D1 (Delete project) and N1, N3, N4, N5. **N2 (styled confirm
dialogs) was skipped**: the browser's own dialog works and a custom one isn't quick.

Found and fixed during the final demo run: Project detail fetched the project and its deployments in
parallel, so the two answers could come from different moments. A Building deployment could briefly show
as Live, and in the other order the Live tag could get stuck on the old deployment once polling stopped.
It now fetches deployments first, then the project.

Strict review of every client page at 375 px and 1280 px, as Owner, Developer and Viewer, in mock mode.
Checked: sideways scrolling, clipped text, tap-target sizes, labels, focus, contrast, states, and the PRD demo flow.

**What already passes:** no page scrolls sideways at either width; every input, select and button has a
label; every image has `alt`; one `h1` per page; loading / empty / error states exist on every data page;
role hiding works for all three roles.

## Must fix (visible in the demo or breaks a done-check)

| # | Page | Problem | Fix |
|---|---|---|---|
| M1 | Dashboard | Status badges never update. A Queued/Building project stays that way until you reload, so the demo looks stuck. | Poll every 2 s while any project's latest deployment is QUEUED/BUILDING, like the detail page. |
| M2 | Project detail, 375 px | A long project name (up to 30 chars is allowed) is cut off in the `h1` ("my-very-long-project-name…"), so you can't see which project you're on. | Let the heading wrap (`break-all`) instead of truncating. |
| M3 | All | Browser tab shows Vite's logo; `public/icons.svg` is an unused Vite leftover. Shows up in screenshots and the demo video. | Launchpad favicon (the arrow mark); delete the leftovers. |

## Should fix (polish and consistency)

| # | Page | Problem | Fix |
|---|---|---|---|
| S1 | All | Every tab is titled "Launchpad", so several open tabs look the same. | Per-page titles: "Projects · Launchpad", "portfolio · Launchpad", etc. |
| S2 | Dashboard, Detail, Team | Error and empty boxes are written three different ways (different wording, padding, buttons). | Shared `ErrorState` and `EmptyState` components. |
| S3 | Detail, New Project, Team (375 px) | "← Back" links are 18 px tall; the live link and repo link are 20 px. Hard to tap (WCAG minimum is 24 px). | Add vertical padding so tap areas are at least 24–32 px. |
| S4 | Dashboard, Detail, Login | `text-gray-400` on white ("Not live yet", mock-mode hint) is about 2.5:1 contrast, below the 4.5:1 readable minimum. | Use `text-gray-500`. |
| S5 | Detail | The "↗" after the live link renders as a coloured emoji box on Windows. | Small inline SVG arrow icon instead. |
| S6 | Detail, Team | Going straight from one project to another (same page, new `:id`) keeps showing the old project until the new one loads. Not reachable from today's links, but cheap to fix. | Reset to the loading state when `id` changes. |

## Nice to have (only if quick)

| # | Page | Problem |
|---|---|---|
| N1 | All | Focus ring is the browser's thin default. A stronger, consistent `focus-visible` ring would help keyboard users; on Dashboard cards it outlines only the small title, not the card. |
| N2 | Detail, Team | Rollback and Remove use the browser's `window.confirm` dialog, which looks out of place. |
| N3 | Not found | Logged-in users lose the top bar on the 404 page. |
| N4 | Dashboard | Projects are listed in membership order; a just-created project lands at the bottom. Newest first would be friendlier. |
| N5 | Detail | "5 min ago" doesn't tick while the page stays open. |

## Needs a decision

| # | Problem |
|---|---|
| D1 | **Delete project** is in the PRD's permissions table (Owner only) and the API has `DELETE /api/projects/:id`, but no page offers it. Option: a "Delete project" area at the bottom of Team settings, Owner only, with a type-the-name-to-confirm box. |
