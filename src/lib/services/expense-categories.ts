import { prisma } from '@/lib/prisma'

export interface DefaultCategory {
  name: string
  description: string
  icon: string
  color: string
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Groceries',
    description: 'Supermarkets, grocery stores, food staples, household supplies',
    icon: '🛒',
    color: '#22c55e',
  },
  {
    name: 'Dining',
    description: 'Restaurants, takeout, coffee shops, food delivery, bars',
    icon: '🍽️',
    color: '#f97316',
  },
  {
    name: 'Transport',
    description: 'Gas, public transit, ride-sharing, parking, car maintenance, tolls',
    icon: '🚗',
    color: '#3b82f6',
  },
  {
    name: 'Housing',
    description: 'Rent, mortgage payments, property tax, home insurance, repairs',
    icon: '🏠',
    color: '#8b5cf6',
  },
  {
    name: 'Utilities',
    description: 'Electricity, gas, water, internet, phone, cable',
    icon: '💡',
    color: '#eab308',
  },
  {
    name: 'Entertainment',
    description: 'Movies, concerts, streaming services, games, hobbies, sports',
    icon: '🎬',
    color: '#ec4899',
  },
  {
    name: 'Healthcare',
    description: 'Doctor visits, prescriptions, dental, vision, medical supplies, insurance premiums',
    icon: '🏥',
    color: '#ef4444',
  },
  {
    name: 'Shopping',
    description: 'Clothing, electronics, home goods, personal care, online shopping',
    icon: '🛍️',
    color: '#a855f7',
  },
  {
    name: 'Subscriptions',
    description: 'Software subscriptions, memberships, recurring monthly services',
    icon: '🔄',
    color: '#6366f1',
  },
  {
    name: 'Travel',
    description: 'Flights, hotels, vacation rentals, travel insurance, luggage',
    icon: '✈️',
    color: '#14b8a6',
  },
  {
    name: 'Education',
    description: 'Tuition, courses, books, school supplies, training',
    icon: '📚',
    color: '#0ea5e9',
  },
  {
    name: 'Income',
    description: 'Salary, freelance payments, invoices, revenue, refunds, interest',
    icon: '💰',
    color: '#10b981',
  },
  {
    name: 'Transfer',
    description: 'Internal transfers between own accounts, e-transfers to self, interac transfers',
    icon: '🔀',
    color: '#6b7280',
  },
  {
    name: 'Insurance',
    description: 'Life insurance, car insurance, health insurance, liability insurance',
    icon: '🛡️',
    color: '#0284c7',
  },
  {
    name: 'Taxes',
    description: 'Income tax, sales tax remittance, property tax, tax installments',
    icon: '🏛️',
    color: '#dc2626',
  },
  {
    name: 'Business',
    description: 'Office supplies, software tools, business meals, advertising, professional services',
    icon: '💼',
    color: '#1d4ed8',
  },
  {
    name: 'Other',
    description: 'Miscellaneous expenses that do not fit other categories',
    icon: '📌',
    color: '#9ca3af',
  },
]

export async function seedDefaultCategories(userId: string): Promise<void> {
  const existing = await prisma.expenseCategory.findFirst({
    where: { userId },
  })

  if (existing) return

  await prisma.expenseCategory.createMany({
    data: DEFAULT_CATEGORIES.map((cat, index) => ({
      userId,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      sortOrder: index,
      isDefault: true,
      isActive: true,
    })),
  })
}

export async function getActiveCategories(userId: string) {
  return prisma.expenseCategory.findMany({
    where: { userId, isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function getAllCategories(userId: string) {
  return prisma.expenseCategory.findMany({
    where: { userId },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function resetToDefaults(userId: string): Promise<void> {
  await prisma.expenseCategory.deleteMany({
    where: { userId },
  })

  await prisma.expenseCategory.createMany({
    data: DEFAULT_CATEGORIES.map((cat, index) => ({
      userId,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      sortOrder: index,
      isDefault: true,
      isActive: true,
    })),
  })
}

export async function getCategoriesForClassifier(userId: string): Promise<string> {
  const categories = await getActiveCategories(userId)

  if (categories.length === 0) return ''

  return categories
    .map(c => `- ${c.name}: ${c.description || c.name}`)
    .join('\n')
}
