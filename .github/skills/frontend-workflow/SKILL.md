---
name: frontend-workflow
description: "Use when working on frontend tasks in this React/Vite/TypeScript project: pages, components, routes, forms, styles, dashboard, inventory, authentication UI, API services, responsive behavior, or frontend testing. Optimize for small context, minimal edits, fast validation, and concise reports."
---

# Frontend Workflow

## Goal

Resolve frontend tasks with the smallest useful context and the fewest tool calls. Prefer existing project patterns over new abstractions.

## Project Surface

Frontend root: `View/frontend/`

Common locations:

- `src/pages/`: pages and feature views
- `src/components/`: shared layout and UI
- `src/routes/`: routing and protected routes
- `src/services/`: API calls
- `src/types/`: TypeScript contracts
- `src/styles/`: global styles
- `src/**/*.module.css`: component styles

## Workflow

1. Identify one concrete anchor: requested file, route, component, failing behavior, or command.
2. Read only that file and its nearest dependency or test. Form one local hypothesis.
3. Search for references only when the change crosses a component, route, service, or type boundary.
4. Make the smallest edit that tests the hypothesis.
5. Immediately run the narrowest useful validation:
   - targeted test, if present;
   - `npm run build` from `View/frontend`;
   - `npx tsc --noEmit` when the issue is type-related;
   - `npm run lint` for lint-only changes.
6. If validation fails, fix only the touched slice and rerun the same check.
7. Report changed files, behavior, validation result, and any blocker in a short response.

## Context Budget

- Do not map the whole repository for a local UI change.
- Do not reread files immediately after a successful edit unless validation requires it.
- Prefer parallel reads for independent files.
- Use exact symbol or path searches instead of broad semantic searches.
- Avoid repeating unchanged plans or explaining obvious JSX/CSS.
- Do not inspect backend or database code unless the frontend contract, API response, or request fails.
- Do not load this skill for backend-only, database-only, documentation-only, or unrelated tasks.

## React Rules

- Keep state in the nearest common parent when siblings need to coordinate.
- Pass typed callbacks through props for selection, submit, close, and refresh behavior.
- Reuse existing context, hooks, services, and route guards before adding new state systems.
- Keep API calls in `src/services/`; keep display mapping near the UI.
- Preserve existing public APIs and naming unless the task requires a contract change.
- Add keyboard behavior for custom clickable elements: `tabIndex`, `role`, and Enter/Space handling.
- Use stable keys from domain identifiers, never array indexes for dynamic data.

## Forms and API

- Type form payloads explicitly.
- Keep loading, success, and error states visible in the owning component.
- Validate required fields before sending.
- Reuse the project's `credentials: 'include'` behavior for authenticated requests.
- After a successful mutation, refresh the affected data instead of duplicating local server state.
- Treat API response shape as a contract; inspect the service and type before guessing fields.

## Styling

- Follow the existing CSS module or global-style convention in the touched area.
- Make interactive controls visibly interactive and keyboard reachable.
- Preserve responsive behavior and avoid unrelated visual redesign.
- Avoid adding dependencies for a small visual or interaction change.

## Validation and Reporting

Use concise validation output. Mention the exact command and whether it passed. If tooling is blocked by the environment, name the blocker and distinguish it from code errors.

Example final report:

- Changed: `path/to/file.tsx`, `path/to/file.module.css`
- Result: concise behavior summary
- Checked: `npm run build` passed/blocked by `<reason>`

Never claim a build or test passed if it was skipped or failed.
