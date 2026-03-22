# Repository Guidelines

## Project Structure & Module Organization
This repo is a Vite frontend served by a custom Express server. Page entry files live in `src/` (`main.js`, `about.js`, `portfolio.js`, `admin.js`), shared rendering helpers are also in `src/`, and global styles are in `src/style.css`. Runtime content is file-backed JSON in `data/` (`site-content.json`, `portfolio.json`, `blog.json`, `events.json`). Uploaded originals and generated thumbnails live in `public/media/`, and `backups/` stores automatic snapshots created before content mutations. Production build output goes to `dist/`.

## Build, Test, and Development Commands
Use `npm run dev` to start the local Node server with Vite middleware. Use `npm run build` to generate the production client bundle in `dist/`. Use `npm run start` or `npm run preview` to serve the built app in production mode. Install dependencies with `npm install`.

## Coding Style & Naming Conventions
Follow the existing ES module style used in `server.js` and `src/*.js`. Use 2-space indentation, semicolon-free JavaScript, single quotes, and trailing commas where the current files use them. Keep page entry points named after their route, for example `src/events.js` for `events.html`. Prefer descriptive JSON keys and stable `id` fields for content records. Do not commit generated media unless the change intentionally adds site assets.

## Testing Guidelines
There is no automated test suite configured yet. For every change, run `npm run build` and verify the affected page or API locally through `npm run dev`. If you touch admin flows, also confirm login, content persistence, media upload behavior, and backup creation under `backups/`. When adding tests later, place them near the feature or in a dedicated `tests/` folder and use `*.test.js` naming.

## Commit & Pull Request Guidelines
Recent history uses short, imperative commit subjects such as `portfolio`, `change`, and `changed image`; keep future messages concise but more specific, for example `update portfolio thumbnail handling`. Pull requests should include a short summary, note any changed JSON data files or media assets, link the related issue when applicable, and attach screenshots for visible UI updates. Call out any required environment changes such as `ADMIN_PASSWORD`, `SESSION_SECRET`, or `ADMIN_ROUTE`.

## Security & Configuration Tips
Set `ADMIN_PASSWORD` and `SESSION_SECRET` outside the repo for any deployed environment. Treat `data/`, `public/media/`, and `backups/` as runtime state that must remain writable by the app and should be backed up appropriately.
