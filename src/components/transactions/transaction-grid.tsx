'use client'

import { useCallback, useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  AllCommunityModule,
  type ColDef,
  type CellValueChangedEvent,
  type ValueFormatterParams,
  type CellClassParams,
  themeQuartz,
} from 'ag-grid-community'

// Register all community modules
import { ModuleRegistry as MR } from 'ag-grid-community'
MR.registerModules([AllCommunityModule])

const CATEGORY_OPTIONS = [
  '',
  'expense',
  'income',
  'owner-pay',
  'internal-transfer',
  'shareholder-loan',
]

interface TransactionRow {
  id: string
  date: string
  description: string
  amount: number
  balance: number | null
  category: string | null
  transactionType: string
}

interface TransactionGridProps {
  transactions: TransactionRow[]
  onTransactionUpdated?: (transaction: TransactionRow) => void
}

export function TransactionGrid({ transactions, onTransactionUpdated }: TransactionGridProps) {
  const [rowData, setRowData] = useState<TransactionRow[]>(transactions)
  const [saving, setSaving] = useState<string | null>(null)

  const theme = useMemo(() => {
    return themeQuartz.withParams({
      fontSize: 13,
      headerFontSize: 12,
      rowHeight: 36,
      headerHeight: 40,
    })
  }, [])

  const formatCurrency = useCallback((params: ValueFormatterParams) => {
    if (params.value == null) return ''
    const val = Number(params.value)
    const prefix = val >= 0 ? '+' : '-'
    return `${prefix}$${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }, [])

  const formatBalance = useCallback((params: ValueFormatterParams) => {
    if (params.value == null) return '\u2014'
    const val = Number(params.value)
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }, [])

  const formatDate = useCallback((params: ValueFormatterParams) => {
    if (!params.value) return ''
    const datePart = String(params.value).split('T')[0]
    const parts = datePart.split('-')
    if (parts.length !== 3) return params.value

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)
    return `${months[month]} ${String(day).padStart(2, '0')}`
  }, [])

  const formatCategory = useCallback((params: ValueFormatterParams) => {
    if (!params.value) return '\u2014'
    return String(params.value).replace(/-/g, ' ')
  }, [])

  const columnDefs = useMemo<ColDef<TransactionRow>[]>(() => [
    {
      headerName: 'Date',
      field: 'date',
      sort: 'asc' as const,
      width: 90,
      valueFormatter: formatDate,
      editable: false,
    },
    {
      headerName: 'Description',
      field: 'description',
      flex: 2,
      minWidth: 180,
      editable: true,
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 120,
      editable: true,
      valueFormatter: formatCurrency,
      cellClass: (params: CellClassParams<TransactionRow>) => {
        if (params.value == null) return ''
        return Number(params.value) >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
      },
    },
    {
      headerName: 'Balance',
      field: 'balance',
      width: 120,
      editable: false,
      valueFormatter: formatBalance,
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 140,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: CATEGORY_OPTIONS,
      },
      valueFormatter: formatCategory,
    },
    {
      headerName: 'Type',
      field: 'transactionType',
      width: 90,
      editable: false,
      valueFormatter: (params: ValueFormatterParams) => {
        if (!params.value) return ''
        return String(params.value).charAt(0).toUpperCase() + String(params.value).slice(1)
      },
    },
  ], [formatDate, formatCurrency, formatBalance, formatCategory])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
  }), [])

  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent<TransactionRow>) => {
    const { data, colDef } = event
    if (!data || !colDef.field) return

    const field = colDef.field as keyof TransactionRow
    const newValue = event.newValue

    // Build update payload
    const update: Record<string, unknown> = {}
    if (field === 'description') {
      update.description = newValue
    } else if (field === 'amount') {
      update.amount = Number(newValue)
    } else if (field === 'category') {
      update.category = newValue === '' ? null : newValue
    }

    if (Object.keys(update).length === 0) return

    setSaving(data.id)
    try {
      const res = await fetch(`/api/transactions/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })

      if (!res.ok) {
        // Revert on error
        const rowNode = event.api.getRowNode(data.id)
        if (rowNode) {
          rowNode.setDataValue(field, event.oldValue)
        }
        console.error('Failed to save transaction')
        return
      }

      const result = await res.json()
      if (onTransactionUpdated && result.transaction) {
        onTransactionUpdated({
          ...data,
          ...result.transaction,
          date: data.date,
        })
      }
    } catch (err) {
      // Revert on error
      const rowNode = event.api.getRowNode(data.id)
      if (rowNode) {
        rowNode.setDataValue(field, event.oldValue)
      }
      console.error('Failed to save transaction:', err)
    } finally {
      setSaving(null)
    }
  }, [onTransactionUpdated])

  const getRowId = useCallback((params: { data: TransactionRow }) => params.data.id, [])

  return (
    <div className="relative">
      {saving && (
        <div className="absolute right-2 top-2 z-10 rounded bg-blue-50 px-2 py-1 text-xs text-blue-600">
          Saving...
        </div>
      )}
      <div style={{ height: 600, width: '100%' }}>
        <AgGridReact<TransactionRow>
          theme={theme}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={getRowId}
          onCellValueChanged={onCellValueChanged}
          singleClickEdit={true}
          stopEditingWhenCellsLoseFocus={true}
          animateRows={true}
        />
      </div>
    </div>
  )
}
