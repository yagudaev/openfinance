'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  name: string | null | undefined
  image: string | null | undefined
  className?: string
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function UserAvatar({ name, image, className }: UserAvatarProps) {
  return (
    <Avatar className={cn('h-8 w-8', className)}>
      {image && <AvatarImage src={image} alt={name || 'User'} />}
      <AvatarFallback className="bg-gray-200 text-xs font-medium text-gray-600">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
