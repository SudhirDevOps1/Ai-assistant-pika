'use client'

import { useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAssistantStore } from '@/store/assistant-store'
import { ChatBubble, TypingIndicator } from './chat-bubble'
import { AvatarCharacter } from './avatar-character'

export function ChatArea() {
  const { messages, status, sendMessage } = useAssistantStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, status])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning, sweetie! 🌸'
    if (hour < 17) return 'Good afternoon, dear! ☀️'
    return 'Good evening, yaara! ✨'
  }, [])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-6 max-w-md flex flex-col items-center"
        >
          <AvatarCharacter size="lg" interactive={true} />
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              {greeting}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
              I am Pika, your personal AI companion. How can I help you control your PC or chat today?
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {[
              { label: 'Tell me a joke 🎭', prompt: 'Tell me a funny joke' },
              { label: 'Open YouTube 🎬', prompt: 'Open YouTube for me' },
              { label: 'System info 🖥️', prompt: 'Give me the system information' },
              { label: 'Hindi translation 🇮🇳', prompt: 'How do you say "Hello, how are you?" in Hindi?' }
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => sendMessage(item.prompt)}
                disabled={status === 'thinking'}
                className="px-3.5 py-2 text-xs glass-card rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95 disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4"
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        {status === 'thinking' && <TypingIndicator />}
      </div>
    </div>
  )
}
