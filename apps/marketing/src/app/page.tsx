import { Github, Terminal, Shield, Cpu } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Nav */}
      <nav className="border-b border-[var(--muted)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="font-heading font-bold text-xl text-[var(--foreground)]">
            OpenFinance
          </div>
          <div className="flex gap-4 items-center">
            <a href="https://github.com/yagudaev/openfinance" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-lg font-medium text-sm">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[var(--muted)] text-[var(--muted-foreground)] px-3 py-1 rounded-full text-sm mb-6">
          <Terminal className="w-4 h-4" />
          <span>Self-hosted • Open Source • Privacy-first</span>
        </div>
        
        <h1 className="font-heading text-5xl md:text-6xl font-bold text-[var(--foreground)] mb-6 leading-tight">
          Engineering your<br />
          <span className="text-[var(--primary)]">financial future</span>
        </h1>
        
        <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-10">
          Personal finance software that respects your privacy. Track expenses, 
          manage accounts, and get AI-powered insights — all on your own server.
        </p>

        <div className="flex gap-4 justify-center">
          <a href="#" className="bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Deploy Now
          </a>
          <a href="https://github.com/yagudaev/openfinance" className="border border-[var(--muted-foreground)] text-[var(--foreground)] px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2">
            <Github className="w-5 h-5" />
            View Source
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl bg-[var(--muted)]">
            <Shield className="w-10 h-10 text-[var(--primary)] mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">Own Your Data</h3>
            <p className="text-[var(--muted-foreground)]">
              Your financial data stays on your server. No third-party access, no data mining.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[var(--muted)]">
            <Terminal className="w-10 h-10 text-[var(--primary)] mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">One-Command Deploy</h3>
            <p className="text-[var(--muted-foreground)]">
              SQLite database, single Docker container. Deploy to any VPS in minutes.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-[var(--muted)]">
            <Cpu className="w-10 h-10 text-[var(--primary)] mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">AI-Powered</h3>
            <p className="text-[var(--muted-foreground)]">
              Built-in financial advisor agent that understands your spending patterns.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--muted)] mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-[var(--muted-foreground)] text-sm">
          <p>OpenFinance is open source software. MIT License.</p>
        </div>
      </footer>
    </div>
  )
}
