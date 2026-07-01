import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  provider?: string
  model?: string
}

export interface Reminder {
  id: string
  text: string
  createdAt: number
  expiresAt: number
  completed: boolean
}

export type AssistantStatus = 'idle' | 'listening' | 'thinking' | 'speaking'
export type ActivePanel = 'chat' | 'reminders' | 'clipboard' | 'system' | 'pc-control' | 'settings' | 'tools' | 'macros' | 'scheduler'

interface AssistantStore {
  // Chat
  messages: Message[]
  addMessage: (msg: Message) => void
  clearMessages: () => void
  sendMessage: (text: string) => void

  // Provider/Model
  provider: string
  model: string
  setProvider: (p: string) => void
  setModel: (m: string) => void

  // Config
  apiKeys: Record<string, string>
  setApiKey: (provider: string, key: string) => void

  // Settings
  autoFallback: boolean
  setAutoFallback: (v: boolean) => void
  conversationLimit: number
  setConversationLimit: (v: number) => void
  pipMode: boolean
  setPipMode: (v: boolean) => void
  wakeWord: string
  setWakeWord: (v: string) => void
  ttsVoice: string
  setTtsVoice: (v: string) => void
  speechMode: 'online' | 'offline'
  setSpeechMode: (v: 'online' | 'offline') => void
  sttEngine: 'web_speech' | 'vosk'
  setSttEngine: (v: 'web_speech' | 'vosk') => void
  ttsEngine: 'edge_tts' | 'pyttsx3'
  setTtsEngine: (v: 'edge_tts' | 'pyttsx3') => void

  // Status
  status: AssistantStatus
  setStatus: (s: AssistantStatus) => void

  // UI
  activePanel: ActivePanel
  setActivePanel: (p: ActivePanel) => void
  sidebarOpen: boolean
  toggleSidebar: () => void

  // Reminders
  reminders: Reminder[]
  addReminder: (r: Reminder) => void
  removeReminder: (id: string) => void

  // Clipboard
  clipboardItems: string[]
  addClipboardItem: (item: string) => void
  removeClipboardItem: (index: number) => void
  clearClipboard: () => void

  // PC Bridge
  pcBridgeUrl: string
  setPcBridgeUrl: (url: string) => void
  pcBridgeConnected: boolean
  setPcBridgeConnected: (v: boolean) => void

  // Global Command Executor
  executeCommand: ((category: string, action: string, params?: Record<string, unknown>) => Promise<any>) | null
  setExecuteCommand: (fn: ((category: string, action: string, params?: Record<string, unknown>) => Promise<any>) | null) => void
  currentCommandText: string
  setCurrentCommandText: (v: string) => void

  sendAudioChunk: ((chunk: ArrayBuffer | Blob) => void) | null
  setSendAudioChunk: (fn: ((chunk: ArrayBuffer | Blob) => void) | null) => void

  speechResult: { text: string, isFinal: boolean } | null
  setSpeechResult: (result: { text: string, isFinal: boolean } | null) => void

  // Ambient Theme
  auroraTheme: string
  setAuroraTheme: (t: string) => void

  // Real-time voice visualizer
  micVolume: number
  setMicVolume: (v: number) => void
}

