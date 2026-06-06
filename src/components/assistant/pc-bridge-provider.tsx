'use client'

import { useEffect } from 'react'
import { usePcBridge } from '@/hooks/use-pc-bridge'
import { useAssistantStore } from '@/store/assistant-store'

export function PcBridgeProvider({ children }: { children: React.ReactNode }) {
  const { sendCommand, sendAudioChunk, speechResult } = usePcBridge()
  const setExecuteCommand = useAssistantStore((s) => s.setExecuteCommand)
  const setSendAudioChunk = useAssistantStore((s) => s.setSendAudioChunk)
  const setSpeechResult = useAssistantStore((s) => s.setSpeechResult)

  useEffect(() => {
    setExecuteCommand(sendCommand)
    setSendAudioChunk(sendAudioChunk)
    setSpeechResult(speechResult)
    return () => {
      setExecuteCommand(null)
      setSendAudioChunk(null)
      // We don't reset speechResult on unmount to prevent flickering if it re-renders
    }
  }, [sendCommand, setExecuteCommand, sendAudioChunk, setSendAudioChunk, speechResult, setSpeechResult])

  return <>{children}</>
}
