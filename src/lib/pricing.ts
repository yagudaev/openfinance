interface ModelPricing {
  prompt: number    // cost per token
  completion: number // cost per token
}

let cachedPricing: Record<string, ModelPricing> | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function fetchPricing(): Promise<Record<string, ModelPricing>> {
  const now = Date.now()
  if (cachedPricing && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedPricing
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models')
    const data = await res.json() as {
      data: Array<{ id: string, pricing?: { prompt?: string, completion?: string } }>
    }

    const pricing: Record<string, ModelPricing> = {}
    for (const model of data.data) {
      if (model.pricing?.prompt && model.pricing?.completion) {
        pricing[model.id] = {
          prompt: parseFloat(model.pricing.prompt),
          completion: parseFloat(model.pricing.completion),
        }
      }
    }

    cachedPricing = pricing
    cacheTimestamp = now
    return pricing
  } catch {
    return cachedPricing ?? {}
  }
}

export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  pricing: Record<string, ModelPricing>,
): number {
  // Strip our "openrouter/" routing prefix to get the OpenRouter model ID
  const orModelId = modelId.replace('openrouter/', '')
  const price = pricing[orModelId] ?? pricing[normalizeModelId(orModelId)]
  if (!price) return 0
  return inputTokens * price.prompt + outputTokens * price.completion
}

function normalizeModelId(id: string): string {
  // Our settings use dashes (claude-sonnet-4-5) but OpenRouter uses dots (claude-sonnet-4.5)
  return id.replace(/-(\d+)-(\d+)$/, '-$1.$2')
}
