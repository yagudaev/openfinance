import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="text-center">
        <p className="font-heading text-8xl font-bold text-primary sm:text-9xl">
          404
        </p>
        <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          The page you are looking for does not exist or has been moved.
          Head back to the dashboard to continue managing your finances.
        </p>
        <div className="mt-8">
          <Button size="lg" asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
