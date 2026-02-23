import Link from 'next/link'
import {
  ArrowRight,
  Brain,
  Server,
  BarChart3,
  Code2,
  CheckCircle2,
  Github,
  Star,
} from 'lucide-react'
import { headers } from 'next/headers'

import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth'

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const isLoggedIn = !!session

  return (
    <div className="min-h-screen bg-background">
      <Nav isLoggedIn={isLoggedIn} />
      <Hero isLoggedIn={isLoggedIn} />
      <Features />
      <DeveloperExperience />
      <CallToAction isLoggedIn={isLoggedIn} />
      <Footer />
    </div>
  )
}

function Nav({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <nav className="border-b border-border/50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-heading text-xl font-bold">
          OpenFinance
        </Link>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Button size="sm" className="gap-2" asChild>
              <Link href="/chat">
                Go to App
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/sign-up">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="px-6 pt-20 pb-16 text-center">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700">
          <span className="font-medium">Open Source</span>
          <span className="text-emerald-400">&middot;</span>
          <span className="font-medium">Self-Hosted</span>
          <span className="text-emerald-400">&middot;</span>
          <span className="font-medium">Privacy-First</span>
        </div>

        <h1 className="font-heading text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Engineer your{' '}
          <span className="text-primary">financial future</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          OpenFinance is a self-hosted bookkeeping app with AI-powered
          transaction extraction. Track expenses, manage budgets, and own your
          financial data&mdash;all on your own infrastructure.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="gap-2" asChild>
            <Link href={isLoggedIn ? '/chat' : '/auth/sign-up'}>
              {isLoggedIn ? 'Go to App' : 'Deploy in 5 minutes'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="gap-2" asChild>
            <a
              href="https://github.com/yagudaev/openfinance"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </Button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </div>
          <span>MIT Licensed</span>
        </div>
      </div>

      <DashboardPreview />
    </section>
  )
}

function DashboardPreview() {
  return (
    <div className="mx-auto mt-12 max-w-4xl">
      <div className="hidden overflow-hidden rounded-xl border border-border shadow-2xl sm:block">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <div className="mx-auto rounded-md bg-background px-16 py-1 text-xs text-muted-foreground">
            localhost:3000/dashboard
          </div>
        </div>

        {/* Dashboard content */}
        <div className="bg-background p-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Total Balance</p>
              <p className="mt-1 font-heading text-2xl font-bold">$24,892.50</p>
              <p className="mt-1 text-xs text-emerald-600">&uarr; 12.5% this month</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="mt-1 font-heading text-2xl font-bold">$8,420.00</p>
              <p className="mt-1 text-xs text-emerald-600">&uarr; 8.2% this month</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="mt-1 font-heading text-2xl font-bold">$3,127.25</p>
              <p className="mt-1 text-xs text-red-500">&darr; 4.1% this month</p>
            </div>
          </div>

          {/* Chart placeholder */}
          <div className="mt-6 rounded-lg border border-border p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium">Spending Overview</p>
              <p className="text-xs text-muted-foreground">&bull; Last 30 days</p>
            </div>
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-primary/80"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Extraction',
    description:
      'Upload bank statements and let AI automatically extract and categorize your transactions. No manual data entry required.',
  },
  {
    icon: Server,
    title: 'Self-Hosted Privacy',
    description:
      'Your financial data stays on your server. No cloud dependencies, no third-party access, no compromises on privacy.',
  },
  {
    icon: BarChart3,
    title: 'Financial Insights',
    description:
      'Beautiful dashboards with charts and trends. Understand your spending patterns and track your financial health.',
  },
  {
    icon: Code2,
    title: 'Open Source',
    description:
      'MIT licensed and fully open source. Fork it, customize it, contribute to it. Built by developers, for developers.',
  },
]

function Features() {
  return (
    <section className="border-t border-border/50 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Features
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">
            Everything you need for modern bookkeeping
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Built for developers and privacy-conscious users who want full
            control over their financial data.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold">
                  {feature.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const checklist = [
  'SQLite database — zero external dependencies',
  'Docker Compose ready',
  'REST API with Next.js App Router',
  'AI-powered PDF statement processing',
]

function DeveloperExperience() {
  return (
    <section className="border-t border-border/50 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Developer Experience
        </p>
        <h2 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">
          Deploy with a single command
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Docker-first architecture means you can have OpenFinance running on
          your server in minutes. Full TypeScript codebase with a clean,
          extensible architecture.
        </p>

        <div className="mt-8 space-y-3">
          {checklist.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-xl border border-border bg-[#1E1E2E] text-sm shadow-lg">
          <div className="border-b border-white/10 px-4 py-2.5 text-xs text-white/50">
            $ Terminal
          </div>
          <div className="p-4 font-mono leading-relaxed">
            <p className="text-white/50">
              git clone https://github.com/yagudaev/openfinance
            </p>
            <p className="text-white/50">cd openfinance</p>
            <p className="text-white/50">docker compose up -d</p>
            <p className="mt-3 text-white/40">
              # That&apos;s it! Open http://localhost:3000
            </p>
            <p className="text-emerald-400">
              &#10003; OpenFinance is running on port 3000
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function CallToAction({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="bg-primary px-6 py-20 text-center text-primary-foreground">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-heading text-3xl font-bold sm:text-4xl">
          Ready to take control of your finances?
        </h2>
        <p className="mt-4 text-primary-foreground/80">
          Join developers and privacy-conscious users who trust OpenFinance
          with their financial data. Self-hosted, open source, forever free.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            variant="secondary"
            className="gap-2"
            asChild
          >
            <Link href={isLoggedIn ? '/chat' : '/auth/sign-up'}>
              {isLoggedIn ? 'Go to App' : 'Get started for free'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            asChild
          >
            <a
              href="https://docs.openfinance.to"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the docs
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border px-6 py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <span className="font-heading font-semibold text-foreground">
          OpenFinance
        </span>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/yagudaev/openfinance"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href="https://docs.openfinance.to"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            Documentation
          </a>
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <span>&copy; 2026 OpenFinance. MIT License.</span>
        </div>
      </div>
    </footer>
  )
}
