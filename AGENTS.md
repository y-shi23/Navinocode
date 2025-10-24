# Repository Guidelines

## Project Structure & Module Organization
The app is a Vite + React workspace. Application code lives in `src/`, with UI widgets in `src/components/` (for example `DraggableBottomBar.jsx` and `ui/` primitives), route declarations in `src/nav-items.jsx`, and page-level containers in `src/pages/`. Shared logic is split between `src/lib/` helpers and `src/integrations/supabase/` for API clients. Global styles come from `src/index.css` with Tailwind configuration in `tailwind.config.js`. Use the `@/` import alias (configured in `jsconfig.json`) to reference modules from the project root.

## Build, Test, and Development Commands
- `npm install` — install all runtime and tooling dependencies.
- `npm run dev` — start the Vite dev server with hot module reload at `http://localhost:5173`.
- `npm run build` — produce the optimized production bundle in `dist/`.
- `npm run build:dev` — generate a development-mode bundle when you need readable output for debugging.
- `npm run preview` — serve the production build locally.
- `npm run lint` — run ESLint across `.js`/`.jsx` files; treat warnings as build blockers.

## Coding Style & Naming Conventions
Write modern functional React with hooks. Components and files exported as JSX should use PascalCase (`AppSelector.jsx`), hooks should begin with `use`, and shared utilities in `src/lib/` use camelCase. Keep imports sorted by path depth, prefer explicit named exports, and use double quotes to match existing files. Indent with two spaces and rely on ESLint (`npm run lint`) before pushing. Tailwind utility classes belong in JSX; extract repeated patterns into composable components under `src/components/ui/`.

## Testing Guidelines
Automated testing is not yet wired into this repository; before adding tests, plan on using Vitest plus React Testing Library and place specs under `src/__tests__/` or co-located `*.test.jsx`. Until that scaffolding lands, verify changes with `npm run lint`, smoke-test primary routes via the dev server, and document manual QA steps in your pull request.

## Commit & Pull Request Guidelines
Follow the Conventional Commits style visible in history (`feat:`, `fix:`, etc.) and keep messages concise in English or Chinese. Each PR should include a summary of intent, screenshots or screen recordings for UI-facing changes, links to tracking issues, and a checklist of manual verification. Rebase on the latest `main`, ensure `npm run build` and `npm run lint` succeed, and request review once CI (if configured) passes.

## Security & Configuration Tips
Store Supabase keys and other secrets in `.env` (never commit them). The Supabase client reads from `src/integrations/supabase/client.js`, so keep environment variable names stable and document new ones in the PR description. When debugging auth or API issues, regenerate `.env.local` from secure sources rather than reusing tokens.
