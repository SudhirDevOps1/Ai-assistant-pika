'use client'

import { useEffect, useCallback, useState } from 'react'
import { useAssistantStore } from '@/store/assistant-store'

export interface PcBridgeMessage {
  type: 'response' | 'event' | 'error' | 'speech_result'
  event?: string
  success?: boolean
  message?: string
  data?: Record<string, unknown>
  category?: string
  action?: string
  text?: string
  isFinal?: boolean
}

export type BridgeStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Module-level global state to share a single WebSocket connection across all hook instances
let globalWs: WebSocket | null = null
let globalReconnectTimeout: NodeJS.Timeout | null = null
let globalStatus: BridgeStatus = 'disconnected'
let globalSystemData: Record<string, unknown> | null = null
let globalLastResponse: PcBridgeMessage | null = null
let globalSpeechResult: { text: string, isFinal: boolean } | null = null

const stateListeners = new Set<(
  status: BridgeStatus,
  systemData: Record<string, unknown> | null,
  lastResponse: PcBridgeMessage | null,
  speechResult: { text: string, isFinal: boolean } | null
) => void>()

const updateGlobalState = (
  status: BridgeStatus,
  systemData: Record<string, unknown> | null,
  lastResponse: PcBridgeMessage | null,
  speechResult: { text: string, isFinal: boolean } | null
) => {
  globalStatus = status
  globalSystemData = systemData
  globalLastResponse = lastResponse
  globalSpeechResult = speechResult
  
  // Sync with Zustand store
  if (typeof window !== 'undefined') {
    useAssistantStore.getState().setPcBridgeConnected(status === 'connected')
  }

  stateListeners.forEach((listener) => {
    try {
      listener(status, systemData, lastResponse, speechResult)
    } catch (e) {
      console.error('[PC Bridge] Listener error:', e)
    }
  })
}

const cleanupSocket = () => {
  if (globalReconnectTimeout) {
    clearTimeout(globalReconnectTimeout)
    globalReconnectTimeout = null
  }
  if (globalWs) {
    globalWs.onopen = null
    globalWs.onclose = null
    globalWs.onerror = null
    globalWs.onmessage = null
    try {
      globalWs.close()
    } catch (e) {
      // ignore
    }
    globalWs = null
  }
}

const connectWebSocket = (url: string) => {
  if (!url) return

  // If already connected/connecting to the exact same URL, do nothing
  if (globalWs && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING) && globalWs.url === url) {
    return
  }

  cleanupSocket()
  updateGlobalState('connecting', globalSystemData, globalLastResponse, globalSpeechResult)

  try {
    const socket = new WebSocket(url)

    socket.onopen = () => {
      updateGlobalState('connected', globalSystemData, globalLastResponse, globalSpeechResult)
      console.log('[PC Bridge] Connected to', url)
    }

    socket.onclose = (event) => {
      updateGlobalState('disconnected', null, globalLastResponse, globalSpeechResult)
      console.log('[PC Bridge] Disconnected:', event.reason || 'No reason specified')
      globalWs = null

      // Auto-reconnect timer
      if (globalReconnectTimeout) clearTimeout(globalReconnectTimeout)
      globalReconnectTimeout = setTimeout(() => {
        connectWebSocket(url)
      }, 3000)
    }

    socket.onerror = (err) => {
      updateGlobalState('error', null, globalLastResponse, globalSpeechResult)
      console.error('[PC Bridge] Socket error:', err)
    }

    socket.onmessage = (event) => {
      try {
        const msg: PcBridgeMessage = JSON.parse(event.data)
        let nextSystemData = globalSystemData
        let nextSpeechResult = globalSpeechResult

        // Handle events
        if (msg.type === 'event' && msg.event === 'connected') {
          nextSystemData = msg.data || null
        }

        if (msg.type === 'event' && msg.event === 'shortcut_executed') {
          const toastContent = msg.message || 'Shortcut executed!'
          if (typeof window !== 'undefined') {
            const { toast } = require('sonner')
            toast.success(`🎤 Voice Command: ${toastContent}`)
          }
        }

        if (msg.type === 'event' && msg.event === 'reminder' && msg.data?.text) {
          const store = useAssistantStore.getState()
          store.addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `🔔 **Reminder:** ${msg.data.text as string}`,
            timestamp: Date.now(),
          })
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Voice AI Reminder', {
              body: msg.data.text as string,
            })
          }
        }

        // Update system data from info responses
        if (msg.type === 'response' && msg.success && msg.data) {
          nextSystemData = { ...nextSystemData, ...msg.data }
        }

        if (msg.type === 'speech_result' || (msg as any).type === 'speech_result') {
          const store = useAssistantStore.getState()
          const textVal = msg.text || (msg as any).text || ''
          const isFinalVal = msg.isFinal !== undefined ? msg.isFinal : (msg as any).isFinal || false
          
          if (isFinalVal && textVal.trim()) {
            store.sendMessage(textVal.trim())
          }
          nextSpeechResult = {
            text: textVal,
            isFinal: isFinalVal
          }
        }

        updateGlobalState(globalStatus, nextSystemData, msg, nextSpeechResult)
      } catch (err) {
        // Failed to parse JSON, could be binary audio confirmation or other
      }
    }

    globalWs = socket
  } catch (err) {
    updateGlobalState('error', null, globalLastResponse, globalSpeechResult)
    console.error('[PC Bridge] Connection error:', err)
  }
}

