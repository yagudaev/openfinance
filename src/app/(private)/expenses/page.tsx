'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'

import { PeriodSelector } from '@/components/expenses/period-selector'
import { ExpenseBreadcrumb } from '@/components/expenses/expense-breadcrumb'
import { ExpenseOverview } from '@/components/expenses/expense-overview'
import { CategoryDrilldown } from '@/components/expenses/category-drilldown'
import { TransactionDetailPanel } from '@/components/expenses/transaction-detail-panel'
import type {
  PeriodKey,
  ExpenseOverviewData,
  CategoryDetailData,
  TransactionDetail,
} from '@/lib/types/expenses'

export default function ExpensesPage() {
  const [period, setPeriod] = useState<PeriodKey>('this-month')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionDetail | null>(null)
  const [overviewData, setOverviewData] = useState<ExpenseOverviewData | null>(
    null,
  )
  const [categoryData, setCategoryData] = useState<CategoryDetailData | null>(
    null,
  )
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(
    async (category?: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ period })
        if (category) {
          params.set('category', category)
        }
        const res = await fetch(`/api/expenses/breakdown?${params.toString()}`)
        if (!res.ok) return

        const data = await res.json()
        if (data.type === 'overview') {
          setOverviewData(data)
          setCategoryData(null)
        } else if (data.type === 'category-detail') {
          setCategoryData(data)
        }
      } finally {
        setLoading(false)
      }
    },
    [period],
  )

  useEffect(() => {
    if (selectedCategory) {
      fetchData(selectedCategory)
    } else {
      fetchData()
    }
  }, [period, selectedCategory, fetchData])

  function handleCategoryClick(category: string) {
    setSelectedCategory(category)
    setSelectedTransaction(null)
  }

  function handleNavigateToOverview() {
    setSelectedCategory(null)
    setSelectedTransaction(null)
  }

  function handleNavigateToCategory() {
    setSelectedTransaction(null)
  }

  function handleTransactionClick(transaction: TransactionDetail) {
    setSelectedTransaction(transaction)
  }

  function handleTransactionClose() {
    setSelectedTransaction(null)
  }

  function handleCategoryChange(_transactionId: string, _newCategory: string) {
    // Refetch to reflect the change
    if (selectedCategory) {
      fetchData(selectedCategory)
    } else {
      fetchData()
    }
  }

  function handlePeriodChange(newPeriod: PeriodKey) {
    setPeriod(newPeriod)
    setSelectedCategory(null)
    setSelectedTransaction(null)
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">
            Expenses
          </h1>
          <div className="mt-2">
            <ExpenseBreadcrumb
              category={selectedCategory ?? undefined}
              merchant={selectedTransaction?.description}
              onNavigateToOverview={handleNavigateToOverview}
              onNavigateToCategory={handleNavigateToCategory}
            />
          </div>
        </div>
        <PeriodSelector value={period} onChange={handlePeriodChange} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : selectedCategory && categoryData ? (
        <CategoryDrilldown
          category={categoryData.category}
          total={categoryData.total}
          prevTotal={categoryData.prevTotal}
          transactionCount={categoryData.transactionCount}
          merchants={categoryData.merchants}
          onTransactionClick={handleTransactionClick}
        />
      ) : overviewData ? (
        <ExpenseOverview
          categories={overviewData.categories}
          totalSpending={overviewData.totalSpending}
          prevTotalSpending={overviewData.prevTotalSpending}
          onCategoryClick={handleCategoryClick}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16">
          <p className="font-medium text-gray-900">No data available</p>
          <p className="mt-1 text-sm text-gray-500">
            Upload bank statements to see your expense breakdown.
          </p>
        </div>
      )}

      {/* Transaction detail slide-over */}
      {selectedTransaction && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={handleTransactionClose}
          />
          <TransactionDetailPanel
            transaction={selectedTransaction}
            onClose={handleTransactionClose}
            onCategoryChange={handleCategoryChange}
          />
        </>
      )}
    </div>
  )
}
