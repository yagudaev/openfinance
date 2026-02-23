'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      closeButton
      style={
        {
          '--normal-bg': 'white',
          '--normal-text': '#1f2937',
          '--normal-border': '#e5e7eb',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
