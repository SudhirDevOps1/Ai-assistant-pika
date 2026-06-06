import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

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

async function writeConfig(config: Record<string, unknown>) {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2))
}

export async function GET() {
  const config = await readConfig()
  return NextResponse.json(config)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const currentConfig = await readConfig()
    const newConfig = { ...currentConfig, ...body }

    // Handle nested apiKeys merge
    if (body.apiKeys) {
      newConfig.apiKeys = { ...currentConfig.apiKeys, ...body.apiKeys }
    }

    await writeConfig(newConfig)
    return NextResponse.json(newConfig)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
