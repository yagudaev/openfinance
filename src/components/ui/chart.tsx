'use client'

import * as React from 'react'
import { ResponsiveContainer } from 'recharts'

import { cn } from '@/lib/utils'
import { useMounted } from '@/hooks/use-mounted'

export type ChartConfig = Record<
  string,
  {
    label?: string
    color?: string
    icon?: React.ComponentType
  }
>

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, children, ...props }, ref) => {
    const mounted = useMounted()

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
          </div>
        )}
      </div>
    )
  },
)
ChartContainer.displayName = 'ChartContainer'

export { ChartContainer }
