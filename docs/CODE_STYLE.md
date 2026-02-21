# OpenFinance Code Style Guide

This guide documents Michael's code style preferences, derived from analyzing the AudiowaveAI and keeping-books codebases. Follow these conventions for consistency across OpenFinance.

## Table of Contents

1. [Formatting Rules](#formatting-rules)
2. [File & Folder Naming](#file--folder-naming)
3. [TypeScript Patterns](#typescript-patterns)
4. [React Component Patterns](#react-component-patterns)
5. [Code Organization](#code-organization)
6. [Import Organization](#import-organization)
7. [Comments & Documentation](#comments--documentation)
8. [Error Handling](#error-handling)
9. [Prettier & ESLint Configuration](#prettier--eslint-configuration)
10. [Examples from Codebase](#examples-from-codebase)

---

## Formatting Rules

### Prettier Configuration

```javascript
/** @type {import('prettier').Options} */
module.exports = {
  singleQuote: true,
  semi: false,
  trailingComma: 'all',
  // plugins: ['prettier-plugin-tailwindcss'],
}
```

### Key Rules

| Rule | Value | Example |
|------|-------|---------|
| Semicolons | **No semicolons** | `const x = 1` |
| Quotes | **Single quotes** | `'hello world'` |
| Indentation | **2 spaces** | — |
| Trailing commas | **Always** (ES5+) | `{ a, b, }` |
| Line width | **80 characters** (soft) | — |

---

## File & Folder Naming

### Files

| Type | Convention | Example |
|------|------------|---------|
| React components | **PascalCase** | `ChapterCard.tsx`, `MiniPlayer.tsx` |
| Hooks | **camelCase** with `use` prefix | `useHistoryRecorder.ts`, `useUser.tsx` |
| Utilities/lib | **camelCase** | `utils.ts`, `callApi.tsx`, `auth.ts` |
| API routes | **route.ts** in folder | `api/admin/credits/route.ts` |
| Types | **camelCase** or `types.ts` | `types.ts`, `api-types.ts` |
| Config | **camelCase** | `config.ts`, `tailwind.config.ts` |
| Tests | **Same name + `.test.ts`** | `parseEpub.test.ts`, `image.test.ts` |

### Folders

| Type | Convention | Example |
|------|------------|---------|
| Feature folders | **camelCase** or **kebab-case** | `lib/`, `hooks/`, `web-extension/` |
| Component folders | **camelCase** | `components/ui/`, `components/dialogs/` |
| Route folders | **kebab-case** or **[param]** | `(requireAuth)/`, `[id]/` |

### Project Structure

OpenFinance is a single Next.js app (no monorepo):

```
openfinance/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── auth/         # Auth pages
│   │   └── (private)/    # Protected routes
│   ├── components/
│   │   └── ui/           # shadcn/ui base components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities, DB client, services
│   │   ├── chat/         # AI chat tools and prompts
│   │   ├── services/     # Business logic (statement processor, etc.)
│   │   ├── constants/
│   │   └── utils/
│   └── types/            # TypeScript types
├── prisma/               # Schema and migrations
├── docs/                 # Mintlify documentation site
├── e2e/                  # Playwright E2E tests
└── server-setup/         # Server provisioning scripts
```

---

## TypeScript Patterns

### Type Definitions

**Prefer `interface` for object shapes, `type` for unions/aliases:**

```typescript
// Object shapes - use interface
interface User {
  id: string
  name: string | null
  email: string
  createdAt: Date
}

// Unions and aliases - use type
type Status = 'pending' | 'processing' | 'complete' | 'error'

// Complex types derived from Prisma
type ChapterWithProject = Chapter & {
  project: {
    name: string
    coverUrl?: string | null
  }
}
```

### Type Imports

```typescript
// Use type-only imports when possible
import type { JWTPayload } from 'jose'
import { type ClassValue, clsx } from 'clsx'
```

### Generic Functions

```typescript
export async function callApi<Data = any>(
  apiPath: string,
  options?: RequestInit,
): Promise<Data> {
  const response = await fetch(apiPath, options)
  return response.json() as Data
}
```

### Strict Mode

Always enable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

---

## React Component Patterns

### Function Components (Preferred Style)

**Use named function declarations for components:**

```typescript
// ✅ Preferred - Named function declaration
export function ChapterCard({ chapter }: { chapter: ChapterWithProject }) {
  return (
    <Card className="flex-shrink-0 w-[300px]">
      {/* ... */}
    </Card>
  )
}

// ✅ Also acceptable for simple components
function DefaultCover({ chapter }: { chapter: ChapterWithProject }) {
  return <div className="relative w-full h-full" />
}

// ❌ Avoid arrow functions for components
const ChapterCard = ({ chapter }: Props) => { ... }
```

### Props Interface

**Define props inline for simple components, extract for complex:**

```typescript
// Simple props - inline
export function GoogleSignInButton({
  text = 'Sign in with Google',
  callbackUrl = '/dashboard',
}: {
  text?: string
  callbackUrl?: string
}) {
  // ...
}

// Complex props - extract type
type ChapterWithProject = Chapter & {
  project: {
    name: string
    coverUrl?: string | null
  }
}

export function ChapterCard({ chapter }: { chapter: ChapterWithProject }) {
  // ...
}
```

### Hooks

**Name hooks with `use` prefix, use `useCallback` for functions passed to children:**

```typescript
export function useHistoryRecorder(chapterId: number | null) {
  const lastSavedTimeRef = useRef<number>(0)

  const recordProgress = useCallback(
    async (currentTimestamp: number, totalDuration: number) => {
      if (!chapterId) return
      // ...
    },
    [chapterId],
  )

  return { recordProgress, resetLastSavedTime }
}
```

### Event Handlers Inside Components

**Use named functions (not arrow functions) for handlers inside components:**

```typescript
export function MiniPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)

  // ✅ Named function for handlers
  function toggle() {
    if (isPlaying) {
      TrackPlayer.pause()
    } else {
      TrackPlayer.play()
    }
  }

  return <Pressable onPress={toggle}>{/* ... */}</Pressable>
}
```

---

## Code Organization

### Top-to-Bottom Reading Order

**Organize code so it can be read from top to bottom:**

1. Imports
2. Types/Interfaces (local to file)
3. Constants
4. Main exported function/component
5. Helper functions (in order they're called)
6. Private/internal functions at bottom

```typescript
// 1. Imports
import { Chapter } from '@prisma/client'
import { prisma } from '@/lib/db'

// 2. Types
type ChapterWithVersions = Chapter & { versions: Version[] }

// 3. Constants
const MAX_RETRIES = 4

// 4. Main exported function
export async function findPublicChapter(slug: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { slug, public: true },
  })
  if (!chapter) return null
  return serializeChapterWithChunks(chapter)
}

// 5. Helper functions (called by main function)
export async function generateSocialPreview(slug: string) {
  // ...
  const url = await uploadImage(buffer)
  return url
}

// 6. Private helpers at bottom
function getCurrentVersion(chapter: ChapterWithVersions) {
  return chapter.versions.find((v) => v.voice === chapter.voice)
}
```

### API Route Pattern

**Use wrapper functions for auth and error handling:**

```typescript
import { NextResponse } from 'next/server'
import { requireAdminRouteAuth } from '@/lib/requireRouteAuth'

// Export with auth wrapper
export const GET = requireAdminRouteAuth(getHandler)

// Handler function below export
async function getHandler() {
  const data = await prisma.user.aggregate({
    _sum: { totalCredits: true },
  })
  return NextResponse.json(data)
}
```

### Server Actions Pattern

```typescript
'use client'

import { callApi } from '@/lib/callApi'

export async function deleteChapter(
  chapter: Chapter,
  {
    beforeDelete,
    afterDelete,
    onError,
  }: {
    beforeDelete?: () => void
    afterDelete?: () => void
    onError?: (e: any) => void
  } = {},
) {
  if (confirm('Are you sure?')) {
    beforeDelete?.()
    try {
      await callApi(`/api/projects/${chapter.projectId}/chapters/${chapter.id}`, {
        method: 'DELETE',
      })
      afterDelete?.()
    } catch (e) {
      onError?.(e)
    }
  }
}
```

---

## Import Organization

### ESLint Import Order

```json
{
  "rules": {
    "import/order": [
      "warn",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ]
  }
}
```

### Example

```typescript
// 1. Built-in (Node.js)
import { createHash } from 'crypto'

// 2. External packages
import { User as DBUser } from '@prisma/client'
import { formatDateShort, formatNumber } from '@workspace/shared/utils'
import Link from 'next/link'
import { useMemo } from 'react'

// 3. Internal (@/ aliases)
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/db'
import { Chapter, Project } from '@/types'

// 4. Parent/sibling/index
import { BecomeButton } from './BecomeButton'
```

---

## Comments & Documentation

### Clean Code Philosophy

**Avoid comments. Express intent through meaningful names:**

```typescript
// ❌ Bad - comment explains what code does
// Check if user has enough credits
if (user.totalCredits - user.usedCredits >= requiredCredits) {
  // ...
}

// ✅ Good - meaningful function name
function userHasEnoughCredits(user: User, requiredCredits: number): boolean {
  return user.totalCredits - user.usedCredits >= requiredCredits
}

if (userHasEnoughCredits(user, requiredCredits)) {
  // ...
}
```

### When Comments Are Acceptable

```typescript
// TODO: we might get rid of this and use our own login method
async authorize(credentials) { ... }

// Important: Bank statement dates are calendar dates without timezone
import { formatDate, parseDate } from '@/lib/utils/date'
```

### JSDoc for Complex Functions (Sparingly)

```typescript
/**
 * Hook for recording playback progress to history.
 * Throttles saves to every 5 seconds of progress change.
 */
export function useHistoryRecorder(chapterId: number | null) {
  // ...
}
```

---

## Error Handling

### API Error Classes

```typescript
export class ApiError extends Error {
  errorCode: string

  constructor(message: string, errorCode: string) {
    super(message)
    this.errorCode = errorCode
  }
}
```

### Try-Catch Pattern

```typescript
try {
  const response = await fetch(apiPath, options)
  if (!response.ok) {
    throw new ApiError(`Server error: ${response.status}`, 'server_error')
  }
  return response.json()
} catch (error) {
  console.error('Route error:', error)
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}
```

### Optional Chaining for Callbacks

```typescript
export async function deleteChapter(
  chapter: Chapter,
  { beforeDelete, afterDelete, onError }: Callbacks = {},
) {
  beforeDelete?.()
  try {
    await callApi(...)
    afterDelete?.()
  } catch (e) {
    onError?.(e)
  }
}
```

---

## Prettier & ESLint Configuration

### prettier.config.js

```javascript
/** @type {import('prettier').Options} */
module.exports = {
  singleQuote: true,
  semi: false,
  trailingComma: 'all',
  // plugins: ['prettier-plugin-tailwindcss'],
}
```

### .eslintrc.json

```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "import"],
  "rules": {
    "import/order": [
      "warn",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ]
  }
}
```

### tsconfig.json (Key Settings)

```json
{
  "compilerOptions": {
    "target": "es2018",
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Examples from Codebase

### Utility Function

```typescript
// shared/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function formatDuration(durationInSeconds: number) {
  let remaining = Math.round(durationInSeconds)

  const hours = Math.floor(remaining / 3600)
  remaining %= 3600

  const minutes = Math.floor(remaining / 60)
  remaining %= 60

  const seconds = remaining

  let result = ''
  if (hours > 0) result += `${hours}hr `
  if (minutes > 0) result += `${minutes}m `
  if (seconds > 0 && hours === 0 && minutes === 0) result += `${seconds}s`
  if (result === '') result = '0s'

  return result.trim()
}
```

### React Component

```typescript
// components/GoogleSignInButton.tsx
import { signIn } from 'next-auth/react'

import { Button } from '@/components/ui/button'

interface Props {
  text?: string
  callbackUrl?: string
}

export function GoogleSignInButton({
  text = 'Sign in with Google',
  callbackUrl = '/dashboard',
}: Props) {
  return (
    <Button
      variant="outline"
      className="flex gap-2 justify-center items-center mt-6 w-full"
      onClick={() => signIn('google', { callbackUrl })}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        {/* SVG paths */}
      </svg>
      {text}
    </Button>
  )
}
```

### Custom Hook

```typescript
// hooks/useHistoryRecorder.ts
import { useCallback, useRef } from 'react'

export function useHistoryRecorder(chapterId: number | null) {
  const lastSavedTimeRef = useRef<number>(0)

  const recordProgress = useCallback(
    async (currentTimestamp: number, totalDuration: number) => {
      if (!chapterId) return

      if (Math.abs(currentTimestamp - lastSavedTimeRef.current) < 5) return
      lastSavedTimeRef.current = currentTimestamp

      try {
        await fetch('/api/historyItems', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapterId,
            currentTimestamp: Math.floor(currentTimestamp),
            totalDuration: isNaN(totalDuration) ? 0 : Math.floor(totalDuration),
          }),
        })
      } catch (err) {
        console.error('Failed to save progress:', err)
      }
    },
    [chapterId],
  )

  const resetLastSavedTime = useCallback(() => {
    lastSavedTimeRef.current = 0
  }, [])

  return { recordProgress, resetLastSavedTime }
}
```

### API Route Handler

```typescript
// app/api/admin/credits/route.ts
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { requireAdminRouteAuth } from '@/lib/requireRouteAuth'
import { CreditStats } from '@/types'

export const GET = requireAdminRouteAuth(getHandler)

async function getHandler() {
  const creditTotals = await prisma.user.aggregate({
    _sum: {
      totalCredits: true,
      usedCredits: true,
    },
  })

  return NextResponse.json({
    totalCredits: creditTotals._sum.totalCredits || 0,
    usedCredits: creditTotals._sum.usedCredits || 0,
  } as CreditStats)
}
```

### Serializer Pattern

```typescript
// serializers.tsx
import { Chapter as PrismaChapter, Project as PrismaProject } from '@prisma/client'

import { Chapter, Project } from './types'

export function serializeProject(project: PrismaProject): Project {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    coverUrl: project.coverUrl ?? `${process.env.BASE_URL}/api/projects/${project.id}/default-cover`,
  }
}

export function serializeChapter(
  chapter: PrismaChapter & { project: PrismaProject },
): Chapter {
  return {
    id: chapter.id,
    name: chapter.name,
    createdAt: chapter.createdAt.toISOString(),
    project: serializeProject(chapter.project),
  }
}
```

---

## Quick Reference Checklist

- [ ] No semicolons
- [ ] Single quotes
- [ ] 2-space indentation
- [ ] Trailing commas everywhere
- [ ] Named function declarations for components
- [ ] Named functions for event handlers inside components
- [ ] Types/interfaces at top of file
- [ ] Public/exported functions first, private helpers at bottom
- [ ] Code reads top-to-bottom (caller before callee)
- [ ] Meaningful names over comments (Clean Code)
- [ ] Import order: builtin → external → internal → relative
- [ ] Blank lines between import groups
- [ ] `@/` alias for src imports
- [ ] Strict TypeScript mode enabled
