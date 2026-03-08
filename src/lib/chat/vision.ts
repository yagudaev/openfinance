import { UIMessage } from 'ai'

import { openai } from '@/lib/openai'

/**
 * Detect image parts in messages and replace them with text descriptions
 * from a vision model. This allows text-only chat models (like GLM-4.7)
 * to understand image content.
 *
 * Returns a new messages array with image parts replaced by text descriptions.
 */
export async function replaceImagePartsWithDescriptions(
  messages: UIMessage[],
  visionModel: string,
): Promise<UIMessage[]> {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()
  if (!lastUserMessage) return messages

  const imageUrls = extractImageUrls(lastUserMessage)
  if (imageUrls.length === 0) return messages

  const descriptions = await Promise.all(
    imageUrls.map(url => describeImage(url, visionModel)),
  )

  const combinedDescription = descriptions
    .map((desc, i) => imageUrls.length > 1 ? `[Image ${i + 1}]: ${desc}` : desc)
    .join('\n\n')

  return messages.map(msg => {
    if (msg.id !== lastUserMessage.id) return msg

    const nonImageParts = msg.parts.filter(
      p => !(p.type === 'file' && 'mediaType' in p && typeof p.mediaType === 'string' && p.mediaType.startsWith('image/')),
    )

    const existingText = nonImageParts
      .filter((p): p is { type: 'text', text: string } => p.type === 'text')
      .map(p => p.text)
      .join('\n')

    const imageContext = `[Image description from vision model]: ${combinedDescription}`
    const newText = existingText
      ? `${existingText}\n\n${imageContext}`
      : imageContext

    return {
      ...msg,
      parts: [{ type: 'text' as const, text: newText }],
    }
  })
}

function extractImageUrls(message: UIMessage): string[] {
  return message.parts
    .filter((p): p is { type: 'file', mediaType: string, url: string } =>
      p.type === 'file'
      && 'mediaType' in p
      && typeof (p as Record<string, unknown>).mediaType === 'string'
      && ((p as Record<string, unknown>).mediaType as string).startsWith('image/'),
    )
    .map(p => p.url)
}

async function describeImage(imageUrl: string, model: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Describe this image in detail. If it contains a chart or graph, extract the key data points, axis labels, trends, and any visible numbers. If it contains text, transcribe the relevant text. If it contains a table, extract the data in a structured format. Be precise with numbers and values.`,
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    max_tokens: 1000,
  })

  return completion.choices[0]?.message?.content || 'Unable to describe image.'
}
