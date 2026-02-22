import Link from 'next/link'
import type { Metadata } from 'next'

import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — OpenFinance',
  description:
    'Privacy policy for OpenFinance, the self-hosted personal finance and bookkeeping app.',
}

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 text-muted-foreground">
            Last updated: February 2026
          </p>
        </header>

        <div className="prose-section space-y-10 text-base leading-relaxed text-foreground/90">
          <Section title="1. Introduction">
            <p>
              OpenFinance (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is
              an open-source, self-hosted personal finance and bookkeeping
              application. This Privacy Policy explains how we collect, use,
              store, and protect your information when you use the OpenFinance
              application at{' '}
              <a
                href="https://openfinance.to"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                openfinance.to
              </a>{' '}
              or any self-hosted instance of the software.
            </p>
            <p>
              Because OpenFinance is designed to be self-hosted, the data
              handling described in this policy applies to the hosted instance at
              openfinance.to. If you self-host OpenFinance on your own
              infrastructure, your data remains entirely under your control and
              never leaves your server unless you configure it to do so.
            </p>
          </Section>

          <Section title="2. Data We Collect">
            <h4 className="font-heading text-base font-semibold">
              Account Information
            </h4>
            <p>
              When you create an account, we collect your email address and name.
              If you sign in with Google OAuth, we receive your name, email
              address, and profile picture from Google. We do not receive or
              store your Google password.
            </p>

            <h4 className="mt-6 font-heading text-base font-semibold">
              Financial Documents
            </h4>
            <p>
              You may upload financial documents such as bank statement PDFs, CSV
              files, and spreadsheets. These files are processed to extract
              transaction data and are stored on the server where OpenFinance is
              hosted.
            </p>

            <h4 className="mt-6 font-heading text-base font-semibold">
              Transaction Data
            </h4>
            <p>
              We store transaction details extracted from your uploaded documents
              or connected bank accounts, including dates, amounts, descriptions,
              and categories.
            </p>

            <h4 className="mt-6 font-heading text-base font-semibold">
              Bank Account Connections (Plaid)
            </h4>
            <p>
              If you connect a bank account through Plaid, we receive account
              metadata (institution name, account name, account type) and
              transaction history. We do not receive or store your bank login
              credentials. Plaid acts as a secure intermediary between your bank
              and OpenFinance. For more information, see{' '}
              <a
                href="https://plaid.com/legal/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Plaid&apos;s Privacy Policy
              </a>
              .
            </p>

            <h4 className="mt-6 font-heading text-base font-semibold">
              Usage Data
            </h4>
            <p>
              We collect basic session information required for authentication
              and application functionality, such as login timestamps and session
              tokens.
            </p>
          </Section>

          <Section title="3. How We Use Your Data">
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Transaction extraction:</strong> Uploaded documents are
                processed using AI (OpenAI) to extract and categorize
                transactions automatically.
              </li>
              <li>
                <strong>Financial insights:</strong> Your transaction data is
                analyzed to provide dashboards, charts, spending breakdowns, and
                AI-powered financial insights.
              </li>
              <li>
                <strong>AI chat:</strong> When you interact with the AI chat
                feature, your messages and relevant financial context may be sent
                to OpenAI for processing. We do not use your data to train AI
                models.
              </li>
              <li>
                <strong>Authentication:</strong> Account information is used to
                manage your login sessions and secure your data.
              </li>
              <li>
                <strong>Application improvement:</strong> We may use anonymized,
                aggregated usage patterns to improve the application. We never
                sell or share individual financial data.
              </li>
            </ul>
          </Section>

          <Section title="4. Third-Party Services">
            <p>
              OpenFinance integrates with the following third-party services:
            </p>

            <h4 className="mt-4 font-heading text-base font-semibold">
              OpenAI
            </h4>
            <p>
              We use OpenAI&apos;s API to process uploaded financial documents
              and power the AI chat feature. Document contents and chat messages
              are sent to OpenAI for processing. OpenAI&apos;s data usage
              policies apply to this processing. Per OpenAI&apos;s API data
              usage policy, data sent through the API is not used to train their
              models. See{' '}
              <a
                href="https://openai.com/policies/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                OpenAI&apos;s Privacy Policy
              </a>
              .
            </p>

            <h4 className="mt-6 font-heading text-base font-semibold">
              Plaid
            </h4>
            <p>
              If you choose to connect a bank account, Plaid facilitates the
              secure connection between your financial institution and
              OpenFinance. Plaid receives your bank credentials directly and
              provides OpenFinance with account and transaction data only. See{' '}
              <a
                href="https://plaid.com/legal/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Plaid&apos;s Privacy Policy
              </a>
              .
            </p>

            <h4 className="mt-6 font-heading text-base font-semibold">
              Google OAuth
            </h4>
            <p>
              If you choose to sign in with Google, Google provides us with your
              basic profile information (name, email, profile picture) for
              authentication purposes. We do not access any other Google services
              or data on your behalf. See{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Google&apos;s Privacy Policy
              </a>
              .
            </p>
          </Section>

          <Section title="5. Data Storage and Security">
            <p>
              OpenFinance uses a SQLite database to store all application data.
              On the hosted instance at openfinance.to, your data is stored on
              our server infrastructure.
            </p>
            <p>
              For self-hosted instances, all data remains on your own
              infrastructure. We have no access to data on self-hosted
              installations.
            </p>
            <p>
              We implement security measures including encrypted connections
              (HTTPS), secure session management, and password hashing to protect
              your data. However, no method of electronic transmission or storage
              is completely secure, and we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="6. Data Retention and Deletion">
            <p>
              Your data is retained for as long as your account is active.
              Uploaded documents, extracted transactions, and all associated
              financial data are stored until you explicitly delete them or
              delete your account.
            </p>
            <p>
              When you delete your account, all of your data is permanently
              removed from the system, including:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Account information and profile data</li>
              <li>Uploaded financial documents</li>
              <li>Extracted transaction records</li>
              <li>Connected bank account data</li>
              <li>Chat history and AI interactions</li>
            </ul>
            <p>
              For self-hosted instances, data retention is entirely under your
              control. You can delete the database at any time to remove all
              data.
            </p>
          </Section>

          <Section title="7. Your Rights">
            <p>
              You have the following rights regarding your personal data:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Access:</strong> You can view all your data within the
                application at any time. Your financial data is always accessible
                through the dashboard and transaction views.
              </li>
              <li>
                <strong>Deletion:</strong> You can delete individual
                transactions, uploaded documents, or your entire account. Account
                deletion removes all associated data permanently.
              </li>
              <li>
                <strong>Portability:</strong> You can export your transaction
                data at any time. For self-hosted instances, you have direct
                access to the database.
              </li>
              <li>
                <strong>Correction:</strong> You can edit and correct your
                transaction data and account information at any time through the
                application.
              </li>
              <li>
                <strong>Withdraw consent:</strong> You can disconnect linked bank
                accounts or stop using AI features at any time without affecting
                your core account functionality.
              </li>
            </ul>
          </Section>

          <Section title="8. Cookies and Sessions">
            <p>
              OpenFinance uses cookies strictly for authentication and session
              management. We do not use tracking cookies, advertising cookies, or
              any third-party analytics cookies.
            </p>
            <p>The cookies we use include:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Session cookie:</strong> Maintains your logged-in state.
                This cookie is essential for the application to function and
                expires when your session ends or after a period of inactivity.
              </li>
            </ul>
          </Section>

          <Section title="9. Self-Hosted Instances">
            <p>
              OpenFinance is designed as a self-hosted application. When you run
              OpenFinance on your own server:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                All data stays on your infrastructure and never reaches our
                servers.
              </li>
              <li>
                You are responsible for the security and backup of your data.
              </li>
              <li>
                Third-party API calls (OpenAI, Plaid) go directly from your
                server to those services, not through us.
              </li>
              <li>
                This privacy policy may not fully apply to self-hosted instances,
                as you control the data processing and storage.
              </li>
            </ul>
          </Section>

          <Section title="10. Children's Privacy">
            <p>
              OpenFinance is not intended for use by individuals under the age of
              18. We do not knowingly collect personal information from children.
              If you become aware that a child has provided us with personal
              data, please contact us and we will take steps to delete such
              information.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we make
              changes, we will update the &quot;Last updated&quot; date at the
              top of this page. We encourage you to review this policy
              periodically to stay informed about how we protect your data.
            </p>
          </Section>

          <Section title="12. Contact Us">
            <p>
              If you have questions or concerns about this Privacy Policy or our
              data practices, please contact us at:
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
