'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Mic, MicOff } from 'lucide-react'
import { useAssistantStore } from '@/store/assistant-store'
import { cn } from '@/lib/utils'
import { QuickActions } from './quick-actions'

export function VoiceButton() {
  const { status, setStatus, sendAudioChunk, micVolume, setMicVolume } = useAssistantStore()
  const [isRecording, setIsRecording] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    setIsRecording(false)
    setStatus('idle')
    setMicVolume(0)
  }, [setStatus, setMicVolume])

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording()
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
        const source = audioContext.createMediaStreamSource(stream)
        const processor = audioContext.createScriptProcessor(4096, 1, 1)

        source.connect(processor)
        processor.connect(audioContext.destination)

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0)

          // Calculate RMS volume level
          let sum = 0
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i]
          }
          const rms = Math.sqrt(sum / inputData.length)
          const volume = Math.min(100, Math.round(rms * 400))
          setMicVolume(volume)

          if (!sendAudioChunk) return
          // Convert float32 to int16 PCM
          const pcm16 = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            let s = Math.max(-1, Math.min(1, inputData[i]))
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
          sendAudioChunk(pcm16.buffer)
        }

        audioContextRef.current = audioContext
        streamRef.current = stream
        processorRef.current = processor

        setIsRecording(true)
        setStatus('listening')
      } catch (err) {
        console.error("Failed to access microphone", err)
        alert("Microphone access denied or not available.")
      }
    }
  }, [isRecording, setStatus, sendAudioChunk, stopRecording, setMicVolume])

  return (
    <div className="relative">
      {isRecording && (
        <motion.div
          animate={{
            scale: 1 + (micVolume / 100) * 0.7,
            opacity: 0.3 + (micVolume / 100) * 0.4
          }}
          transition={{ duration: 0.1 }}
          className="absolute inset-0 rounded-full bg-cyan-400/30 pointer-events-none"
        />
      )}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleRecording}
        className={cn(
          'relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300',
          isRecording
            ? 'bg-gradient-to-br from-cyan-400 to-purple-500 text-white shadow-lg shadow-cyan-500/30'
            : 'glass-card text-muted-foreground hover:text-white hover:bg-white/10'
        )}
      >
        {isRecording ? (
          <Mic className="w-5 h-5 animate-pulse" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </motion.button>

      {/* Dynamic Waveform Equalizer when recording */}
      {isRecording && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-end gap-0.5 px-2 py-0.5 rounded-full bg-[#0a0a1a]/85 backdrop-blur-sm border border-cyan-500/20 shadow-md">
          {[...Array(7)].map((_, i) => {
            // Give each bar a slightly different response factor
            const factor = 0.3 + (i % 3) * 0.25
            const height = Math.max(4, Math.min(22, Math.round(micVolume * factor)))
            return (
              <motion.div
                key={i}
                className="w-0.5 bg-gradient-to-t from-cyan-400 to-purple-500 rounded-full transition-all duration-75 ease-out"
                style={{ height: `${height}px` }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ChatInput() {
  const [input, setInput] = useState('')
  const { sendMessage, status, speechResult, setSpeechResult } = useAssistantStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync speech result to input
  useEffect(() => {
    if (speechResult) {
      if (speechResult.isFinal) {
        // Send immediately or append
        sendMessage(speechResult.text)
        setInput('')
        setSpeechResult(null)
      } else {
        setInput(speechResult.text)
      }
    }
  }, [speechResult, sendMessage, setSpeechResult])

  const handleSubmit = useCallback(() => {
    if (!input.trim() || status === 'thinking') return
    sendMessage(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, status, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  return (
    <div className="p-4 border-t border-white/5">
      <div className="max-w-3xl mx-auto space-y-3">
        <QuickActions />
        <div className="glass-card-strong flex items-end gap-3 p-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or ask anything..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground/60 min-h-[36px] max-h-[120px] py-1.5"
            disabled={status === 'thinking'}
          />
          <VoiceButton />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!input.trim() || status === 'thinking'}
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300',
              input.trim()
                ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-white/5 text-muted-foreground'
            )}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
