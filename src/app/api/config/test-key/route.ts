import { NextResponse } from 'next/server'

const PROVIDER_ENDPOINTS: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  cerebras: 'https://api.cerebras.ai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
}

export async function POST(request: Request) {
  try {
    const { provider, apiKey, model } = await request.json()

    if (!provider || !apiKey) {
      return NextResponse.json({ success: false, error: 'Missing provider or apiKey' }, { status: 400 })
    }

    // Default test models if none provided
    const testModel = model || (
      provider === 'groq' ? 'llama-3.3-8b-instant' :
      provider === 'gemini' ? 'gemini-1.5-flash' :
      provider === 'mistral' ? 'open-mistral-nemo' :
      provider === 'cerebras' ? 'llama3.1-8b' :
      provider === 'openrouter' ? 'google/gemini-2.0-flash-exp:free' : 'default'
    )

    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        let parsedError = errorText
        try {
          const json = JSON.parse(errorText)
          parsedError = json.error?.message || json.error || errorText
        } catch {}
        return NextResponse.json({ success: false, error: `Gemini API Error (${response.status}): ${parsedError}` })
      }

      return NextResponse.json({ success: true })
    }

    // OpenAI-compatible providers
    const endpoint = PROVIDER_ENDPOINTS[provider]
    if (!endpoint) {
      return NextResponse.json({ success: false, error: `Unsupported provider: ${provider}` }, { status: 400 })
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: testModel,
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let parsedError = errorText
      try {
        const json = JSON.parse(errorText)
        parsedError = json.error?.message || json.error || errorText
      } catch {}
      return NextResponse.json({ success: false, error: `${provider.toUpperCase()} API Error (${response.status}): ${parsedError}` })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Test API Key error:', error)
    return NextResponse.json({ success: false, error: `Network/Request Error: ${error.message || error}` })
  }
}