export function usePcBridge() {
  const [status, setStatus] = useState<BridgeStatus>(globalStatus)
  const [systemData, setSystemData] = useState<Record<string, unknown> | null>(globalSystemData)
  const [lastResponse, setLastResponse] = useState<PcBridgeMessage | null>(globalLastResponse)
  const [speechResult, setSpeechResult] = useState<{ text: string, isFinal: boolean } | null>(globalSpeechResult)

  const bridgeUrl = useAssistantStore((s) => s.pcBridgeUrl)
  const setBridgeUrl = useAssistantStore((s) => s.setPcBridgeUrl)

  // Subscribe to changes in global state
  useEffect(() => {
    const listener = (
      newStatus: BridgeStatus,
      newSysData: Record<string, unknown> | null,
      newLastRes: PcBridgeMessage | null,
      newSpeechRes: { text: string, isFinal: boolean } | null
    ) => {
      setStatus(newStatus)
      setSystemData(newSysData)
      setLastResponse(newLastRes)
      setSpeechResult(newSpeechRes)
    }

    stateListeners.add(listener)
    // Synchronize initial state
    setStatus(globalStatus)
    setSystemData(globalSystemData)
    setLastResponse(globalLastResponse)
    setSpeechResult(globalSpeechResult)

    return () => {
      stateListeners.delete(listener)
    }
  }, [])

  // Auto-connect when bridgeUrl changes or when initialized
  useEffect(() => {
    if (bridgeUrl) {
      connectWebSocket(bridgeUrl)
    } else {
      cleanupSocket()
      updateGlobalState('disconnected', null, null, null)
    }
  }, [bridgeUrl])

  // Request notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const connect = useCallback(() => {
    if (bridgeUrl) {
      connectWebSocket(bridgeUrl)
    }
  }, [bridgeUrl])

  const disconnect = useCallback(() => {
    cleanupSocket()
    updateGlobalState('disconnected', null, null, null)
  }, [])

  const sendCommand = useCallback(
    (category: string, action: string, params: Record<string, unknown> = {}) => {
      return new Promise<PcBridgeMessage>((resolve) => {
        if (!globalWs || globalWs.readyState !== WebSocket.OPEN) {
          resolve({ type: 'error', message: 'Not connected to PC Bridge' })
          return
        }

        const id = crypto.randomUUID()
        const command = { id, category, action, params }
        const wsRef = globalWs // Capture reference to current socket

        const label = `${category}/${action}`
        const friendlyLabels: Record<string, string> = {
          'file/create': '📄 Creating file...',
          'file/create_folder': '📁 Creating folder...',
          'file/edit': '📝 Editing file...',
          'file/delete': '🗑️ Deleting file...',
          'file/search': '🔍 Searching files...',
          'file/find': '🔍 Searching files...',
          'system/open_camera': '📷 Opening Camera...',
          'wifi/on': '📶 Enabling WiFi...',
          'wifi/off': '📶 Disabling WiFi...',
          'app/open': '🚀 Opening App...',
          'app/close': '❌ Closing App...',
          'volume/set': '🔊 Adjusting volume...',
          'volume/up': '🔊 Turning volume up...',
          'volume/down': '🔉 Turning volume down...',
          'tts/speak': '🗣️ Speaking...',
        }
        const actionText = friendlyLabels[label] || `🛠️ Running: ${label}...`
        const store = useAssistantStore.getState()
        if (store && store.setCurrentCommandText) {
          store.setCurrentCommandText(actionText)
        }

        const handler = (event: MessageEvent) => {
          try {
            const msg: any = JSON.parse(event.data)
            if ((msg.type === 'response' || msg.type === 'error') && msg.id === id) {
              wsRef.removeEventListener('message', handler)
              if (store && store.setCurrentCommandText) {
                store.setCurrentCommandText(`✅ Done: ${action}`)
                setTimeout(() => {
                  if (store.currentCommandText === `✅ Done: ${action}`) {
                    store.setCurrentCommandText('')
                  }
                }, 3000)
              }
              resolve(msg)
            }
          } catch {
            // ignore parse errors
          }
        }

        wsRef.addEventListener('message', handler)
        wsRef.send(JSON.stringify(command))

        // Timeout after 10 seconds
        setTimeout(() => {
          wsRef.removeEventListener('message', handler)
          if (store && store.setCurrentCommandText) {
            store.setCurrentCommandText(`❌ Timeout: ${action}`)
            setTimeout(() => {
              store.setCurrentCommandText('')
            }, 3000)
          }
          resolve({ type: 'error', message: 'Command timed out' })
        }, 10000)
      })
    },
    []
  )

  const sendAudioChunk = useCallback((chunk: ArrayBuffer | Blob) => {
    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
      globalWs.send(chunk)
    }
  }, [])

  const speakText = useCallback(async (text: string) => {
    try {
      const voice = useAssistantStore.getState().ttsVoice || 'hi-IN-SwaraNeural'
      const ttsEngine = useAssistantStore.getState().ttsEngine || 'edge_tts'
      const res: any = await sendCommand('tts', 'speak', { text, voice, engine: ttsEngine })
      const audioData = res.audio || res.data?.audio
      if (audioData) {
        const format = res.format || 'mp3'
        const audioUrl = `data:audio/${format};base64,${audioData}`
        const audio = new Audio(audioUrl)
        audio.play().catch(e => console.error("Error playing TTS:", e))
      }
    } catch (e) {
      console.error("speakText failed:", e)
    }
  }, [sendCommand])

  return {
    status,
    bridgeUrl,
    setBridgeUrl,
    connect,
    disconnect,
    sendCommand,
    sendAudioChunk,
    speakText,
    lastResponse,
    systemData,
    speechResult,
    isConnected: status === 'connected',
  }
}
