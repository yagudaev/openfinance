import { generateOgImage, ogSize } from '@/lib/og-image'

export const alt = 'OpenFinance — AI-Powered Personal Finance'
export const size = ogSize
export const contentType = 'image/png'

export default async function Image() {
  return generateOgImage()
}