export const useAssistantStore = create<AssistantStore>((set, get) => ({
  // Chat
  messages: [],
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  clearMessages: () => set({ messages: [] }),

  // Send message handler
  sendMessage: async (text: string) => {
    const { provider, model, apiKeys, addMessage, setStatus, messages } = get()
    const apiKey = apiKeys[provider]

    if (!apiKey) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ No API key configured for **${provider}**. Please go to Settings and add your API key to start chatting.`,
        timestamp: Date.now(),
      })
      return
    }

    // Add user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    addMessage(userMsg)

    // Build messages array for API (limit to conversationLimit)
    const conversationHistory = get().messages.slice(-(get().conversationLimit || 50))
    const apiMessages = conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // Set thinking status
    setStatus('thinking')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          provider,
          model,
          apiKey,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      let responseContent = data.content
      let extractedCommand: any = null

      try {
        // Try to find any JSON block that looks like a command
        const jsonMatch = responseContent.match(/\{[\s\S]*"category"[\s\S]*"action"[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.category && parsed.action) {
            extractedCommand = parsed
            // Remove the JSON block from the user-facing text
            responseContent = responseContent.replace(jsonMatch[0], '').trim()
            // Remove any remaining markdown code ticks like ```pc_command or ```json
            responseContent = responseContent.replace(/```(pc_command|json)?\n?/g, '').replace(/```/g, '').trim()
          }
        }
      } catch (e) {
        console.error("Failed to parse pc_command JSON", e)
      }

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseContent || (extractedCommand ? "⏳ Executing PC command..." : data.content),
        timestamp: Date.now(),
        provider: data.provider,
        model: data.model,
      })

      // Speak using Edge TTS via PC Bridge
      const cmdExecutor = get().executeCommand
      if (cmdExecutor && responseContent && !extractedCommand) {
        const voice = get().ttsVoice || 'hi-IN-SwaraNeural'
        const ttsEngine = get().ttsEngine || 'edge_tts'
        cmdExecutor('tts', 'speak', { text: responseContent, voice, engine: ttsEngine })
          .then((res) => {
            if (res.success && res.audio) {
              const format = res.format || 'mp3'
              const audioUrl = `data:audio/${format};base64,${res.audio}`
              const audio = new Audio(audioUrl)
              setStatus('speaking')
              audio.onended = () => setStatus('idle')
              audio.play().catch((err) => {
                console.error("Audio playback failed:", err)
                setStatus('idle')
              })
            }
          })
          .catch((err) => {
            console.error("TTS request failed:", err)
          })
      }

      if (extractedCommand) {
        const executor = get().executeCommand
        if (executor) {
          const result = await executor(extractedCommand.category, extractedCommand.action, extractedCommand.params || {})
          
          // Send result back to LLM to summarize
          get().sendMessage(`[SYSTEM EVENT: PC Command Result]
Action: ${extractedCommand.action}
Result: ${JSON.stringify(result)}

Please briefly summarize this result for me.`)
        } else {
          addMessage({
            id: crypto.randomUUID(),
            role: 'system',
            content: '⚠️ PC Bridge is not connected. The AI tried to run a command but failed. Please connect in Settings.',
            timestamp: Date.now()
          })
        }
      }

    } catch (error) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Something went wrong'}. Please check your API key and try again.`,
        timestamp: Date.now(),
      })
    } finally {
      setStatus('idle')
    }
  },

  // Provider/Model
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  setProvider: (p) => set({ provider: p }),
  setModel: (m) => set({ model: m }),

  apiKeys: {
    groq: '',
    gemini: '',
    mistral: '',
    cerebras: '',
    openrouter: '',
  },
  setApiKey: (provider, key) =>
    set((state) => ({
      apiKeys: { ...state.apiKeys, [provider]: key },
    })),

  // Settings
  autoFallback: true,
  setAutoFallback: (v) => set({ autoFallback: v }),
  conversationLimit: 50,
  setConversationLimit: (v) => set({ conversationLimit: v }),
  pipMode: false,
  setPipMode: (v) => set({ pipMode: v }),
  wakeWord: 'Hey Assistant',
  setWakeWord: (v) => set({ wakeWord: v }),
  ttsVoice: 'hi-IN-SwaraNeural',
  setTtsVoice: (v) => set({ ttsVoice: v }),
  speechMode: 'online',
  setSpeechMode: (v) => set({ speechMode: v }),
  sttEngine: 'web_speech',
  setSttEngine: (v) => set({ sttEngine: v }),
  ttsEngine: 'edge_tts',
  setTtsEngine: (v) => set({ ttsEngine: v }),

  // Status
  status: 'idle',
  setStatus: (s) => set({ status: s }),

  // UI
  activePanel: 'chat',
  setActivePanel: (p) => set({ activePanel: p }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Reminders
  reminders: [],
  addReminder: (r) =>
    set((state) => ({ reminders: [...state.reminders, r] })),
  removeReminder: (id) =>
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    })),

  // Clipboard
  clipboardItems: [],
  addClipboardItem: (item) =>
    set((state) => ({ clipboardItems: [...state.clipboardItems, item] })),
  removeClipboardItem: (index) =>
    set((state) => ({
      clipboardItems: state.clipboardItems.filter((_, i) => i !== index),
    })),
  clearClipboard: () => set({ clipboardItems: [] }),

  // PC Bridge
  pcBridgeUrl: 'ws://localhost:8765',
  setPcBridgeUrl: (url) => set({ pcBridgeUrl: url }),
  pcBridgeConnected: false,
  setPcBridgeConnected: (v) => set({ pcBridgeConnected: v }),

  // Global Command Executor
  executeCommand: null,
  setExecuteCommand: (fn) => set({ executeCommand: fn }),
  currentCommandText: '',
  setCurrentCommandText: (v) => set({ currentCommandText: v }),

  sendAudioChunk: null,
  setSendAudioChunk: (fn) => set({ sendAudioChunk: fn }),

  speechResult: null,
  setSpeechResult: (result) => set({ speechResult: result }),

  // Ambient Theme
  auroraTheme: 'neon',
  setAuroraTheme: (t) => set({ auroraTheme: t }),

  // Real-time voice visualizer
  micVolume: 0,
  setMicVolume: (v) => set({ micVolume: v }),
}))
