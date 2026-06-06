import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { encrypt, decrypt } from '@/lib/crypto-helper'

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json')

const DEFAULT_CONFIG = {
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  apiKeys: {
    groq: '',
    gemini: '',
    mistral: '',
    cerebras: '',
  },
  ttsVoice: 'en-US-Neural2-A',
  autoFallback: true,
  conversationLimit: 50,
  wakeWord: 'Hey Assistant',
}

async function readConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return DEFAULT_CONFIG
  }
}

async function writeConfig(config: Record<string, any>) {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2))
}

export async function GET() {
  const config = await readConfig()
  
  // Return masked keys to client, checking both JSON storage and environment variables
  const maskedKeys: Record<string, string> = {}
  const providers = ['groq', 'gemini', 'mistral', 'cerebras']
  
  providers.forEach((provider) => {
    const jsonKey = config.apiKeys?.[provider]
    const envKeyName = `${provider.toUpperCase()}_API_KEY`
    const envKey = process.env[envKeyName]
    
    const isConfigured = 
      (jsonKey && jsonKey.trim() !== '') || 
      (envKey && envKey.trim() !== '' && !envKey.includes('your_'))
      
    maskedKeys[provider] = isConfigured ? '••••••••••••' : ''
  })

  return NextResponse.json({
    ...config,
    apiKeys: maskedKeys,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const currentConfig = await readConfig()
    const newConfig = { ...currentConfig, ...body }

    // Handle nested apiKeys merge with encryption
    if (body.apiKeys) {
      const mergedKeys = { ...currentConfig.apiKeys }
      
      Object.entries(body.apiKeys).forEach(([provider, val]) => {
        const value = val as string
        if (value === '••••••••••••') {
          // Keep the existing encrypted key
          mergedKeys[provider] = currentConfig.apiKeys?.[provider] || ''
        } else if (value.trim() === '') {
          // Clear key
          mergedKeys[provider] = ''
        } else {
          // Encrypt and save new key
          mergedKeys[provider] = encrypt(value)
        }
      })
      
      newConfig.apiKeys = mergedKeys
    }

    await writeConfig(newConfig)
    
    // Return masked configuration back to client
    const maskedKeys: Record<string, string> = {}
    if (newConfig.apiKeys) {
      Object.entries(newConfig.apiKeys).forEach(([provider, value]) => {
        maskedKeys[provider] = value ? '••••••••••••' : ''
      })
    }

    return NextResponse.json({
      ...newConfig,
      apiKeys: maskedKeys,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
