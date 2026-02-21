import { prisma } from '@/lib/prisma'

export type MemoryCategory =
  | 'financial_situation'
  | 'goals'
  | 'preferences'
  | 'tax_info'
  | 'business_info'
  | 'general'

export const MEMORY_CATEGORIES: Record<MemoryCategory, string> = {
  financial_situation: 'Financial situation and current status',
  goals: 'Financial goals and objectives',
  preferences: 'User preferences and communication style',
  tax_info: 'Tax situation and relevant details',
  business_info: 'Business or freelance information',
  general: 'Other important facts',
}

export async function saveMemory(
  userId: string,
  key: string,
  value: string,
  category: MemoryCategory,
) {
  return prisma.userMemory.upsert({
    where: { userId_key: { userId, key } },
    update: { value, category, updatedAt: new Date() },
    create: { userId, key, value, category },
  })
}

export async function deleteMemory(userId: string, key: string) {
  return prisma.userMemory.deleteMany({
    where: { userId, key },
  })
}

export async function recallMemories(
  userId: string,
  category?: MemoryCategory,
) {
  const where: { userId: string; category?: string } = { userId }
  if (category) {
    where.category = category
  }

  return prisma.userMemory.findMany({
    where,
    orderBy: [{ category: 'asc' }, { updatedAt: 'desc' }],
  })
}

export async function searchMemories(userId: string, query: string) {
  return prisma.userMemory.findMany({
    where: {
      userId,
      OR: [
        { key: { contains: query } },
        { value: { contains: query } },
      ],
    },
    orderBy: [{ category: 'asc' }, { updatedAt: 'desc' }],
  })
}

export async function loadMemoriesForPrompt(userId: string): Promise<string | null> {
  const memories = await recallMemories(userId)

  if (memories.length === 0) return null

  const grouped: Record<string, { key: string; value: string; updatedAt: Date }[]> = {}

  for (const memory of memories) {
    if (!grouped[memory.category]) {
      grouped[memory.category] = []
    }
    grouped[memory.category].push({
      key: memory.key,
      value: memory.value,
      updatedAt: memory.updatedAt,
    })
  }

  const sections = Object.entries(grouped).map(([category, items]) => {
    const label = MEMORY_CATEGORIES[category as MemoryCategory] ?? category
    const lines = items.map(item => `- **${item.key}**: ${item.value}`)
    return `### ${label}\n${lines.join('\n')}`
  })

  return sections.join('\n\n')
}
