export interface ModelInfo {
  id: string
  name: string
  provider: string
}

export const providerModels: Record<string, ModelInfo[]> = {
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', provider: 'groq' },
    { id: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', provider: 'groq' },
    { id: 'llama-3.3-8b-instant', name: 'Llama 3.3 8B Instant', provider: 'groq' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT', provider: 'groq' },
    { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B', provider: 'groq' },
    { id: 'mistral-saba-24b', name: 'Mistral Saba 24B', provider: 'groq' },
    { id: 'qwen-qwq-32b', name: 'Qwen QWQ 32B', provider: 'groq' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'gemini' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'gemini' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', provider: 'gemini' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini' },
  ],
  mistral: [
    { id: 'mistral-small-latest', name: 'Mistral Small Latest', provider: 'mistral' },
    { id: 'open-mistral-nemo', name: 'Mistral Nemo', provider: 'mistral' },
    { id: 'open-mixtral-8x7b', name: 'Mixtral 8x7B', provider: 'mistral' },
    { id: 'mistral-large-latest', name: 'Mistral Large Latest', provider: 'mistral' },
    { id: 'codestral-latest', name: 'Codestral', provider: 'mistral' },
    { id: 'mistral-medium-latest', name: 'Mistral Medium Latest', provider: 'mistral' },
  ],
  cerebras: [
    { id: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', provider: 'cerebras' },
    { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'cerebras' },
    { id: 'llama3.1-70b', name: 'Llama 3.1 70B', provider: 'cerebras' },
    { id: 'llama3.1-8b', name: 'Llama 3.1 8B', provider: 'cerebras' },
    { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B', provider: 'cerebras' },
    { id: 'qwen-3-32b', name: 'Qwen 3 32B', provider: 'cerebras' },
  ],
  openrouter: [
    { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (OpenRouter)', provider: 'openrouter' },
    { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro (OpenRouter)', provider: 'openrouter' },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Free (OpenRouter)', provider: 'openrouter' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (OpenRouter)', provider: 'openrouter' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (OpenRouter)', provider: 'openrouter' },
    { id: 'zhipu/glm-4-9b-chat', name: 'GLM-4 9B Chat (OpenRouter)', provider: 'openrouter' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (OpenRouter)', provider: 'openrouter' },
  ],
}

export const providerNames: Record<string, string> = {
  groq: 'Groq',
  gemini: 'Gemini',
  mistral: 'Mistral',
  cerebras: 'Cerebras',
  openrouter: 'OpenRouter',
}

export const providerColors: Record<string, string> = {
  groq: 'from-orange-400 to-orange-600',
  gemini: 'from-blue-400 to-blue-600',
  mistral: 'from-emerald-400 to-emerald-600',
  cerebras: 'from-purple-400 to-purple-600',
  openrouter: 'from-pink-400 to-pink-600',
}
