'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useAssistantStore } from '@/store/assistant-store'

export interface PcBridgeMessage {
  type: 'response' | 'event' | 'error'
  event?: string
  success?: boolean
  message?: string
  data?: Record<string, unknown>
  category?: string
  action?: string
}

export type BridgeStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export function usePcBridge() {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null)
  const bridgeUrlRef = useRef<string>('')
  const [status, setStatus] = useState<BridgeStatus>('disconnected')
  const bridgeUrl = useAssistantStore((s) => s.pcBridgeUrl)
  const setBridgeUrl = useAssistantStore((s) => s.setPcBridgeUrl)
  const [lastResponse, setLastResponse] = useState<PcBridgeMessage | null>(null)
  const [systemData, setSystemData] = useState<Record<string, unknown> | null>(null)
  const [speechResult, setSpeechResult] = useState<{ text: string, isFinal: boolean } | null>(null)

  // Keep ref in sync with store value — using useEffect to satisfy lint
  useEffect(() => {
    bridgeUrlRef.current = bridgeUrl
  }, [bridgeUrl])

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = null
    }
    if (ws.current) {
      ws.current.close()
      ws.current = null
    }
    setStatus('disconnected')
  }, [])

  const connect = useCallback(() => {
    const url = bridgeUrlRef.current
    if (!url || ws.current?.readyState === WebSocket.OPEN) return

    // Clean up existing
    if (ws.current) {
      ws.current.close()
      ws.current = null
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = null
    }

    setStatus('connecting')

    try {
      const socket = new WebSocket(url)

      socket.onopen = () => {
        setStatus('connected')
        console.log('[PC Bridge] Connected to', url)
      }

      socket.onclose = () => {
        setStatus('disconnected')
        console.log('[PC Bridge] Disconnected')
        ws.current = null
        // Auto reconnect after 3 seconds using ref
        reconnectTimeout.current = setTimeout(() => {
          if (bridgeUrlRef.current) {
            // Reconnect by creating a new connection
            const retryUrl = bridgeUrlRef.current
            if (retryUrl) {
              setStatus('connecting')
              try {
                const retrySocket = new WebSocket(retryUrl)
                retrySocket.onopen = () => {
                  setStatus('connected')
                  console.log('[PC Bridge] Reconnected to', retryUrl)
                }
                retrySocket.onclose = () => {
                  setStatus('disconnected')
                  ws.current = null
                }
                retrySocket.onerror = () => {
                  setStatus('error')
                }
                retrySocket.onmessage = (event) => {
                  try {
                    const msg: PcBridgeMessage = JSON.parse(event.data)
                    setLastResponse(msg)
                    if (msg.type === 'event' && msg.event === 'connected') {
                      setSystemData(msg.data || null)
                    }
                    if (msg.type === 'event' && msg.event === 'reminder' && msg.data?.text) {
                      const store = useAssistantStore.getState()
                      store.addMessage({
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: `🔔 **Reminder:** ${msg.data.text as string}`,
                        timestamp: Date.now(),
                      })
                      if (Notification.permission === 'granted') {
                        new Notification('Voice AI Reminder', {
                          body: msg.data.text as string,
                        })
                      }
                    }
                    if (msg.type === 'response' && msg.success && msg.data) {
                      setSystemData((prev) => ({ ...prev, ...msg.data }))
                    }
                  } catch {
                    console.error('[PC Bridge] Failed to parse message')
                  }
                }
                ws.current = retrySocket
              } catch {
                setStatus('error')
              }
            }
          }
        }, 3000)
      }

      socket.onerror = () => {
        setStatus('error')
        console.error('[PC Bridge] Connection error')
      }

      socket.onmessage = (event) => {
        try {
          const msg: PcBridgeMessage = JSON.parse(event.data)
          setLastResponse(msg)

          // Handle events
          if (msg.type === 'event' && msg.event === 'connected') {
            setSystemData(msg.data || null)
          }
          if (msg.type === 'event' && msg.event === 'reminder' && msg.data?.text) {
            const store = useAssistantStore.getState()
            store.addMessage({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `🔔 **Reminder:** ${msg.data.text as string}`,
              timestamp: Date.now(),
            })
            if (Notification.permission === 'granted') {
              new Notification('Voice AI Reminder', {
                body: msg.data.text as string,
              })
            }
          }

          // Update system data from info responses
          if (msg.type === 'response' && msg.success && msg.data) {
            setSystemData((prev) => ({ ...prev, ...msg.data }))
          }

          if (msg.type === 'speech_result') {
            const store = useAssistantStore.getState()
            if ((msg as any).isFinal && (msg as any).text.trim()) {
              store.sendMessage((msg as any).text.trim())
            }
            setSpeechResult({
              text: (msg as any).text || '',
              isFinal: (msg as any).isFinal || false
            })
          }
        } catch {
          // If it fails to parse JSON, it might be binary or something else
        }
      }

      ws.current = socket
    } catch (err) {
      setStatus('error')
      console.error('[PC Bridge] Failed to connect:', err)
    }
  }, [])

  const sendCommand = useCallback(
    (category: string, action: string, params: Record<string, unknown> = {}) => {
      return new Promise<PcBridgeMessage>((resolve) => {
        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
          resolve({ type: 'error', message: 'Not connected to PC Bridge' })
          return
        }

        const id = crypto.randomUUID()
        const command = { id, category, action, params }
        ws.current.send(JSON.stringify(command))

        // Set up one-time listener for response
        const handler = (event: MessageEvent) => {
          try {
            const msg: PcBridgeMessage = JSON.parse(event.data)
            if (msg.type === 'response' || msg.type === 'error') {
              resolve(msg)
            }
          } catch {
            // ignore parse errors
          }
        }

        ws.current.addEventListener('message', handler)

        // Timeout after 10 seconds
        setTimeout(() => {
          ws.current?.removeEventListener('message', handler)
          resolve({ type: 'error', message: 'Command timed out' })
        }, 10000)
      })
    },
    []
  )

  // Auto-connect when bridgeUrl changes and is set
  useEffect(() => {
    // Cleanup function for effect
    const cleanup = () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = null
      }
      if (ws.current) {
        ws.current.close()
        ws.current = null
      }
    }

    if (!bridgeUrl) {
      cleanup()
      return cleanup
    }

    // Directly set up WebSocket connection
    if (ws.current?.readyState === WebSocket.OPEN) return cleanup

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = null
    }

    const url = bridgeUrl
    try {
      const socket = new WebSocket(url)

      socket.onopen = () => {
        setStatus('connected')
      }

      socket.onclose = () => {
        setStatus('disconnected')
        ws.current = null
        reconnectTimeout.current = setTimeout(() => {
          if (bridgeUrlRef.current) {
            setStatus('connecting')
            try {
              const retrySocket = new WebSocket(bridgeUrlRef.current)
              retrySocket.onopen = () => setStatus('connected')
              retrySocket.onclose = () => { setStatus('disconnected'); ws.current = null }
              retrySocket.onerror = () => setStatus('error')
              retrySocket.onmessage = (event) => {
                try {
                  const msg: PcBridgeMessage = JSON.parse(event.data)
                  setLastResponse(msg)
                  if (msg.type === 'event' && msg.event === 'connected') setSystemData(msg.data || null)
                  if (msg.type === 'response' && msg.success && msg.data) setSystemData((prev) => ({ ...prev, ...msg.data }))
                } catch { /* ignore */ }
              }
              ws.current = retrySocket
            } catch { setStatus('error') }
          }
        }, 3000)
      }

      socket.onerror = () => {
        setStatus('error')
      }

      socket.onmessage = (event) => {
        try {
          const msg: PcBridgeMessage = JSON.parse(event.data)
          setLastResponse(msg)
          if (msg.type === 'event' && msg.event === 'connected') {
            setSystemData(msg.data || null)
          }
          if (msg.type === 'event' && msg.event === 'reminder' && msg.data?.text) {
            const store = useAssistantStore.getState()
            store.addMessage({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `🔔 **Reminder:** ${msg.data.text as string}`,
              timestamp: Date.now(),
            })
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('Voice AI Reminder', { body: msg.data.text as string })
            }
          }
          if (msg.type === 'response' && msg.success && msg.data) {
            setSystemData((prev) => ({ ...prev, ...msg.data }))
          }
          if (msg.type === 'speech_result') {
            setSpeechResult({
              text: (msg as any).text || '',
              isFinal: (msg as any).isFinal || false
            })
          }
        } catch { /* ignore */ }
      }

      ws.current = socket
    } catch {
      // Schedule error status update asynchronously to satisfy lint
      setTimeout(() => setStatus('error'), 0)
    }

    return cleanup
  }, [bridgeUrl])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const sendAudioChunk = useCallback((chunk: ArrayBuffer | Blob) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(chunk)
    }
  }, [])

  return {
    status,
    bridgeUrl,
    setBridgeUrl,
    connect,
    disconnect,
    sendCommand,
    sendAudioChunk,
    lastResponse,
    systemData,
    speechResult,
    isConnected: status === 'connected',
  }
}
