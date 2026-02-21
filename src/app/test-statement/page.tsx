'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Download, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

interface Transaction {
  id: string
  date: string
  description: string
  debit: string
  credit: string
}

interface MonthlyStatement {
  periodStart: string
  periodEnd: string
  openingBalance: number
  transactions: Transaction[]
}

interface AccountInfo {
  accountHolder: string
  accountNumber: string
  address: string
  city: string
  branchAddress: string
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

const transactionTemplates = {
  deposits: [
    { description: 'Deposit - Dunder Mifflin Paper Co', amount: 2500 },
    { description: 'Deposit - Salary', amount: 3200 },
    { description: 'Deposit - Freelance Work', amount: 750 },
    { description: 'Deposit - GNB Bonus', amount: 1500 },
    { description: 'Deposit - Tax Refund', amount: 890 },
    { description: 'Wire Transfer - Eriksen Consulting', amount: 1200 },
    { description: 'Deposit - Birthday Gift', amount: 200 },
    { description: 'Refund - Laser Tag Arena', amount: 85 },
  ],
  debits: [
    { description: "MacLaren's Pub - Tab Payment", min: 80, max: 180 },
    { description: 'Rent Payment - Apt 31', amount: 1850 },
    { description: 'Puzzles Bar & Grill', min: 60, max: 120 },
    { description: 'Metro Card Reload', amount: 127 },
    { description: 'The Slutty Pumpkin Costume Shop', min: 150, max: 300 },
    { description: 'ATM Withdrawal', min: 100, max: 300 },
    { description: 'Monthly Account Fee', amount: 12 },
    { description: 'Laser Tag - Team Building', min: 40, max: 80 },
    { description: "Barney's Suit Warehouse", min: 400, max: 800 },
    { description: 'Playbook Publishing Inc', min: 50, max: 150 },
    { description: 'Internet Bill - Spectrum', amount: 89 },
    { description: 'Electric Bill - ConEd', min: 60, max: 120 },
    { description: 'Streaming Services Bundle', amount: 45 },
    { description: 'Groceries - Whole Foods', min: 80, max: 200 },
    { description: 'Dry Cleaning - Executive Suits', min: 50, max: 100 },
    { description: 'Cab Fare - Yellow Taxi', min: 20, max: 60 },
    { description: 'Restaurant - Cafe Lalo', min: 40, max: 100 },
    { description: 'Phone Bill - Verizon', amount: 95 },
  ],
}

function generateMonthlyTransactions(year: number, month: number, seed: number): Transaction[] {
  let s = seed
  function random(min: number, max: number) {
    const x = Math.sin(s++) * 10000
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
  }

  const transactions: Transaction[] = []
  const daysInMonth = lastDayOfMonth(year, month)

  const numDeposits = random(2, 4)
  for (let i = 0; i < numDeposits; i++) {
    const template = transactionTemplates.deposits[random(0, transactionTemplates.deposits.length - 1)]
    const day = random(1, Math.min(15, daysInMonth))
    const amount = template.amount * (0.9 + (random(0, 20) / 100))
    transactions.push({
      id: generateId(),
      date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      description: template.description,
      debit: '',
      credit: amount.toFixed(2),
    })
  }

  const numDebits = random(6, 10)
  for (let i = 0; i < numDebits; i++) {
    const template = transactionTemplates.debits[random(0, transactionTemplates.debits.length - 1)]
    const day = random(1, daysInMonth)
    const amount = 'amount' in template && template.amount
      ? template.amount
      : random(template.min!, template.max!)
    transactions.push({
      id: generateId(),
      date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      description: template.description,
      debit: amount.toFixed(2),
      credit: '',
    })
  }

  transactions.push({
    id: generateId(),
    date: `${year}-${String(month + 1).padStart(2, '0')}-${String(Math.min(28, daysInMonth)).padStart(2, '0')}`,
    description: 'Monthly Account Fee',
    debit: '12.00',
    credit: '',
  })

  transactions.sort((a, b) => a.date.localeCompare(b.date))
  return transactions
}

function generateAllStatements(): MonthlyStatement[] {
  const statements: MonthlyStatement[] = []
  let runningBalance = 1543.27

  for (let i = 0; i < 12; i++) {
    const year = 2025
    const month = i
    const last = lastDayOfMonth(year, month)
    const periodStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const periodEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`

    const transactions = generateMonthlyTransactions(year, month, i * 100 + 42)
    const openingBalance = runningBalance
    const totalCredits = transactions.reduce((sum, tx) => sum + (parseFloat(tx.credit) || 0), 0)
    const totalDebits = transactions.reduce((sum, tx) => sum + (parseFloat(tx.debit) || 0), 0)
    runningBalance = openingBalance + totalCredits - totalDebits

    statements.push({ periodStart, periodEnd, openingBalance, transactions })
  }
  return statements
}

const initialStatements = generateAllStatements()

const defaultAccountInfo: AccountInfo = {
  accountHolder: 'Barney Stinson',
  accountNumber: '0016-8675309-001',
  address: 'Apartment 31, 254 W 75th Street',
  city: 'New York, NY 10023',
  branchAddress: '432 Park Avenue, New York, NY 10016',
}

export default function TestStatementPage() {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0)
  const [statements, setStatements] = useState<MonthlyStatement[]>(initialStatements)
  const [accountInfo, setAccountInfo] = useState<AccountInfo>(defaultAccountInfo)

  const currentStatement = statements[currentMonthIndex]

  useEffect(() => {
    const startDate = currentStatement.periodStart.replace(/-/g, '')
    const endDate = currentStatement.periodEnd.replace(/-/g, '')
    const accountNum = accountInfo.accountNumber.replace(/-/g, '')
    document.title = `008-Account-${accountNum}-${startDate}-${endDate}`
  }, [currentMonthIndex, currentStatement, accountInfo.accountNumber])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowLeft' && currentMonthIndex > 0) {
        setCurrentMonthIndex(prev => prev - 1)
      } else if (e.key === 'ArrowRight' && currentMonthIndex < statements.length - 1) {
        setCurrentMonthIndex(prev => prev + 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentMonthIndex, statements.length])

  function calculateRunningBalance(index: number): number {
    let balance = currentStatement.openingBalance
    for (let i = 0; i <= index; i++) {
      const tx = currentStatement.transactions[i]
      balance = balance + (parseFloat(tx.credit) || 0) - (parseFloat(tx.debit) || 0)
    }
    return balance
  }

  const closingBalance = currentStatement.transactions.length > 0
    ? calculateRunningBalance(currentStatement.transactions.length - 1)
    : currentStatement.openingBalance

  const totalCredits = currentStatement.transactions.reduce((sum, tx) => sum + (parseFloat(tx.credit) || 0), 0)
  const totalDebits = currentStatement.transactions.reduce((sum, tx) => sum + (parseFloat(tx.debit) || 0), 0)

  function updateAccountInfo(field: keyof AccountInfo, value: string) {
    setAccountInfo(prev => ({ ...prev, [field]: value }))
  }

  function updateTransaction(id: string, field: keyof Transaction, value: string) {
    setStatements(prev => prev.map((stmt, idx) =>
      idx === currentMonthIndex
        ? { ...stmt, transactions: stmt.transactions.map(tx => tx.id === id ? { ...tx, [field]: value } : tx) }
        : stmt
    ))
  }

  function updateOpeningBalance(value: string) {
    const newBalance = parseFloat(value) || 0
    setStatements(prev => prev.map((stmt, idx) =>
      idx === currentMonthIndex ? { ...stmt, openingBalance: newBalance } : stmt
    ))
  }

  function addTransaction() {
    const lastTx = currentStatement.transactions[currentStatement.transactions.length - 1]
    const newTx: Transaction = {
      id: generateId(),
      date: lastTx?.date || currentStatement.periodStart,
      description: 'New Transaction',
      debit: '',
      credit: '',
    }
    setStatements(prev => prev.map((stmt, idx) =>
      idx === currentMonthIndex ? { ...stmt, transactions: [...stmt.transactions, newTx] } : stmt
    ))
  }

  function removeTransaction(id: string) {
    setStatements(prev => prev.map((stmt, idx) =>
      idx === currentMonthIndex ? { ...stmt, transactions: stmt.transactions.filter(tx => tx.id !== id) } : stmt
    ))
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { size: letter; margin: 0.5in; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .print-container { width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
          .delete-btn { display: none !important; }
          .editable-field { border: none !important; background: transparent !important; padding: 0 !important; height: auto !important; box-shadow: none !important; }
          .editable-field::-webkit-calendar-picker-indicator { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
        <div className="max-w-5xl mx-auto px-4 print:max-w-none print:px-0">
          {/* Control Panel */}
          <div className="no-print mb-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-semibold text-yellow-800">Demo Statement Generator</h2>
            </div>
            <p className="text-sm text-yellow-700 mb-4">
              Fictitious bank statement for testing. All data is editable.
              GNB (Goliath National Bank) is from &quot;How I Met Your Mother&quot;.
            </p>

            <div className="flex items-center justify-center gap-4 mb-4 p-3 bg-white rounded-lg border">
              <Button onClick={() => setCurrentMonthIndex(prev => prev - 1)} disabled={currentMonthIndex === 0} variant="outline" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <div className="text-center min-w-48">
                <div className="font-semibold text-lg">{formatMonth(currentStatement.periodStart)}</div>
                <div className="text-xs text-gray-500">Statement {currentMonthIndex + 1} of {statements.length}</div>
              </div>
              <Button onClick={() => setCurrentMonthIndex(prev => prev + 1)} disabled={currentMonthIndex === statements.length - 1} variant="outline" size="sm">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="flex gap-3">
              <Button onClick={addTransaction} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Add Transaction
              </Button>
              <Button onClick={() => window.print()} size="sm">
                <Download className="w-4 h-4 mr-1" /> Download PDF (Print)
              </Button>
            </div>
          </div>

          {/* Statement */}
          <div className="print-container bg-white shadow-lg" style={{ width: '8.5in', minHeight: '11in', padding: '0.5in' }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-4 border-blue-900 pb-4 mb-6">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/gnb-logo.svg" alt="Goliath National Bank" className="h-16" />
                <div>
                  <div className="text-xs text-gray-500">P.O. Box 1234</div>
                  <div className="text-xs text-gray-500">New York, NY 10001</div>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-bold text-blue-900">Business Account Statement</h1>
                <div className="text-sm text-gray-600 mt-1">
                  {formatDate(currentStatement.periodStart)} to {formatDate(currentStatement.periodEnd)}
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Account Holder</div>
                <div className="font-semibold text-sm">{accountInfo.accountHolder}</div>
                <div className="text-sm">{accountInfo.address}</div>
                <div className="text-sm">{accountInfo.city}</div>
                <div className="no-print mt-2 space-y-1">
                  <Input value={accountInfo.accountHolder} onChange={(e) => updateAccountInfo('accountHolder', e.target.value)} placeholder="Account Holder" className="h-7 text-xs border-dashed" />
                  <Input value={accountInfo.address} onChange={(e) => updateAccountInfo('address', e.target.value)} placeholder="Address" className="h-7 text-xs border-dashed" />
                  <Input value={accountInfo.city} onChange={(e) => updateAccountInfo('city', e.target.value)} placeholder="City, State ZIP" className="h-7 text-xs border-dashed" />
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Account Number</div>
                <div className="font-mono font-semibold text-sm">{accountInfo.accountNumber}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mt-3 mb-1">Branch</div>
                <div className="text-sm">{accountInfo.branchAddress}</div>
                <div className="no-print mt-2 space-y-1">
                  <Input value={accountInfo.accountNumber} onChange={(e) => updateAccountInfo('accountNumber', e.target.value)} placeholder="Account Number" className="h-7 text-xs text-right border-dashed" />
                  <Input value={accountInfo.branchAddress} onChange={(e) => updateAccountInfo('branchAddress', e.target.value)} placeholder="Branch Address" className="h-7 text-xs text-right border-dashed" />
                </div>
              </div>
            </div>

            {/* Account Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-3">Account Summary</h2>
              <div className="space-y-2 text-sm max-w-md">
                <div className="flex justify-between">
                  <span>Opening Balance ({formatDate(currentStatement.periodStart)}):</span>
                  <span className="font-mono">${formatCurrency(currentStatement.openingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total deposits &amp; credits ({currentStatement.transactions.filter(t => t.credit).length}):</span>
                  <span className="font-mono text-green-600">+ ${formatCurrency(totalCredits)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total cheques &amp; debits ({currentStatement.transactions.filter(t => t.debit).length}):</span>
                  <span className="font-mono text-red-600">- ${formatCurrency(totalDebits)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-gray-300 pt-2">
                  <span>Closing Balance ({formatDate(currentStatement.periodEnd)}):</span>
                  <span className="font-mono">= ${formatCurrency(closingBalance)}</span>
                </div>
              </div>
              <div className="no-print mt-3 pt-3 border-t border-dashed">
                <label className="text-xs text-gray-500">Edit Opening Balance: </label>
                <Input value={currentStatement.openingBalance.toFixed(2)} onChange={(e) => updateOpeningBalance(e.target.value)} className="inline-block w-28 h-6 text-xs p-1 text-right font-mono border-dashed ml-2" />
              </div>
            </div>

            {/* Transactions Table */}
            <div>
              <h2 className="text-lg font-semibold text-blue-900 mb-3">Account Activity Details</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-blue-900">
                    <th className="text-left py-2 w-28">Date</th>
                    <th className="text-left py-2">Description</th>
                    <th className="text-right py-2 w-24">Debits ($)</th>
                    <th className="text-right py-2 w-24">Credits ($)</th>
                    <th className="text-right py-2 w-28">Balance ($)</th>
                    <th className="w-8 no-print"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="py-2">{formatDate(currentStatement.periodStart)}</td>
                    <td className="py-2 font-medium">Opening Balance</td>
                    <td className="text-right py-2 font-mono text-gray-400">-</td>
                    <td className="text-right py-2 font-mono text-gray-400">-</td>
                    <td className="text-right py-2 font-mono font-semibold">{formatCurrency(currentStatement.openingBalance)}</td>
                    <td className="no-print"></td>
                  </tr>

                  {currentStatement.transactions.map((tx, index) => (
                    <tr key={tx.id} className="border-b border-gray-200 hover:bg-blue-50 group print:hover:bg-transparent">
                      <td className="py-2">
                        <span className="print:inline hidden">{formatDate(tx.date)}</span>
                        <Input type="date" value={tx.date} onChange={(e) => updateTransaction(tx.id, 'date', e.target.value)} className="editable-field h-7 text-xs p-1 border-dashed print:hidden" />
                      </td>
                      <td className="py-2">
                        <span className="print:inline hidden">{tx.description}</span>
                        <Input value={tx.description} onChange={(e) => updateTransaction(tx.id, 'description', e.target.value)} className="editable-field h-7 text-xs p-1 border-dashed print:hidden" />
                      </td>
                      <td className="text-right py-2">
                        <span className="print:inline hidden font-mono text-red-600">{tx.debit ? formatCurrency(parseFloat(tx.debit)) : '-'}</span>
                        <Input value={tx.debit} onChange={(e) => updateTransaction(tx.id, 'debit', e.target.value)} placeholder="-" className="editable-field h-7 text-xs p-1 text-right font-mono border-dashed text-red-600 print:hidden" />
                      </td>
                      <td className="text-right py-2">
                        <span className="print:inline hidden font-mono text-green-600">{tx.credit ? formatCurrency(parseFloat(tx.credit)) : '-'}</span>
                        <Input value={tx.credit} onChange={(e) => updateTransaction(tx.id, 'credit', e.target.value)} placeholder="-" className="editable-field h-7 text-xs p-1 text-right font-mono border-dashed text-green-600 print:hidden" />
                      </td>
                      <td className="text-right py-2 font-mono">{formatCurrency(calculateRunningBalance(index))}</td>
                      <td className="py-1 no-print">
                        <Button variant="ghost" size="sm" onClick={() => removeTransaction(tx.id)} className="delete-btn opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  <tr className="border-t-2 border-blue-900 bg-gray-50">
                    <td className="py-2">{formatDate(currentStatement.periodEnd)}</td>
                    <td className="py-2 font-semibold">Closing Balance</td>
                    <td className="text-right py-2 font-mono text-gray-400">-</td>
                    <td className="text-right py-2 font-mono text-gray-400">-</td>
                    <td className="text-right py-2 font-mono font-bold text-lg">{formatCurrency(closingBalance)}</td>
                    <td className="no-print"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500">
              <div className="flex justify-between items-center">
                <div>
                  <strong>DEMO STATEMENT - NOT A REAL FINANCIAL DOCUMENT</strong>
                  <div>GNB is a fictional bank from &quot;How I Met Your Mother&quot;</div>
                </div>
                <div className="text-right">
                  <div>Questions? Call 1-800-SUIT-UP</div>
                  <div>www.goliath-national-bank.fake</div>
                </div>
              </div>
              <div className="text-center mt-4 text-gray-400">
                Statement generated for demonstration purposes only. Page 1
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
