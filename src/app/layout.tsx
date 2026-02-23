import type { Metadata } from 'next'
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

const description =
  'Self-hosted bookkeeping app with AI-powered transaction extraction. Track expenses, manage budgets, and own your financial data.'

export const metadata: Metadata = {
  title: 'OpenFinance',
  description,
  metadataBase: new URL('https://openfinance.to'),
  openGraph: {
    title: 'OpenFinance',
    description,
    url: 'https://openfinance.to',
    siteName: 'OpenFinance',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenFinance',
    description,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  )
}
