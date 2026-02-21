# CLAUDE.md

## Project Overview

OpenFinance is a self-hosted personal finance and bookkeeping app for freelancers and small businesses. It processes bank statement PDFs with AI, tracks transactions, and provides financial insights via AI agents.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript (strict)
- **Monorepo**: Yarn 4.0.0 workspaces (`apps/`)
- **Database**: Prisma ORM + SQLite (dev) / PostgreSQL (prod) — lives in `apps/web`
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Package Manager**: Yarn (NEVER npm)

## Workspaces

| Workspace | Path | Port |
|-----------|------|------|
| `@openfinance/web` | `apps/web` | 3000 |
| `@openfinance/marketing` | `apps/marketing` | 3001 |

## Commands

```bash
yarn install              # Install dependencies
yarn dev                  # Run web app (turbopack)
yarn dev:marketing        # Run marketing site
yarn build                # Build all workspaces
yarn lint                 # Lint all workspaces
yarn db:push              # Push Prisma schema to DB
yarn db:studio            # Open Prisma Studio
yarn db:generate          # Generate Prisma client
```

## Code Style

- No semicolons, single quotes, 2-space indent, trailing commas
- Named function declarations for components (not arrow functions)
- Named functions for event handlers inside components
- `interface` for object shapes, `type` for unions/aliases
- Clean Code: meaningful names over comments
- Import order: builtin → external → internal → relative (with blank lines between groups)
- Top-to-bottom reading order: exports first, helpers below
- See `docs/CODE_STYLE.md` for full details

## Critical Rules

1. **NEVER delete the database** without explicit permission
2. **Use Yarn**, not npm
3. **Tailwind v4 syntax**: `bg-black/10` not `bg-opacity-10`
4. **Path alias**: `@/*` maps to `src/*`
