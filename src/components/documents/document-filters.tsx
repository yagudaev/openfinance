'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DOCUMENT_CATEGORIES } from './document-types'

interface DocumentFiltersProps {
  search: string
  category: string
}

export function DocumentFilters({ search, category }: DocumentFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(search)

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/documents?${params.toString()}`)
  }, [router, searchParams])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateParam('search', searchValue)
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            className="pl-10"
          />
        </form>

        <div className="flex flex-wrap gap-1">
          <Button
            variant={!category ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateParam('category', '')}
          >
            All
          </Button>
          {DOCUMENT_CATEGORIES.map(cat => (
            <Button
              key={cat.value}
              variant={category === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateParam('category', cat.value === category ? '' : cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
