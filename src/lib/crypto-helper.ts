import crypto from 'crypto'

// Use ENCRYPTION_KEY from environment, or generate a stable default based on workspace info
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'pika-companion-ai-key-secret-32'
const IV_LENGTH = 16

export function encrypt(text: string): string {
  if (!text) return ''
  // Pad or truncate key to exactly 32 bytes
  const key = Buffer.concat([Buffer.from(ENCRYPTION_KEY)], 32)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string): string {
  if (!text) return ''
  if (!text.includes(':')) {
    // Return plaintext if it doesn't look like encrypted format (backward compatibility)
    return text
  }
  try {
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift() || '', 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const key = Buffer.concat([Buffer.from(ENCRYPTION_KEY)], 32)
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (error) {
    console.error('Decryption failed, returning empty string:', error)
    return ''
  }
}
