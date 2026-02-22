import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const ENCRYPTED_PREFIX = 'enc:'

let encryptionKey: Buffer | null = null
let warnedNoKey = false

function getKey(): Buffer | null {
  if (encryptionKey) return encryptionKey

  const hex = process.env.ENCRYPTION_KEY
  if (!hex) {
    if (!warnedNoKey) {
      console.warn(
        '[encryption] ENCRYPTION_KEY not set — encryption is disabled. '
        + 'Data will be stored in plaintext. '
        + 'Set ENCRYPTION_KEY to a 64-character hex string (32 bytes) to enable encryption.',
      )
      warnedNoKey = true
    }
    return null
  }

  if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). '
      + `Got ${hex.length} characters.`,
    )
  }

  encryptionKey = Buffer.from(hex, 'hex')
  return encryptionKey
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns: `enc:` prefix + base64(IV + authTag + ciphertext)
 *
 * If ENCRYPTION_KEY is not set, returns plaintext as-is (pass-through mode).
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  if (!key) return plaintext

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Format: IV (12 bytes) + authTag (16 bytes) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted])

  return ENCRYPTED_PREFIX + combined.toString('base64')
}

/**
 * Decrypt an encrypted string produced by encrypt().
 * Handles both encrypted values (with `enc:` prefix) and plaintext (backwards-compatible).
 *
 * If ENCRYPTION_KEY is not set, returns the value as-is.
 */
export function decrypt(encrypted: string): string {
  if (!isEncrypted(encrypted)) return encrypted

  const key = getKey()
  if (!key) {
    // Key not set but value looks encrypted — strip prefix and return as-is
    // This shouldn't happen in production but prevents crashes during development
    return encrypted
  }

  const combined = Buffer.from(encrypted.slice(ENCRYPTED_PREFIX.length), 'base64')

  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Check if a value is already encrypted (starts with the `enc:` prefix).
 * Useful for detecting pre-migration plaintext values.
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX)
}
