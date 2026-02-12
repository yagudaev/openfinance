# OpenFinance - Product Specification

> The next-generation personal finance and bookkeeping platform, evolved from keeping-books.

**Version:** 1.0  
**Date:** February 12, 2026  
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Target Users](#3-target-users)
4. [Core Features](#4-core-features)
5. [AI Features](#5-ai-features)
6. [Technical Architecture](#6-technical-architecture)
7. [Data Models](#7-data-models)
8. [API Routes Structure](#8-api-routes-structure)
9. [Deployment Model](#9-deployment-model)
10. [Migration from keeping-books](#10-migration-from-keeping-books)
11. [UI/UX Patterns](#11-uiux-patterns)
12. [Future Roadmap](#12-future-roadmap)

---

## 1. Executive Summary

**OpenFinance** is a self-hosted personal finance and bookkeeping application designed for freelancers, small business owners, and individuals who want complete control over their financial data. It builds upon the lessons learned from **keeping-books** while introducing a new tech stack optimized for self-hosting, privacy, and AI-powered financial intelligence.

### Key Differentiators

- **Self-hosted first**: Single-file SQLite database for easy backup and migration
- **AI-native**: Built-in financial advisor and market tracking agents via VoltAgent
- **Privacy-focused**: Your data stays on your server
- **Open source**: Transparent, community-driven development

---

## 2. Product Vision & Goals

### Vision

*Empower individuals and small businesses to understand, manage, and optimize their finances with the help of AI — all while maintaining complete ownership and privacy of their financial data.*

### Goals

1. **Simplify Financial Management**
   - Automatic bank statement parsing with AI
   - Smart transaction categorization
   - Balance verification to catch discrepancies

2. **Provide Actionable Insights**
   - AI-powered financial advisor for personalized recommendations
   - Market tracking for investment awareness
   - Cash flow projections and trend analysis

3. **Enable Self-Hosting**
   - Single-binary deployment
   - SQLite as default (PostgreSQL for managed option)
   - Docker-first deployment strategy

4. **Maintain Data Sovereignty**
   - All data stored locally
   - No third-party data sharing
   - Export everything at any time

### Non-Goals (v1)

- Real-time bank account syncing (Plaid/Finicity integration)
- Multi-user/team collaboration
- Invoicing and billing
- Tax filing integration

---

## 3. Target Users

### Primary Personas

#### 1. **The Freelancer / Solopreneur**
- Manages 2-5 bank accounts (personal + business)
- Needs to track income, expenses, and owner pay
- Wants to understand monthly cash flow
- Files own taxes, needs categorized transactions

#### 2. **The Privacy-Conscious Individual**
- Doesn't trust cloud financial apps (Mint, YNAB)
- Wants complete control over financial data
- Comfortable self-hosting on a VPS
- Values open-source software

#### 3. **The Small Business Owner**
- Has dedicated business bank accounts
- Needs to separate personal from business expenses
- Requires quarterly/annual financial reports
- May have multiple currencies (CAD/USD)

### User Requirements

| Requirement | Priority |
|-------------|----------|
| Upload bank statement PDFs | P0 |
| Automatic transaction extraction | P0 |
| Transaction categorization | P0 |
| Balance verification | P0 |
| Multi-account support | P0 |
| Dashboard with cash flow | P1 |
| AI financial advisor | P1 |
| Market tracking | P2 |
| Multi-currency support | P1 |
| Fiscal year configuration | P1 |
| Export to CSV | P1 |
| Mobile-responsive UI | P2 |

---

## 4. Core Features

### 4.1 Bank Statement Processing

**From keeping-books ✓** - Enhanced

The core workflow that powers OpenFinance:

1. **PDF Upload**: User uploads bank statement PDF
2. **Image Extraction**: Convert PDF pages to high-resolution images
3. **Text Extraction**: Extract text from PDF for accuracy
4. **AI Processing**: Send images + text to LLM for structured data extraction
5. **Iterative Verification**: Retry up to 15 times if balance doesn't match
6. **Storage**: Save statement metadata and transactions

**Improvements over keeping-books:**
- Local LLM option via VoltAgent (Ollama integration)
- Batch upload support
- Background job processing with progress tracking
- Support for more bank formats

### 4.2 Transaction Management

**From keeping-books ✓** - Enhanced

Features:
- **View transactions** across all accounts or filtered
- **Sort** by date, description, amount, balance, category
- **Search** by description or amount
- **Filter** by:
  - Date range (today, 7d, 30d, 90d, custom, all time)
  - Account(s)
  - Statement(s)
  - Category (expense, income, owner-pay, internal-transfer, shareholder-loan, uncategorized)
  - Transaction type (credit/debit)
- **Bulk actions**: Delete, categorize, export
- **Edit transactions**: Change category, description
- **Add manual transactions**: For cash or missed items
- **Find on statement**: Jump to PDF location of a transaction

### 4.3 Statement Verification

**From keeping-books ✓** - Retained

The "source of truth" feature:

- Side-by-side PDF viewer with transaction list
- Click-to-highlight: Match PDF text to transaction fields
- Balance verification status (balanced/unbalanced)
- Human verification flag for audit trail
- Discrepancy tracking with notes

### 4.4 Dashboard & Analytics

**From keeping-books ✓** - Enhanced

Key metrics displayed:
- **Monthly Income** (current vs. previous month with % change)
- **Monthly Expenses** (current vs. previous month with % change)
- **Cash Flow Chart** (12-month bar chart, positive/negative)
- Multi-currency support (USD converted to CAD)

**New in OpenFinance:**
- **Net Worth Tracking** (when connected to asset accounts)
- **Category Breakdown** (pie chart of expenses)
- **AI-Generated Insights** (see AI Features)
- **Savings Rate** calculation

### 4.5 Account Management

**From keeping-books ✓** - Enhanced

- **Account nicknames**: "Chase Checking" instead of "****1234"
- **Currency assignment**: CAD or USD per account
- **Bank name tracking**: Auto-detected from statements

**New in OpenFinance:**
- **Account types**: Checking, Savings, Credit Card, Investment
- **Account colors**: Visual differentiation
- **Account ordering**: Drag-and-drop priority

### 4.6 Settings

**From keeping-books ✓** - Retained

- **Timezone configuration**:
  - Bank timezone (for statement dates)
  - User timezone (for display)
- **Fiscal year configuration**:
  - End month and day (default: Dec 31)
  - Affects fiscal year filters in transactions

**New in OpenFinance:**
- **AI provider settings**: OpenAI API key, Ollama URL
- **Notification preferences**: Email, push
- **Data export/import**: Full account backup
- **Appearance**: Theme (light/dark/system)

---

## 5. AI Features

### 5.1 Transaction Categorization (Existing)

**From keeping-books ✓** - Enhanced with VoltAgent

Current implementation uses GPT for batch categorization:

```
Categories:
- expense: Business expenses (supplies, services, rent, utilities)
- owner-pay: Withdrawals/payments to business owner (dividends)
- income: Revenue, sales, customer payments
- internal-transfer: Transfers between accounts (e-transfer, interac)
- shareholder-loan: Owner lending money to company
```

**OpenFinance enhancements:**
- Learn from user corrections (feedback loop)
- Subcategory suggestions
- Rule-based auto-categorization (before hitting AI)

### 5.2 Financial Advisor Agent (New)

**VoltAgent-powered conversational AI**

A chat-based financial advisor that can:

1. **Answer questions about your finances**
   - "How much did I spend on software subscriptions last quarter?"
   - "What's my average monthly income this year?"
   - "Which category has grown the most?"

2. **Provide proactive insights**
   - "Your expenses increased 25% this month vs. average"
   - "You have an unusual large transaction to review"
   - "You're on track to exceed last year's income"

3. **Make recommendations**
   - "Based on your cash flow, you could save $X more per month"
   - "Consider categorizing recurring transfers as internal-transfer"
   - "Your fiscal year is ending in 2 months — time for tax prep"

**Implementation:**
- VoltAgent with tools for querying transaction database
- Memory of previous conversations
- Scheduled check-ins (optional)

### 5.3 Market Tracking Agent (New)

**VoltAgent-powered market awareness**

For users tracking investments or business expenses tied to markets:

1. **Daily/Weekly summaries**
   - "S&P 500 up 2% this week"
   - "CAD/USD rate is 1.37"
   - "Interest rates expected to change"

2. **Personalized alerts**
   - Currency rate thresholds (notify when USD/CAD hits 1.40)
   - Stock price movements for holdings
   - Economic indicator changes

3. **Investment insights** (future)
   - Portfolio performance tracking
   - Dividend tracking
   - Tax-loss harvesting suggestions

**Implementation:**
- VoltAgent with web search tools
- Scheduled cron jobs for market data
- User-configured watchlist

### 5.4 Statement Processing AI (Enhanced)

**From keeping-books ✓** - VoltAgent integration

The existing statement processor uses OpenAI GPT-5-nano. OpenFinance will:

1. **Support multiple providers**:
   - OpenAI (cloud, default)
   - Anthropic Claude (cloud)
   - Ollama (local, privacy-first)

2. **Improve accuracy with RAG**:
   - Learn bank-specific formats
   - Use previous statements as context

3. **Handle edge cases better**:
   - Multi-currency statements
   - Foreign transaction formatting
   - Complex fee structures

---

## 6. Technical Architecture

### 6.1 Tech Stack

| Component | keeping-books | OpenFinance |
|-----------|---------------|-------------|
| Framework | Next.js 16 + App Router | Next.js 16 + App Router |
| Language | TypeScript | TypeScript |
| Database | Supabase (PostgreSQL) | Prisma + SQLite (default) / PostgreSQL |
| Auth | Supabase Auth | NextAuth.js (self-hosted) |
| ORM | Supabase Client | Prisma |
| Storage | Supabase Storage | Local filesystem / S3-compatible |
| AI | OpenAI SDK | VoltAgent + OpenAI/Anthropic/Ollama |
| Styling | Tailwind CSS + shadcn/ui | Tailwind CSS + shadcn/ui |
| PDF | react-pdf + pdfjs-dist | react-pdf + pdfjs-dist |
| Charts | Recharts | Recharts |
| Hosting | Vercel + Supabase Cloud | Self-hosted VPS / Docker |

### 6.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenFinance                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Next.js   │    │  VoltAgent  │    │   Prisma    │         │
│  │   Frontend  │◄──►│   AI Layer  │◄──►│     ORM     │         │
│  │  (React 19) │    │             │    │             │         │
│  └─────────────┘    └─────────────┘    └──────┬──────┘         │
│         │                  │                   │                │
│         │                  │                   ▼                │
│         │                  │           ┌─────────────┐         │
│         │                  │           │   SQLite    │         │
│         │                  │           │ (single DB) │         │
│         │                  │           └─────────────┘         │
│         │                  │                                    │
│         │                  ▼                                    │
│         │           ┌─────────────┐                             │
│         │           │   OpenAI    │                             │
│         │           │  Anthropic  │                             │
│         │           │   Ollama    │                             │
│         │           └─────────────┘                             │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │   File      │                                                │
│  │   Storage   │                                                │
│  │   (local)   │                                                │
│  └─────────────┘                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 VoltAgent Integration

VoltAgent provides the AI agent framework for OpenFinance:

```typescript
// Example: Financial Advisor Agent
import { VoltAgent, createTool } from '@voltagent/core'

const advisorAgent = new VoltAgent({
  name: 'FinancialAdvisor',
  model: 'gpt-4o', // or 'ollama/llama3'
  tools: [
    createTool({
      name: 'queryTransactions',
      description: 'Search and filter transactions',
      parameters: { /* schema */ },
      execute: async (params) => {
        // Query Prisma database
      }
    }),
    createTool({
      name: 'getAccountSummary',
      description: 'Get summary statistics for accounts',
      // ...
    }),
    createTool({
      name: 'getCashFlow',
      description: 'Get cash flow data for a period',
      // ...
    })
  ],
  systemPrompt: `You are a helpful financial advisor...`
})
```

### 6.4 Directory Structure

```
openfinance/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, signup)
│   ├── (dashboard)/              # Protected routes
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── statements/
│   │   ├── accounts/
│   │   ├── advisor/              # AI advisor chat
│   │   └── settings/
│   ├── api/                      # API routes
│   │   ├── auth/[...nextauth]/
│   │   ├── transactions/
│   │   ├── statements/
│   │   ├── process-statement/
│   │   ├── categorize/
│   │   └── advisor/              # VoltAgent endpoints
│   ├── layout.tsx
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── transactions/
│   ├── statements/
│   ├── dashboard/
│   ├── advisor/                  # Chat UI components
│   └── shared/
├── lib/
│   ├── prisma.ts                 # Prisma client
│   ├── auth.ts                   # NextAuth config
│   ├── voltagent/                # AI agent configurations
│   │   ├── advisor.ts
│   │   ├── market-tracker.ts
│   │   └── statement-processor.ts
│   ├── services/
│   │   ├── statement-processor.ts
│   │   ├── transaction-categorizer.ts
│   │   └── pdf-processor.ts
│   └── utils/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   ├── pdf.worker.min.js
│   └── uploads/                  # Statement PDFs (gitignored)
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/
│   └── self-hosting.md
└── marketing/                    # Vercel-hosted marketing site
    └── (separate repo or folder)
```

---

## 7. Data Models

### 7.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // or "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// Authentication
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String?
  emailVerified DateTime?
  image         String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  accounts         Account[]
  bankStatements   BankStatement[]
  transactions     Transaction[]
  userSettings     UserSettings?
  processingJobs   ProcessingJob[]
  advisorChats     AdvisorChat[]
  marketWatchlist  MarketWatchItem[]
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ============================================
// Core Financial Models
// ============================================

model Account {
  id            String   @id @default(cuid())
  userId        String
  accountNumber String
  nickname      String
  bankName      String?
  accountType   AccountType @default(CHECKING)
  currency      Currency    @default(CAD)
  color         String?     // Hex color for UI
  sortOrder     Int         @default(0)
  isActive      Boolean     @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, accountNumber])
  @@index([userId])
}

enum AccountType {
  CHECKING
  SAVINGS
  CREDIT_CARD
  INVESTMENT
  OTHER
}

enum Currency {
  CAD
  USD
}

model BankStatement {
  id                   String   @id @default(cuid())
  userId               String
  fileName             String
  filePath             String   // Local file path
  fileSize             Int
  contentHash          String?  // For duplicate detection
  
  // Extracted metadata
  bankName             String
  accountNumber        String?
  accountType          String?
  statementDate        DateTime
  periodStart          DateTime
  periodEnd            DateTime
  openingBalance       Decimal  @db.Decimal(12, 2)
  closingBalance       Decimal  @db.Decimal(12, 2)
  totalDeposits        Decimal? @db.Decimal(12, 2)
  totalWithdrawals     Decimal? @db.Decimal(12, 2)
  
  // Processing status
  isProcessed          Boolean  @default(false)
  processedAt          DateTime?
  processingTimezone   String?
  
  // Verification
  verificationStatus   VerificationStatus @default(PENDING)
  humanVerified        Boolean  @default(false)
  humanVerifiedAt      DateTime?
  discrepancyAmount    Decimal? @db.Decimal(12, 2)
  
  // Duplicate handling
  duplicateOf          String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user                 User @relation(fields: [userId], references: [id], onDelete: Cascade)
  parentStatement      BankStatement? @relation("DuplicateStatements", fields: [duplicateOf], references: [id])
  duplicateStatements  BankStatement[] @relation("DuplicateStatements")
  transactions         Transaction[]
  balanceVerifications BalanceVerification[]
  processingJobs       ProcessingJob[]
  
  @@index([userId])
  @@index([accountNumber])
  @@index([statementDate])
}

enum VerificationStatus {
  PENDING
  VERIFIED
  UNBALANCED
}

model Transaction {
  id              String   @id @default(cuid())
  userId          String
  statementId     String
  
  transactionDate DateTime
  description     String
  amount          Decimal  @db.Decimal(12, 2) // Positive for credit, negative for debit
  balance         Decimal? @db.Decimal(12, 2)
  transactionType TransactionType
  category        TransactionCategory?
  referenceNumber String?
  sortOrder       Int?     // Order within statement
  
  // User edits
  userDescription String?  // User-edited description
  userNotes       String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  statement BankStatement @relation(fields: [statementId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([statementId])
  @@index([transactionDate])
  @@index([category])
}

enum TransactionType {
  CREDIT
  DEBIT
}

enum TransactionCategory {
  EXPENSE
  INCOME
  OWNER_PAY
  INTERNAL_TRANSFER
  SHAREHOLDER_LOAN
  UNCATEGORIZED
}

model BalanceVerification {
  id                        String  @id @default(cuid())
  statementId               String
  
  calculatedOpeningBalance  Decimal @db.Decimal(12, 2)
  calculatedClosingBalance  Decimal @db.Decimal(12, 2)
  statementOpeningBalance   Decimal @db.Decimal(12, 2)
  statementClosingBalance   Decimal @db.Decimal(12, 2)
  
  isBalanced                Boolean
  discrepancyAmount         Decimal? @db.Decimal(12, 2)
  notes                     String?
  
  verificationDate DateTime @default(now())
  
  statement BankStatement @relation(fields: [statementId], references: [id], onDelete: Cascade)
  
  @@index([statementId])
}

// ============================================
// Processing & Jobs
// ============================================

model ProcessingJob {
  id           String           @id @default(cuid())
  userId       String
  statementId  String?
  fileName     String
  status       ProcessingStatus @default(PENDING)
  
  errorMessage String?
  
  startedAt    DateTime?
  completedAt  DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  statement BankStatement? @relation(fields: [statementId], references: [id])
  logs      ProcessingLog[]
  
  @@index([userId])
  @@index([status])
}

enum ProcessingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

model ProcessingLog {
  id             String @id @default(cuid())
  jobId          String
  sequenceNumber Int
  logType        String // info, warning, error, debug
  title          String
  content        Json?
  
  createdAt DateTime @default(now())
  
  job ProcessingJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  @@index([jobId])
}

// ============================================
// User Settings
// ============================================

model UserSettings {
  id                  String  @id @default(cuid())
  userId              String  @unique
  
  // Timezone settings
  bankTimezone        String  @default("America/Toronto")
  userTimezone        String  @default("America/Vancouver")
  
  // Fiscal year settings
  fiscalYearEndMonth  Int     @default(12) // 1-12
  fiscalYearEndDay    Int     @default(31)
  
  // AI settings
  aiProvider          AIProvider @default(OPENAI)
  openaiApiKey        String?    // Encrypted
  ollamaUrl           String?
  preferredModel      String?
  
  // Notification settings
  emailNotifications  Boolean @default(true)
  weeklyDigest        Boolean @default(false)
  
  // Appearance
  theme               Theme   @default(SYSTEM)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum AIProvider {
  OPENAI
  ANTHROPIC
  OLLAMA
}

enum Theme {
  LIGHT
  DARK
  SYSTEM
}

// ============================================
// AI Features
// ============================================

model AdvisorChat {
  id        String   @id @default(cuid())
  userId    String
  title     String?  // Auto-generated from first message
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user     User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages AdvisorMessage[]
  
  @@index([userId])
}

model AdvisorMessage {
  id        String @id @default(cuid())
  chatId    String
  role      MessageRole
  content   String
  
  // Tool calls (if any)
  toolCalls Json?
  toolResults Json?
  
  createdAt DateTime @default(now())
  
  chat AdvisorChat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  
  @@index([chatId])
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
  TOOL
}

model MarketWatchItem {
  id        String         @id @default(cuid())
  userId    String
  type      WatchItemType
  symbol    String         // e.g., "AAPL", "USD/CAD"
  name      String         // e.g., "Apple Inc.", "US Dollar"
  
  // Alert settings
  alertEnabled    Boolean @default(false)
  alertThreshold  Decimal? @db.Decimal(12, 4)
  alertDirection  AlertDirection?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, type, symbol])
  @@index([userId])
}

enum WatchItemType {
  STOCK
  CURRENCY
  CRYPTO
  INDEX
}

enum AlertDirection {
  ABOVE
  BELOW
}

// ============================================
// Audit & Logging
// ============================================

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  entity    String
  entityId  String?
  details   Json?
  ipAddress String?
  userAgent String?
  
  createdAt DateTime @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

### 7.2 Model Relationships Diagram

```
User
├── UserSettings (1:1)
├── Account[] (1:N)
├── BankStatement[] (1:N)
│   ├── Transaction[] (1:N)
│   ├── BalanceVerification[] (1:N)
│   └── ProcessingJob[] (1:N)
│       └── ProcessingLog[] (1:N)
├── AdvisorChat[] (1:N)
│   └── AdvisorMessage[] (1:N)
└── MarketWatchItem[] (1:N)
```

---

## 8. API Routes Structure

### 8.1 Authentication Routes

```
/api/auth/[...nextauth]
├── POST /api/auth/signin
├── POST /api/auth/signout
├── GET  /api/auth/session
└── GET  /api/auth/csrf
```

### 8.2 Core API Routes

```
/api/statements
├── GET    /                     # List all statements
├── POST   /                     # Upload new statement
├── GET    /:id                  # Get statement details
├── PATCH  /:id                  # Update statement metadata
├── DELETE /:id                  # Delete statement + transactions
├── POST   /:id/reprocess        # Reprocess statement with AI
└── PATCH  /:id/verify           # Mark as human verified

/api/transactions
├── GET    /                     # List transactions (with filters)
├── POST   /                     # Create manual transaction
├── PATCH  /:id                  # Update transaction
├── DELETE /:id                  # Delete transaction
├── POST   /bulk-delete          # Delete multiple
├── POST   /bulk-categorize      # Categorize multiple
└── GET    /export               # Export to CSV

/api/accounts
├── GET    /                     # List all accounts
├── POST   /                     # Create account nickname
├── PATCH  /:id                  # Update account
└── DELETE /:id                  # Delete account

/api/process-statement
├── POST   /                     # Start processing job
└── GET    /jobs                 # List processing jobs
    └── GET /:id                 # Get job status + logs

/api/categorize
└── POST   /                     # AI categorize transactions

/api/settings
├── GET    /                     # Get user settings
└── PATCH  /                     # Update settings
```

### 8.3 AI Routes

```
/api/advisor
├── POST   /chat                 # Send message to advisor
├── GET    /chats                # List chat history
├── GET    /chats/:id            # Get chat messages
└── DELETE /chats/:id            # Delete chat

/api/market
├── GET    /watchlist            # Get user's watchlist
├── POST   /watchlist            # Add item to watchlist
├── DELETE /watchlist/:id        # Remove from watchlist
├── GET    /quotes               # Get current prices
└── GET    /summary              # AI market summary
```

### 8.4 Dashboard Routes

```
/api/dashboard
├── GET    /stats                # Monthly income/expenses
├── GET    /cashflow             # 12-month cash flow data
├── GET    /categories           # Expense breakdown by category
└── GET    /insights             # AI-generated insights
```

---

## 9. Deployment Model

### 9.1 Self-Hosted (Primary)

**Target: VPS with Docker**

```yaml
# docker-compose.yml
version: '3.8'

services:
  openfinance:
    image: openfinance/openfinance:latest
    container_name: openfinance
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data          # SQLite DB + uploads
      - ./config:/app/config      # Configuration files
    environment:
      - DATABASE_URL=file:/app/data/openfinance.db
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=https://finance.yourdomain.com
      - OPENAI_API_KEY=${OPENAI_API_KEY}  # Optional
    restart: unless-stopped

  # Optional: Ollama for local AI
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    volumes:
      - ollama_data:/root/.ollama
    # GPU support (uncomment if available)
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - capabilities: [gpu]

volumes:
  ollama_data:
```

**Backup Strategy:**
```bash
# Single-file backup
cp /app/data/openfinance.db ./backup/openfinance-$(date +%Y%m%d).db

# With uploads
tar -czvf backup-$(date +%Y%m%d).tar.gz /app/data/
```

### 9.2 Managed Option (Future)

**PostgreSQL deployment for teams/enterprise:**

- Hosted PostgreSQL (Supabase, Neon, Railway)
- S3-compatible storage for PDFs
- Multiple user support
- Shared accounts/workspaces

### 9.3 Marketing Site

**Hosted on Vercel (separate deployment):**

```
marketing/
├── app/
│   ├── page.tsx           # Landing page
│   ├── features/
│   ├── pricing/
│   ├── docs/
│   └── blog/
├── components/
└── public/
```

**Domain Strategy:**
- `openfinance.app` - Marketing site (Vercel)
- `app.openfinance.app` - Managed cloud option (future)
- Self-hosted: User's own domain

---

## 10. Migration from keeping-books

### 10.1 Data Migration

For existing keeping-books users:

```typescript
// scripts/migrate-from-keeping-books.ts

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

async function migrateData() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const prisma = new PrismaClient()
  
  // 1. Migrate user settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
  
  for (const setting of settings) {
    await prisma.userSettings.create({
      data: {
        userId: setting.user_id,
        bankTimezone: setting.bank_timezone,
        userTimezone: setting.user_timezone,
        fiscalYearEndMonth: setting.fiscal_year_end_month,
        fiscalYearEndDay: setting.fiscal_year_end_day,
      }
    })
  }
  
  // 2. Migrate accounts
  // 3. Migrate bank statements
  // 4. Migrate transactions
  // 5. Download PDFs from Supabase storage
}
```

### 10.2 Feature Parity Checklist

| Feature | keeping-books | OpenFinance |
|---------|---------------|-------------|
| PDF Upload | ✓ | ✓ |
| AI Extraction | ✓ GPT-5-nano | ✓ VoltAgent (multi-provider) |
| Transaction Categories | ✓ 5 categories | ✓ 5 categories + custom |
| Balance Verification | ✓ | ✓ |
| Multi-account | ✓ | ✓ |
| Multi-currency | ✓ CAD/USD | ✓ CAD/USD (extensible) |
| Fiscal Year | ✓ | ✓ |
| Dashboard | ✓ | ✓ Enhanced |
| PDF Viewer | ✓ | ✓ |
| Transaction Filters | ✓ | ✓ |
| Export CSV | ✓ | ✓ |
| AI Categorization | ✓ | ✓ Enhanced |
| AI Advisor | ✗ | ✓ New |
| Market Tracking | ✗ | ✓ New |
| Self-hosted | ✗ | ✓ Primary |
| Local AI (Ollama) | ✗ | ✓ New |

---

## 11. UI/UX Patterns

### 11.1 Layout Structure

**From keeping-books ✓** - Refined

```
┌─────────────────────────────────────────────────────────┐
│  Navbar (Logo, Nav Links, User Menu)                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Page Content                                           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Page Header (Title, Actions)                    │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  Filters / Tabs                                  │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  Content Area (Table, Cards, etc.)               │   │
│  │                                                   │   │
│  │                                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 11.2 Navigation

```
Dashboard          - Overview + cash flow
Transactions       - All transactions + filters
Statements         - PDF viewer + verification
Accounts           - Account management
Advisor            - AI chat (new)
Market             - Watchlist + alerts (new)
Settings           - User preferences
```

### 11.3 Component Library

**shadcn/ui components used:**
- Button, Input, Label, Checkbox
- Select, Dropdown Menu, Popover
- Dialog, Alert Dialog, Sheet
- Table, Card, Badge
- Calendar, Date Picker
- Chart (Recharts wrapper)
- Tabs, Radio Group

### 11.4 Design Principles

1. **Progressive Disclosure**: Show essential info first, details on demand
2. **Consistent Patterns**: Same filter UI across all pages
3. **Keyboard Navigation**: Full keyboard support for power users
4. **Responsive Design**: Mobile-friendly (P2 priority)
5. **Dark Mode**: System-aware + manual toggle
6. **Accessibility**: WCAG 2.1 AA compliance

---

## 12. Future Roadmap

### Phase 1: MVP (v1.0)

**Core Feature Parity + Self-Hosting**

- [ ] Prisma schema + SQLite setup
- [ ] NextAuth.js authentication
- [ ] Statement upload + processing
- [ ] Transaction management
- [ ] Dashboard with cash flow
- [ ] Docker deployment
- [ ] Documentation

**Timeline:** 4-6 weeks

### Phase 2: AI Features (v1.1)

**VoltAgent Integration**

- [ ] Financial Advisor agent
- [ ] Enhanced categorization with learning
- [ ] Ollama support for local AI
- [ ] Basic market tracking

**Timeline:** 2-3 weeks

### Phase 3: Polish (v1.2)

**Refinement + Community**

- [ ] Migration tool from keeping-books
- [ ] Mobile-responsive design
- [ ] Performance optimization
- [ ] Community feedback integration

**Timeline:** 2-3 weeks

### Future Considerations (v2.0+)

1. **Bank Integrations**
   - Plaid/Finicity for automatic imports
   - Open Banking API support

2. **Multi-User Support**
   - Shared accounts/workspaces
   - Accountant access

3. **Invoicing**
   - Basic invoice generation
   - Payment tracking

4. **Tax Features**
   - Tax category mapping
   - Report generation for accountants

5. **Investments**
   - Portfolio tracking
   - Dividend tracking
   - Performance analytics

6. **Mobile App**
   - React Native companion app
   - Quick transaction entry
   - Push notifications

---

## Appendix A: keeping-books Analysis

### What Works Well

1. **AI-powered PDF extraction** - Iterative approach with balance verification
2. **Transaction filtering** - Comprehensive filter options with URL persistence
3. **PDF viewer** - Side-by-side verification with highlighting
4. **Category system** - Simple, effective for freelancers
5. **Fiscal year support** - Flexible configuration
6. **Date handling** - Timezone-aware utilities prevent common bugs

### What to Improve

1. **Authentication** - Supabase Auth is great but ties to their cloud
2. **File storage** - Vercel Blob / Supabase Storage requires cloud
3. **Database** - PostgreSQL on Supabase, not self-hostable
4. **AI provider lock-in** - Only OpenAI supported
5. **No chat interface** - Missing interactive AI experience
6. **No market awareness** - No investment/market features

### Code Quality Notes

- Clean Code style: meaningful names, minimal comments
- Good separation of concerns (services, components, types)
- Consistent error handling patterns
- Date utilities prevent timezone bugs

---

## Appendix B: Environment Variables

```bash
# Database
DATABASE_URL="file:./data/openfinance.db"

# Authentication
NEXTAUTH_SECRET="generate-a-secure-secret"
NEXTAUTH_URL="https://your-domain.com"

# AI Providers (at least one required)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
OLLAMA_URL="http://localhost:11434"

# File Storage
UPLOAD_DIR="./data/uploads"

# Optional: External Services
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."
```

---

## Appendix C: References

- [keeping-books Repository](https://github.com/yagudaev/keeping-books)
- [VoltAgent Documentation](https://voltagent.dev)
- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

---

*This specification is a living document. Update as requirements evolve.*
