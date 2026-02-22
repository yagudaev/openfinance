'use client'

import { useState, useEffect, useCallback } from 'react'

import type { ActiveJob } from '@/lib/jobs/job-types'

export function useActiveJobs(pollIntervalMs = 3000) {
  const [jobs, setJobs] = useState<ActiveJob[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActiveJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs/active')
      if (!res.ok) return
      const data = await res.json()
      setJobs(data.jobs ?? [])
    } catch {
      // Silently ignore fetch errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActiveJobs()

    const interval = setInterval(fetchActiveJobs, pollIntervalMs)
    return () => clearInterval(interval)
  }, [fetchActiveJobs, pollIntervalMs])

  return { jobs, loading, refetch: fetchActiveJobs }
}
