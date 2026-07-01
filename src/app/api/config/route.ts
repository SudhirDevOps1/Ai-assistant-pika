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
    openrouter: '',
  },
  ttsVoice: 'hi-IN-SwaraNeural',
  autoFallback: true,
  conversationLimit: 50,
  wakeWord: 'Hey Assistant',
  auroraTheme: 'neon',
  pcBridgeUrl: 'ws://localhost:8765',
  speechMode: 'online',
  sttEngine: 'web_speech',
  ttsEngine: 'edge_tts',
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
  
  // Return decrypted keys to client, checking both JSON storage and environment variables
  const plainKeys: Record<string, string> = {}
  const providers = ['groq', 'gemini', 'mistral', 'cerebras', 'openrouter']
  
  providers.forEach((provider) => {
    const jsonKey = config.apiKeys?.[provider]
    const envKeyName = `${provider.toUpperCase()}_API_KEY`
    const envKey = process.env[envKeyName]
    
    if (jsonKey && jsonKey.trim() !== '') {
      try {
        plainKeys[provider] = decrypt(jsonKey)
      } catch {
        plainKeys[provider] = jsonKey
      }
    } else if (envKey && envKey.trim() !== '' && !envKey.includes('your_')) {
      plainKeys[provider] = envKey
    } else {
      plainKeys[provider] = ''
    }
  })

  return NextResponse.json({
    ...config,
    apiKeys: plainKeys,
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
    
    // Return decrypted keys back to client for local display & testing
    const plainKeys: Record<string, string> = {}
    const providers = ['groq', 'gemini', 'mistral', 'cerebras', 'openrouter']
    
    providers.forEach((provider) => {
      const jsonKey = newConfig.apiKeys?.[provider]
      const envKeyName = `${provider.toUpperCase()}_API_KEY`
      const envKey = process.env[envKeyName]
      
      if (jsonKey && jsonKey.trim() !== '') {
        try {
          plainKeys[provider] = decrypt(jsonKey)
        } catch {
          plainKeys[provider] = jsonKey
        }
      } else if (envKey && envKey.trim() !== '' && !envKey.includes('your_')) {
        plainKeys[provider] = envKey
      } else {
        plainKeys[provider] = ''
      }
    })

    return NextResponse.json({
      ...newConfig,
      apiKeys: plainKeys,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
