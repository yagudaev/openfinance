# OpenFinance

**Self-hosted personal finance and bookkeeping with AI**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 📊 **Transaction tracking** - Import bank statements, categorize expenses
- 🤖 **AI-powered insights** - Built-in financial advisor agent
- 🔒 **Privacy-first** - Your data stays on your server
- 📦 **Single-file database** - SQLite for easy backup and portability
- 🚀 **One-command deploy** - Docker or direct install

## Quick Start

### Self-hosted (Recommended)

```bash
# Clone and run
git clone https://github.com/yagudaev/openfinance.git
cd openfinance
cp .env.example .env
# Edit .env with your settings
docker-compose up -d
```

Visit `http://localhost:3000`

### Development

```bash
# Install dependencies
yarn install

# Set up database
yarn db:push

# Run development server
yarn dev
```

## Tech Stack

- **Framework**: Next.js 16 + App Router
- **Database**: Prisma + SQLite (self-hosted) / PostgreSQL (managed)
- **AI**: VoltAgent for financial advisor features
- **UI**: Tailwind CSS + shadcn/ui

## Documentation

- [Product Spec](docs/SPEC.md)
- [Code Style Guide](docs/CODE_STYLE.md)
- [Brand Guidelines](docs/BRAND.md)

## License

MIT
