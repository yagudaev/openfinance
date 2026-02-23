'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  Trash2,
  Eye,
  X,
  RefreshCw,
  GitCompareArrows,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'

import { formatCurrency } from '@/lib/services/net-worth-types'
import { SCENARIO_TYPE_LABELS } from '@/lib/services/scenario-types'
import type { ScenarioData, ScenarioType } from '@/lib/services/scenario-types'
import { Button } from '@/components/ui/button'
import { ScenarioChart } from '@/components/scenarios/scenario-chart'

export function ScenariosDashboard() {
  const [scenarios, setScenarios] = useState<ScenarioData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const [compareMode, setCompareMode] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchScenarios = useCallback(async () => {
    try {
      const res = await fetch('/api/scenarios')
      if (res.ok) {
        const data = await res.json()
        setScenarios(data.scenarios)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchScenarios()
  }, [fetchScenarios])

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/scenarios/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setScenarios(prev => prev.filter(s => s.id !== id))
        if (selectedId === id) setSelectedId(null)
        setCompareIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null)
    }
  }

  function toggleCompare(id: string) {
    setCompareIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 3) {
        next.add(id)
      }
      return next
    })
  }

  const selectedScenario = scenarios.find(s => s.id === selectedId)
  const comparedScenarios = scenarios.filter(s => compareIds.has(s.id))

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2">
        {scenarios.length >= 2 && (
          <Button
            variant={compareMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setCompareMode(!compareMode)
              if (compareMode) setCompareIds(new Set())
              setSelectedId(null)
            }}
          >
            <GitCompareArrows className="h-4 w-4 mr-1" />
            {compareMode ? 'Exit Compare' : 'Compare'}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchScenarios()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button size="sm" asChild>
          <Link href="/chat">
            <MessageSquare className="h-4 w-4 mr-1" />
            New Scenario
          </Link>
        </Button>
      </div>

      {scenarios.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Compare chart */}
          {compareMode && comparedScenarios.length >= 2 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Comparing {comparedScenarios.length} Scenarios
                </h2>
                <button
                  type="button"
                  onClick={() => setCompareIds(new Set())}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear selection
                </button>
              </div>
              <ScenarioChart
                scenarios={comparedScenarios.map(s => ({
                  title: s.title,
                  projections: s.projections,
                }))}
              />
            </div>
          )}

          {compareMode && comparedScenarios.length < 2 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              Select 2-3 scenarios below to compare their projected net worth trajectories.
            </div>
          )}

          {/* Selected scenario detail */}
          {!compareMode && selectedScenario && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">{selectedScenario.title}</h2>
                  <p className="text-sm text-gray-500">
                    {SCENARIO_TYPE_LABELS[selectedScenario.type]}
                    {selectedScenario.description && ` — ${selectedScenario.description}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ScenarioChart
                scenarios={[{
                  title: selectedScenario.title,
                  projections: selectedScenario.projections,
                }]}
              />
              <ProjectionSummary scenario={selectedScenario} />
            </div>
          )}

          {/* Scenario list */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Saved Scenarios ({scenarios.length})
            </h2>
            <div className="divide-y divide-gray-100">
              {scenarios.map(scenario => {
                const first = scenario.projections[0]
                const last = scenario.projections[scenario.projections.length - 1]
                const isSelected = compareMode
                  ? compareIds.has(scenario.id)
                  : selectedId === scenario.id

                return (
                  <div
                    key={scenario.id}
                    className={`flex items-center justify-between py-3 px-2 rounded-md transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <button
                      type="button"
                      className="flex-1 text-left"
                      onClick={() => {
                        if (compareMode) {
                          toggleCompare(scenario.id)
                        } else {
                          setSelectedId(selectedId === scenario.id ? null : scenario.id)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-blue-50">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{scenario.title}</p>
                          <p className="text-xs text-gray-500">
                            {SCENARIO_TYPE_LABELS[scenario.type]}
                            {' \u00B7 '}
                            {last ? `${last.month} months` : 'N/A'}
                            {' \u00B7 '}
                            {first && last
                              ? `${formatCurrency(first.netWorth)} \u2192 ${formatCurrency(last.netWorth)}`
                              : 'No data'}
                          </p>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 ml-2">
                      {!compareMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedId(
                            selectedId === scenario.id ? null : scenario.id,
                          )}
                          className="h-8 w-8 p-0"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(scenario.id)}
                        disabled={deleting === scenario.id}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                        title="Delete scenario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ProjectionSummary({ scenario }: { scenario: ScenarioData }) {
  const first = scenario.projections[0]
  const last = scenario.projections[scenario.projections.length - 1]
  if (!first || !last) return null

  const change = last.netWorth - first.netWorth
  const isPositive = change >= 0

  return (
    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <p className="text-xs text-gray-500">Starting Net Worth</p>
        <p className="text-sm font-semibold text-gray-900">{formatCurrency(first.netWorth)}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Ending Net Worth</p>
        <p className="text-sm font-semibold text-gray-900">{formatCurrency(last.netWorth)}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Change</p>
        <p className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{formatCurrency(change)}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Timeline</p>
        <p className="text-sm font-semibold text-gray-900">
          {last.month} months ({Math.round(last.month / 12 * 10) / 10} years)
        </p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
        <TrendingUp className="h-6 w-6 text-blue-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No scenarios yet</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Ask the AI chat to run what-if scenarios. Try questions like
        &quot;What if I pay off my credit card first vs my car loan?&quot; or
        &quot;What if I save $500 more per month?&quot;
      </p>
      <Button asChild>
        <Link href="/chat">
          <MessageSquare className="h-4 w-4 mr-2" />
          Start a Scenario in Chat
        </Link>
      </Button>
    </div>
  )
}
