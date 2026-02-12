import type { Metadata } from 'next'
import { Space_Grotesk, IBM_Plex_Sans } from 'next/font/google'
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

export const metadata: Metadata = {
  title: 'OpenFinance - Self-hosted Personal Finance',
  description: 'Own your financial data. Self-hosted bookkeeping with AI-powered insights.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={\`\${spaceGrotesk.variable} \${ibmPlexSans.variable} font-body antialiased\`}>
        {children}
      </body>
    </html>
  )
}
