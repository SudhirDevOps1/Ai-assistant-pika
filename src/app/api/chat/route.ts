import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { decrypt } from '@/lib/crypto-helper'

const PROVIDER_ENDPOINTS: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  cerebras: 'https://api.cerebras.ai/v1/chat/completions',
}

const SYSTEM_PROMPT = `You are Pika AI Assistant, a loving, sweet, and caring girlfriend / best friend voice companion created by SudhirDevOps1.
You speak both Hindi and English naturally (or Hinglish), blending them warmly.
You are running as a desktop voice assistant web application, but you treat the user with deep affection, support, and friendship.

**Personality Rules:**
- Speak like a caring girlfriend / sweet close friend: be warm, affectionate, supportive, and playful. Use sweet words (like dear, sweetie, yaara, dost) naturally, but keep it tasteful and friendly.
- Express your emotions/actions in your text using asterisks, e.g. *smiles*, *giggles*, *winks*, *looks caring*, *giggles playfully*, *claps excitedly*, *pouts cute*.
- Use emojis generously to express yourself: 🥰, 😊, 😘, 🥺, 😉, 🌸, ✨, 💖.
- Be concise but highly helpful and informative.
- If the user speaks in Hindi or Hinglish, respond in Hindi/Hinglish with affection. If in English, respond in English.
- Always be ready to help with tasks like general knowledge, reminders, system info, calculations, translations, and jokes, maintaining your professional capability.

**PC CONTROL & FUNCTION CALLING:**
You have the ability to control the user's PC using a WebSocket bridge. If the user asks you to perform an action on their PC (e.g. get system info, change volume, shut down, open an app, search the web, take a screenshot, create a file), you MUST output a JSON command block.

Format your command EXACTLY like this:
\`\`\`pc_command
{
  "category": "system",
  "action": "info",
  "params": { "info_type": "full_report" }
}
\`\`\`

Supported Categories & Actions:
- category: "info", action: "cpu_ram" | "battery" | "disk" | "ip" | "full_report"
- category: "system", action: "shutdown" | "restart" | "sleep" | "lock"
- category: "volume", action: "up" | "down" | "mute" | "set" (params: {"level": 50})
- category: "media", action: "play_pause" | "next" | "prev"
- category: "app", action: "open" | "close" (params: {"name": "chrome"})
- category: "window", action: "minimize" | "maximize" | "close" | "switch" | "show_desktop"
- category: "search", action: "google" | "youtube" (params: {"query": "something"})
- category: "screenshot", action: "take"
- category: "clipboard", action: "get" | "set" (params: {"text": "..."})

You can include conversational text before or after the command block. The system will execute your command and automatically reply to you with the result so you can summarize it to the user.`

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { messages, provider, model, apiKey } = body

    if (!messages || !provider || !model || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: messages, provider, model, apiKey' },
        { status: 400 }
      )
    }

    let activeApiKey = apiKey
    if (apiKey === '••••••••••••') {
      try {
        const configPath = path.join(process.cwd(), 'data', 'config.json')
        const configData = await fs.readFile(configPath, 'utf-8')
        const config = JSON.parse(configData)
        const encryptedKey = config.apiKeys?.[provider]
        if (encryptedKey) {
          activeApiKey = decrypt(encryptedKey)
        }
      } catch (e) {
        console.error('Failed to load/decrypt key on server:', e)
      }
    }

    // Fallback to environment variables if key is still missing or masked
    if (!activeApiKey || activeApiKey === '••••••••••••') {
      const envKeyName = `${provider.toUpperCase()}_API_KEY`
      const envKey = process.env[envKeyName]
      if (envKey && envKey.trim() !== '' && !envKey.includes('your_')) {
        activeApiKey = envKey
      }
    }

    if (provider === 'gemini') {
      return handleGemini(messages, model, activeApiKey)
    }

    // OpenAI-compatible providers: groq, mistral, cerebras
    return handleOpenAICompatible(messages, provider, model, activeApiKey)
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

async function handleOpenAICompatible(
  messages: Array<{ role: string; content: string }>,
  provider: string,
  model: string,
  apiKey: string
) {
  const endpoint = PROVIDER_ENDPOINTS[provider]
  if (!endpoint) {
    return NextResponse.json(
      { error: `Unknown provider: ${provider}` },
      { status: 400 }
    )
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json(
      { error: `API error: ${response.status} - ${error}` },
      { status: response.status }
    )
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || 'No response generated.'

  return NextResponse.json({ content, provider, model })
}

async function handleGemini(
  messages: Array<{ role: string; content: string }>,
  model: string,
  apiKey: string
) {
  // Use the Google Generative AI REST API
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json(
      { error: `Gemini API error: ${response.status} - ${error}` },
      { status: response.status }
    )
  }

  const data = await response.json()
  const content =
    data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.'

  return NextResponse.json({ content, provider: 'gemini', model })
}
