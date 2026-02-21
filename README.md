# OpenFinance

**Self-hosted personal finance and bookkeeping with AI**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/yagudaev/openfinance/actions/workflows/ci.yml/badge.svg)](https://github.com/yagudaev/openfinance/actions/workflows/ci.yml)

Live at [openfinance.to](https://openfinance.to)

## Features

- **Bank statement processing** -- upload PDF bank statements and let AI extract transactions automatically
- **Balance verification** -- validates extracted transactions against stated balances
- **Transaction management** -- view, search, filter, and categorize transactions across multiple accounts
- **Dashboard** -- monthly income/expenses and 12-month cash flow chart
- **AI financial chat** -- ask questions about your finances in natural language with tool use
- **Privacy-first** -- your data stays on your server in a single SQLite file
- **Docker deployment** -- deploy to any VPS with Docker

## Quick Start

### Self-hosted (Recommended)

```bash
git clone https://github.com/yagudaev/openfinance.git
cd openfinance
cp .env.example .env
# Edit .env with your secrets (BETTER_AUTH_SECRET, OPENROUTER_API_KEY)
docker compose up -d
```

Visit `http://localhost:3000`

### Development

```bash
corepack enable && corepack prepare yarn@4.0.0 --activate
yarn install
yarn db:generate
yarn db:push
yarn dev
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + TypeScript
- **Database**: Prisma 7 ORM + SQLite via `@prisma/adapter-better-sqlite3`
- **Auth**: BetterAuth (email/password + Google OAuth)
- **AI**: OpenRouter + Vercel AI SDK with tool use (Cerebras default)
- **UI**: Tailwind CSS v4 + shadcn/ui
- **Testing**: Playwright E2E tests
- **CI**: GitHub Actions (lint, typecheck, Playwright)
- **Deployment**: Docker on Coolify (Hetzner Cloud)
- **Package Manager**: Yarn 4.0.0

## Documentation

- [Mintlify Docs](https://docs.openfinance.to) -- quickstart, features, API reference
- [Product Spec](docs/SPEC.md)
- [Code Style Guide](docs/CODE_STYLE.md)
- [Brand Guidelines](docs/BRAND.md)

## License

MIT
