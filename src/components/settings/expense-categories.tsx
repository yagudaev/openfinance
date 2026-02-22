'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Tags,
  Plus,
  RotateCcw,
  Save,
  Loader2,
  X,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  sortOrder: number
  isDefault: boolean
  isActive: boolean
}

interface EditingState {
  name: string
  description: string
  icon: string
  color: string
}

export function ExpenseCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingState, setEditingState] = useState<EditingState>({
    name: '',
    description: '',
    icon: '',
    color: '',
  })
  const [addingNew, setAddingNew] = useState(false)
  const [newCategory, setNewCategory] = useState<EditingState>({
    name: '',
    description: '',
    icon: '',
    color: '#6b7280',
  })
  const [showInactive, setShowInactive] = useState(false)

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      const data = await res.json()
      setCategories(data)
    } catch {
      showMessage('error', 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [showMessage])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function startEditing(cat: Category) {
    setEditingId(cat.id)
    setEditingState({
      name: cat.name,
      description: cat.description || '',
      icon: cat.icon || '',
      color: cat.color || '#6b7280',
    })
  }

  function cancelEditing() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    if (!editingState.name.trim()) {
      showMessage('error', 'Name is required')
      return
    }

    setSaving(id)
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingState.name.trim(),
          description: editingState.description.trim() || null,
          icon: editingState.icon.trim() || null,
          color: editingState.color.trim() || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update')
      }

      const updated = await res.json()
      setCategories(prev => prev.map(c => c.id === id ? updated : c))
      setEditingId(null)
      showMessage('success', 'Category updated')
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to update')
    } finally {
      setSaving(null)
    }
  }

  async function addCategory() {
    if (!newCategory.name.trim()) {
      showMessage('error', 'Name is required')
      return
    }

    setSaving('new')
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategory.name.trim(),
          description: newCategory.description.trim() || null,
          icon: newCategory.icon.trim() || null,
          color: newCategory.color.trim() || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create')
      }

      const created = await res.json()
      setCategories(prev => [...prev, created])
      setAddingNew(false)
      setNewCategory({ name: '', description: '', icon: '', color: '#6b7280' })
      showMessage('success', 'Category added')
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to create')
    } finally {
      setSaving(null)
    }
  }

  async function toggleActive(cat: Category) {
    setSaving(cat.id)
    try {
      if (cat.isActive) {
        // Soft-delete via DELETE endpoint
        const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to deactivate')
        const updated = await res.json()
        setCategories(prev => prev.map(c => c.id === cat.id ? updated : c))
        showMessage('success', `"${cat.name}" deactivated`)
      } else {
        // Re-activate via PATCH
        const res = await fetch(`/api/categories/${cat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        })
        if (!res.ok) throw new Error('Failed to activate')
        const updated = await res.json()
        setCategories(prev => prev.map(c => c.id === cat.id ? updated : c))
        showMessage('success', `"${cat.name}" reactivated`)
      }
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to toggle')
    } finally {
      setSaving(null)
    }
  }

  async function moveCategory(id: string, direction: 'up' | 'down') {
    const active = categories.filter(c => c.isActive)
    const index = active.findIndex(c => c.id === id)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === active.length - 1) return

    const swapIndex = direction === 'up' ? index - 1 : index + 1
    const newOrder = [...active]
    const temp = newOrder[index]
    newOrder[index] = newOrder[swapIndex]
    newOrder[swapIndex] = temp

    const orderedIds = newOrder.map(c => c.id)

    // Optimistic update
    const reordered = newOrder.map((c, i) => ({ ...c, sortOrder: i }))
    const inactive = categories.filter(c => !c.isActive)
    setCategories([...reordered, ...inactive])

    try {
      const res = await fetch('/api/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      })

      if (!res.ok) throw new Error('Failed to reorder')
      const data = await res.json()
      setCategories(data)
    } catch {
      // Revert on error
      fetchCategories()
      showMessage('error', 'Failed to reorder')
    }
  }

  async function handleReset() {
    if (!confirm('Reset all categories to defaults? This will remove any custom categories.')) {
      return
    }

    setSaving('reset')
    try {
      const res = await fetch('/api/categories/reset', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to reset')
      const data = await res.json()
      setCategories(data)
      setEditingId(null)
      setAddingNew(false)
      showMessage('success', 'Categories reset to defaults')
    } catch {
      showMessage('error', 'Failed to reset categories')
    } finally {
      setSaving(null)
    }
  }

  const activeCategories = categories.filter(c => c.isActive)
  const inactiveCategories = categories.filter(c => !c.isActive)

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Tags className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Expense Categories</h2>
        </div>
        <div className="mt-4 flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {message && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tags className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Expense Categories</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={saving === 'reset'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {saving === 'reset' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
            Reset to Defaults
          </button>
          <button
            onClick={() => setAddingNew(true)}
            disabled={addingNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Add Category
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Manage expense categories used to classify transactions. Descriptions guide the AI classifier.
      </p>

      {/* Add new category form */}
      {addingNew && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">New Category</p>
            <button onClick={() => setAddingNew(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-[auto_1fr_1fr_auto] gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500">Icon</label>
              <input
                value={newCategory.icon}
                onChange={e => setNewCategory(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="🏷️"
                className="mt-1 w-14 rounded border border-gray-200 px-2 py-1.5 text-center text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Name</label>
              <input
                value={newCategory.name}
                onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Category name"
                className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Description (for AI)</label>
              <input
                value={newCategory.description}
                onChange={e => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Keywords and examples for the AI classifier"
                className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Color</label>
              <input
                type="color"
                value={newCategory.color}
                onChange={e => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                className="mt-1 h-[30px] w-10 cursor-pointer rounded border border-gray-200"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={addCategory}
              disabled={saving === 'new'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving === 'new' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Active categories list */}
      <div className="mt-4 space-y-1">
        {activeCategories.map((cat, index) => (
          <div
            key={cat.id}
            className="group flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 hover:border-gray-200 hover:bg-gray-50/50"
          >
            {editingId === cat.id ? (
              /* Editing mode */
              <div className="flex w-full flex-col gap-2">
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-3">
                  <div>
                    <input
                      value={editingState.icon}
                      onChange={e => setEditingState(prev => ({ ...prev, icon: e.target.value }))}
                      placeholder="🏷️"
                      className="w-14 rounded border border-gray-200 px-2 py-1.5 text-center text-sm"
                    />
                  </div>
                  <div>
                    <input
                      value={editingState.name}
                      onChange={e => setEditingState(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Category name"
                      className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <input
                      value={editingState.description}
                      onChange={e => setEditingState(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description for AI classifier"
                      className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <input
                      type="color"
                      value={editingState.color}
                      onChange={e => setEditingState(prev => ({ ...prev, color: e.target.value }))}
                      className="h-[30px] w-10 cursor-pointer rounded border border-gray-200"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelEditing}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveEdit(cat.id)}
                    disabled={saving === cat.id}
                    className="inline-flex items-center gap-1 rounded bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving === cat.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </button>
                </div>
              </div>
            ) : (
              /* Display mode */
              <>
                {/* Reorder buttons */}
                <div className="flex flex-col opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => moveCategory(cat.id, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:invisible"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveCategory(cat.id, 'down')}
                    disabled={index === activeCategories.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:invisible"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Color dot */}
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color || '#6b7280' }}
                />

                {/* Icon */}
                <span className="w-6 text-center text-base">{cat.icon || '📁'}</span>

                {/* Name + description */}
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                  {cat.description && (
                    <span className="ml-2 text-xs text-gray-400">{cat.description}</span>
                  )}
                </div>

                {/* Default badge */}
                {cat.isDefault && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                    default
                  </span>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => startEditing(cat)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleActive(cat)}
                    disabled={saving === cat.id}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    title="Deactivate"
                  >
                    {saving === cat.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Inactive categories */}
      {inactiveCategories.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
          >
            {showInactive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showInactive ? 'Hide' : 'Show'} inactive ({inactiveCategories.length})
          </button>

          {showInactive && (
            <div className="mt-2 space-y-1">
              {inactiveCategories.map(cat => (
                <div
                  key={cat.id}
                  className="group flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 opacity-50"
                >
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color || '#6b7280' }}
                  />
                  <span className="w-6 text-center text-base">{cat.icon || '📁'}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-900 line-through">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => toggleActive(cat)}
                    disabled={saving === cat.id}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    {saving === cat.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reactivate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
