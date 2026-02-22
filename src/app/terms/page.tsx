import Link from 'next/link'
import type { Metadata } from 'next'

import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service — OpenFinance',
  description:
    'Terms of service for OpenFinance, the self-hosted personal finance and bookkeeping app.',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50">
        <div className="mx-auto flex max-w-4xl items-center px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <header className="mb-12">
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-muted-foreground">
            Last updated: February 2026
          </p>
        </header>

        <div className="prose-section space-y-10 text-base leading-relaxed text-foreground/90">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using OpenFinance (&quot;the Service&quot;), you
              agree to be bound by these Terms of Service (&quot;Terms&quot;).
              If you do not agree to these Terms, you may not use the Service.
            </p>
            <p>
              By creating an account, you confirm that you are at least 18 years
              old and have the legal capacity to enter into these Terms.
            </p>
          </Section>

          <Section title="2. Description of the Service">
            <p>
              OpenFinance is an open-source, self-hosted personal finance and
              bookkeeping application. The Service allows you to:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Upload and process financial documents such as bank statements
                using AI-powered extraction
              </li>
              <li>
                Track transactions, expenses, and income across multiple
                accounts
              </li>
              <li>
                Connect bank accounts through Plaid for automatic transaction
                syncing
              </li>
              <li>
                Receive AI-powered financial insights and interact with an AI
                chat assistant
              </li>
              <li>
                View dashboards, charts, and reports about your financial data
              </li>
            </ul>
          </Section>

          <Section title="3. User Accounts">
            <p>
              To use the Service, you must create an account by providing
              accurate and complete information. You are responsible for:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Maintaining the confidentiality of your account credentials
              </li>
              <li>All activity that occurs under your account</li>
              <li>
                Notifying us immediately of any unauthorized access to your
                account
              </li>
              <li>
                Ensuring that your account information remains accurate and
                up-to-date
              </li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate
              these Terms.
            </p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                Violate any applicable laws, regulations, or third-party rights
              </li>
              <li>
                Upload malicious files, viruses, or any content intended to
                disrupt or damage the Service
              </li>
              <li>
                Attempt to gain unauthorized access to the Service or its
                underlying infrastructure
              </li>
              <li>
                Use the Service for money laundering, fraud, or any other
                illegal financial activity
              </li>
              <li>
                Reverse-engineer, decompile, or attempt to extract the source
                code of any proprietary components (note: the open-source
                codebase itself is freely available under the MIT License)
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the
                Service for other users
              </li>
            </ul>
          </Section>

          <Section title="5. Your Data">
            <p>
              You retain ownership of all data you upload or create within the
              Service, including financial documents, transaction records, and
              account information.
            </p>
            <p>
              By using the Service, you grant us a limited license to process
              your data solely for the purpose of providing the Service to you.
              This includes sending document contents and chat messages to
              third-party AI providers (such as OpenAI) for processing, and
              sending account credentials to Plaid for bank account
              connectivity.
            </p>
            <p>
              For details on how we collect, use, and protect your data, please
              refer to our{' '}
              <Link
                href="/privacy"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              OpenFinance is open-source software licensed under the{' '}
              <a
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                MIT License
              </a>
              . You are free to use, modify, and distribute the software in
              accordance with that license.
            </p>
            <p>
              The OpenFinance name, logo, and branding are trademarks of
              OpenFinance. The MIT License does not grant rights to use these
              trademarks.
            </p>
          </Section>

          <Section title="7. Disclaimers">
            <p>
              <strong>
                The Service is not a substitute for professional financial, tax,
                legal, or investment advice.
              </strong>{' '}
              OpenFinance is a bookkeeping and data organization tool. Any
              insights, categorizations, or analyses provided by the Service
              (including AI-generated content) are for informational purposes
              only.
            </p>
            <p>
              You should consult a qualified professional before making any
              financial, tax, or investment decisions. We do not guarantee the
              accuracy, completeness, or reliability of any AI-generated
              analysis or categorization.
            </p>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT.
            </p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, OPENFINANCE AND ITS
              CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
              PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH
              YOUR USE OF THE SERVICE.
            </p>
            <p>
              This includes, but is not limited to, damages arising from:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Errors or inaccuracies in transaction data extraction</li>
              <li>Incorrect AI-generated categorizations or insights</li>
              <li>Service interruptions, downtime, or data loss</li>
              <li>
                Unauthorized access to your account or data due to
                circumstances beyond our reasonable control
              </li>
              <li>
                Financial decisions made based on information provided by the
                Service
              </li>
            </ul>
          </Section>

          <Section title="9. Termination">
            <p>
              You may terminate your account at any time by deleting it through
              the Service. Upon termination, all of your data will be
              permanently deleted, including uploaded documents, transactions,
              and account information.
            </p>
            <p>
              We may suspend or terminate your access to the Service at any time
              if you violate these Terms, with or without notice. We will make
              reasonable efforts to notify you before termination except in
              cases of severe violations.
            </p>
            <p>
              For self-hosted instances, you maintain full control over your
              data and can terminate your use at any time by shutting down your
              server.
            </p>
          </Section>

          <Section title="10. Changes to These Terms">
            <p>
              We may update these Terms from time to time. When we make
              material changes, we will update the &quot;Last updated&quot;
              date at the top of this page and may notify you through the
              Service.
            </p>
            <p>
              Your continued use of the Service after changes are posted
              constitutes your acceptance of the revised Terms. If you do not
              agree to the new Terms, you should stop using the Service.
            </p>
          </Section>

          <Section title="11. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with
              applicable laws, without regard to conflict of law principles.
              Any disputes arising from these Terms or your use of the Service
              shall be resolved through good-faith negotiation before pursuing
              formal proceedings.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>
              If you have questions or concerns about these Terms of Service,
              please contact us at:
            </p>
            <p>
              <a
                href="mailto:support@openfinance.to"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                support@openfinance.to
              </a>
            </p>
            <p>
              For issues with the open-source software, you can also open an
              issue on our{' '}
              <a
                href="https://github.com/yagudaev/openfinance"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                GitHub repository
              </a>
              .
            </p>
          </Section>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <Link
            href="/"
            className="font-heading font-semibold text-foreground"
          >
            OpenFinance
          </Link>
          <span>&copy; 2026 OpenFinance. MIT License.</span>
        </div>
      </footer>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-4 font-heading text-2xl font-bold">{title}</h2>
      <div className="space-y-3 text-foreground/80">{children}</div>
    </section>
  )
}
