'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Calendar, ChevronDown } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DATE_RANGE_PRESETS,
  type DateRangePreset,
} from '@/lib/types/time-period'

interface TimePeriodSelectorProps {
  value: DateRangePreset
  customFrom?: string
  customTo?: string
}

export function TimePeriodSelector({
  value,
  customFrom,
  customTo,
}: TimePeriodSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [startDateInput, setStartDateInput] = useState(customFrom ?? '')
  const [endDateInput, setEndDateInput] = useState(customTo ?? '')
  const [open, setOpen] = useState(false)

  const today = new Date()
  const currentYear = today.getFullYear()
  const calendarYears = [currentYear, currentYear - 1, currentYear - 2]

  useEffect(() => {
    setStartDateInput(customFrom ?? '')
  }, [customFrom])

  useEffect(() => {
    setEndDateInput(customTo ?? '')
  }, [customTo])

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, val] of Object.entries(updates)) {
        if (val) {
          params.set(key, val)
        } else {
          params.delete(key)
        }
      }
      const queryString = params.toString()
      router.push(queryString ? `${pathname}?${queryString}` : pathname)
    },
    [router, pathname, searchParams],
  )

  function handlePresetChange(preset: DateRangePreset) {
    if (preset === 'all-time') {
      updateParams({ period: '', dateFrom: '', dateTo: '' })
    } else {
      updateParams({ period: preset, dateFrom: '', dateTo: '' })
    }
    setOpen(false)
  }

  function handleCalendarYearSelect(year: number) {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    updateParams({ period: 'custom', dateFrom: startDate, dateTo: endDate })
    setOpen(false)
  }

  function handleQuarterSelect(year: number, quarter: 1 | 2 | 3 | 4) {
    const quarterStartMonth = (quarter - 1) * 3
    const startDate = new Date(year, quarterStartMonth, 1)
    const endDate = new Date(year, quarterStartMonth + 3, 0)
    updateParams({
      period: 'custom',
      dateFrom: format(startDate, 'yyyy-MM-dd'),
      dateTo: format(endDate, 'yyyy-MM-dd'),
    })
    setOpen(false)
  }

  function isCalendarYearSelected(year: number): boolean {
    if (value !== 'custom' || !customFrom || !customTo) return false
    return customFrom === `${year}-01-01` && customTo === `${year}-12-31`
  }

  function isQuarterSelected(year: number, quarter: 1 | 2 | 3 | 4): boolean {
    if (value !== 'custom' || !customFrom || !customTo) return false
    const quarterStartMonth = (quarter - 1) * 3
    const expectedStart = new Date(year, quarterStartMonth, 1)
    const expectedEnd = new Date(year, quarterStartMonth + 3, 0)
    return (
      customFrom === format(expectedStart, 'yyyy-MM-dd') &&
      customTo === format(expectedEnd, 'yyyy-MM-dd')
    )
  }

  function hasQuarterStarted(year: number, quarter: 1 | 2 | 3 | 4): boolean {
    const quarterStartMonth = (quarter - 1) * 3
    const quarterStart = new Date(year, quarterStartMonth, 1)
    return today >= quarterStart
  }

  const handleStartDateInputChange = useCallback(
    (val: string) => {
      setStartDateInput(val)
      const parsed = parse(val, 'yyyy-MM-dd', new Date())
      if (isValid(parsed)) {
        updateParams({ period: 'custom', dateFrom: val, dateTo: endDateInput })
      }
    },
    [updateParams, endDateInput],
  )

  const handleEndDateInputChange = useCallback(
    (val: string) => {
      setEndDateInput(val)
      const parsed = parse(val, 'yyyy-MM-dd', new Date())
      if (isValid(parsed)) {
        updateParams({
          period: 'custom',
          dateFrom: startDateInput,
          dateTo: val,
        })
      }
    },
    [updateParams, startDateInput],
  )

  function handleStartDateBlur() {
    if (
      startDateInput &&
      !isValid(parse(startDateInput, 'yyyy-MM-dd', new Date()))
    ) {
      setStartDateInput(customFrom ?? '')
    }
  }

  function handleEndDateBlur() {
    if (
      endDateInput &&
      !isValid(parse(endDateInput, 'yyyy-MM-dd', new Date()))
    ) {
      setEndDateInput(customTo ?? '')
    }
  }

  const label = getLabel(value, customFrom, customTo)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
        >
          <Calendar className="h-4 w-4 mr-2" />
          {label}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 max-h-[80vh] overflow-y-auto"
        align="end"
      >
        <div className="flex flex-col">
          {/* Preset buttons */}
          <div className="p-2 space-y-1">
            {DATE_RANGE_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant={value === preset.value ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start text-sm',
                  value === preset.value &&
                    'bg-gray-900 text-white hover:bg-gray-800',
                )}
                onClick={() => handlePresetChange(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Calendar Years */}
          <div className="p-2 space-y-1 border-t">
            <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Calendar Years
            </div>
            <div className="grid grid-cols-3 gap-1">
              {calendarYears.map((year) => (
                <Button
                  key={`cy-${year}`}
                  variant={
                    isCalendarYearSelected(year) ? 'default' : 'ghost'
                  }
                  size="sm"
                  className={cn(
                    'text-sm',
                    isCalendarYearSelected(year) &&
                      'bg-gray-900 text-white hover:bg-gray-800',
                  )}
                  onClick={() => handleCalendarYearSelect(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>

          {/* Quarters */}
          <div className="p-2 space-y-2 border-t">
            <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quarters
            </div>
            {calendarYears.slice(0, 2).map((year) => (
              <div key={`quarters-${year}`}>
                <div className="px-2 text-xs text-gray-400 mb-1">{year}</div>
                <div className="grid grid-cols-4 gap-1">
                  {([1, 2, 3, 4] as const).map((q) => {
                    const quarterStarted = hasQuarterStarted(year, q)
                    const selected = isQuarterSelected(year, q)
                    return (
                      <Button
                        key={`q${q}-${year}`}
                        variant={selected ? 'default' : 'ghost'}
                        size="sm"
                        disabled={!quarterStarted}
                        className={cn(
                          'text-xs',
                          selected &&
                            'bg-gray-900 text-white hover:bg-gray-800',
                          !quarterStarted && 'opacity-40 cursor-not-allowed',
                        )}
                        onClick={() =>
                          quarterStarted && handleQuarterSelect(year, q)
                        }
                      >
                        Q{q}
                      </Button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Custom date range */}
          <div className="p-3 border-t">
            <div className="px-0 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Custom Range
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Start
                </label>
                <Input
                  type="date"
                  value={startDateInput}
                  onChange={(e) => handleStartDateInputChange(e.target.value)}
                  onBlur={handleStartDateBlur}
                  className="text-sm h-8"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  End
                </label>
                <Input
                  type="date"
                  value={endDateInput}
                  onChange={(e) => handleEndDateInputChange(e.target.value)}
                  onBlur={handleEndDateBlur}
                  className="text-sm h-8"
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function getLabel(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string,
): string {
  if (preset === 'custom' && customFrom && customTo) {
    const from = new Date(customFrom + 'T00:00:00')
    const to = new Date(customTo + 'T00:00:00')
    return `${format(from, 'MMM d, yyyy')} - ${format(to, 'MMM d, yyyy')}`
  }
  if (preset === 'custom' && customFrom) {
    const from = new Date(customFrom + 'T00:00:00')
    return `From ${format(from, 'MMM d, yyyy')}`
  }
  if (preset === 'custom' && customTo) {
    const to = new Date(customTo + 'T00:00:00')
    return `Until ${format(to, 'MMM d, yyyy')}`
  }

  const match = DATE_RANGE_PRESETS.find((p) => p.value === preset)
  return match?.label ?? 'All time'
}
