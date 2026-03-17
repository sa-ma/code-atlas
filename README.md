# Code Atlas

Code Atlas is a Next.js app that turns a public GitHub repository into an architecture map.

Paste a GitHub repo URL into the UI, and the app will:

- fetch a repository snapshot from the GitHub API
- select a bounded set of relevant files
- infer architecture signals from repo structure, manifests, routes, services, workers, and data files
- generate a Mermaid flowchart
- render the diagram in the browser with export and copy actions

## What It Supports

- Public GitHub repositories
- Single-package apps
- Multi-package repos
- Monorepos with `apps/`, `packages/`, or `services/`
- Heuristic detection for web apps, APIs, workers, data stores, and external integrations

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Mermaid for diagram rendering
- GitHub REST API for repository data

## Local Development

Install dependencies:

```bash
npm install
```

Create `.env.local` and set these variables:

```bash
GITHUB_TOKEN=your_github_token
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Notes

`GITHUB_TOKEN` is strongly recommended. Without it, GitHub API rate limits are much lower.

## How Analysis Works

For a submitted GitHub URL, the server:

1. Parses the owner, repo, and optional branch from the URL.
2. Fetches repository metadata and the full tree from GitHub.
3. Selects high-signal files such as `README`, `package.json`, API routes, service files, worker files, Prisma schemas, and config files.
4. Caps analysis to keep requests predictable:
   - at most `120` files
   - at most `500 KB` of selected file content
5. Inventories the repo to classify:
   - repo pattern: `single-package`, `multi-package`, or `monorepo`
   - app kind: `web-app`, `backend-api`, `fullstack-app`, `worker-service`, `library-heavy`, or `monorepo`
   - framework family: for example `Next.js`, `React`, `Express`, `Fastify`, `Prisma`
6. Reads architectural signals from selected files.
7. Builds an architecture model and converts it to Mermaid.

## UI Flow

- `/` is the landing page with the repository input
- `/explore?repo=<github-url>` runs analysis and renders the generated map
- users can zoom, pan, copy Mermaid, and export the diagram as PNG

## API

### `POST /api/analyze`

Request body:

```json
{
  "repoUrl": "https://github.com/gothinkster/node-express-realworld-example-app"
}
```

Successful response shape:

```json
{
  "repo": {
    "owner": "gothinkster",
    "repo": "node-express-realworld-example-app",
    "branch": "main",
    "defaultBranch": "main",
    "htmlUrl": "https://github.com/gothinkster/node-express-realworld-example-app",
    "description": "..."
  },
  "architecture": {},
  "mermaid": "flowchart LR ...",
  "summary": "..."
}
```

Error cases include:

- invalid or missing `repoUrl`
- repository not found or not public
- GitHub API rate limiting
- upstream GitHub request failures

## Project Structure

```text
src/
  app/
    api/analyze/route.ts        # analysis API
    explore/page.tsx            # explorer screen
    page.tsx                    # landing page
  components/
    code-atlas-client.tsx       # homepage input UX
    code-atlas-explorer.tsx     # explorer, loader, actions
    mermaid-preview.tsx         # Mermaid rendering + PNG export
  lib/
    server/
      analysis/                 # repo inventory, architecture read, Mermaid generation
      github/                   # GitHub URL parsing, tree fetch, file selection
    types/code-atlas.ts         # shared analysis types
```

## Limitations

- GitHub-only input
- Public repositories only
- Analysis is heuristic and based on selected files, not a full semantic parse
- Very large repos may be partially analyzed because of file-count and byte-budget caps
- The generated diagram is only as good as the conventions present in the repo

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```
