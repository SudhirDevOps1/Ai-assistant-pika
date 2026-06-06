'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useAssistantStore } from '@/store/assistant-store'

const quickActions = [
  { label: 'Tell me a joke 🎭', prompt: 'Tell me a funny joke' },
  { label: "What's the time? ⏰", prompt: 'What is the current time?' },
  { label: 'Open YouTube 🎬', prompt: 'Open YouTube for me' },
  { label: 'System info 🖥️', prompt: 'Give me the system information' },
  { label: 'Hindi translation 🇮🇳', prompt: 'How do you say "Hello, how are you?" in Hindi?' },
  { label: 'Weather 🌤️', prompt: 'What is the weather like today?' },
]

export function QuickActions() {
  const { sendMessage, status } = useAssistantStore()

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
      <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
      {quickActions.map((action) => (
        <motion.button
          key={action.label}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => sendMessage(action.prompt)}
          disabled={status === 'thinking'}
          className="px-3 py-1.5 text-xs glass-card rounded-full text-muted-foreground hover:text-white hover:bg-white/10 whitespace-nowrap transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {action.label}
        </motion.button>
      ))}
    </div>
  )
}
