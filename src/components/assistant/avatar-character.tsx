'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAssistantStore } from '@/store/assistant-store'

export type PikaExpression = 'neutral' | 'smile' | 'wink' | 'blush' | 'love' | 'sad' | 'excited' | 'thinking'

interface AvatarCharacterProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
}

export function AvatarCharacter({ size = 'md', interactive = true }: AvatarCharacterProps) {
  const { status, messages } = useAssistantStore()
  const [expression, setExpression] = useState<PikaExpression>('neutral')
  const [blink, setBlink] = useState(false)

  // Size mapping
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-24 h-24',
    lg: 'w-40 h-40',
    xl: 'w-56 h-56',
  }

  // Periodic blinking effect
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 150)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Analyze last assistant message to determine Pika's expression
  const lastMessage = useMemo(() => {
    const assistantMsgs = messages.filter((m) => m.role === 'assistant')
    return assistantMsgs[assistantMsgs.length - 1]?.content || ''
  }, [messages])

  useEffect(() => {
    if (status === 'listening') {
      setExpression('excited')
      return
    }
    if (status === 'thinking') {
      setExpression('thinking')
      return
    }

    if (!lastMessage) {
      setExpression('neutral')
      return
    }

    const text = lastMessage.toLowerCase()

    // Determine expression based on message content
    if (text.includes('🥰') || text.includes('😘') || text.includes('love you') || text.includes('pyar') || text.includes('caring')) {
      setExpression('love')
    } else if (text.includes('😉') || text.includes('wink') || text.includes('naughty')) {
      setExpression('wink')
    } else if (text.includes('😊') || text.includes('blush') || text.includes('shy') || text.includes('dear') || text.includes('sweetie')) {
      setExpression('blush')
    } else if (text.includes('🥺') || text.includes('sorry') || text.includes('sad') || text.includes('error') || text.includes('failed')) {
      setExpression('sad')
    } else if (text.includes('😄') || text.includes('😆') || text.includes('joke') || text.includes('giggle') || text.includes('haha')) {
      setExpression('excited')
    } else if (text.includes('🤔') || text.includes('analyse') || text.includes('calculat')) {
      setExpression('thinking')
    } else {
      setExpression('smile')
    }
  }, [lastMessage, status])

  // Get colors based on state
  const getThemeColors = () => {
    switch (status) {
      case 'listening':
        return {
          glow: 'rgba(34, 211, 238, 0.4)', // cyan
          border: 'border-cyan-400',
          gradient: 'from-cyan-400 to-emerald-400',
        }
      case 'thinking':
        return {
          glow: 'rgba(234, 179, 8, 0.4)', // yellow/amber
          border: 'border-yellow-400',
          gradient: 'from-amber-400 to-purple-500',
        }
      case 'speaking':
        return {
          glow: 'rgba(168, 85, 247, 0.4)', // purple
          border: 'border-purple-400',
          gradient: 'from-purple-400 to-pink-500',
        }
      case 'idle':
      default:
        return {
          glow: 'rgba(34, 197, 94, 0.25)', // green
          border: 'border-green-400/40',
          gradient: 'from-cyan-500 via-purple-500 to-pink-500',
        }
    }
  }

  const colors = getThemeColors()

  // Eyes SVG paths based on expressions
  const renderEyes = () => {
    if (blink && expression !== 'wink') {
      return (
        <>
          {/* Closed eyes for blinking */}
          <line x1="28" y1="40" x2="38" y2="40" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="62" y1="40" x2="72" y2="40" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
        </>
      )
    }

    switch (expression) {
      case 'love':
        return (
          <>
            {/* Heart eyes */}
            <path d="M28,38 C28,34 33,34 33,38 C33,34 38,34 38,38 C38,42 33,46 33,46 C33,46 28,42 28,38 Z" fill="#ff4b82" />
            <path d="M62,38 C62,34 67,34 67,38 C67,34 72,34 72,38 C72,42 67,46 67,46 C67,46 62,42 62,38 Z" fill="#ff4b82" />
          </>
        )
      case 'wink':
        return (
          <>
            {/* Left eye winking (arch), Right eye open */}
            <path d="M26,42 Q33,34 40,42" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="67" cy="40" r="5" fill="white" />
            <circle cx="69" cy="38" r="2" fill="black" />
          </>
        )
      case 'sad':
        return (
          <>
            {/* Worried / sad slanted eyes */}
            <path d="M26,36 Q33,42 40,38" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M60,38 Q67,42 74,36" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          </>
        )
      case 'thinking':
        return (
          <>
            {/* Swirling/confused or squinted eyes */}
            <path d="M27,37 Q33,42 39,37" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <path d="M61,37 Q67,42 73,37" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </>
        )
      case 'excited':
      case 'smile':
      case 'blush':
      default:
        return (
          <>
            {/* Happy arch eyes */}
            <path d="M26,41 Q33,32 40,41" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M60,41 Q67,32 74,41" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
          </>
        )
    }
  }

  // Mouth SVG paths based on expressions and status
  const renderMouth = () => {
    if (status === 'speaking') {
      return (
        // Talking/pulsing mouth
        <motion.ellipse
          cx="50"
          cy="58"
          rx="5"
          animate={{ ry: [2, 7, 2] }}
          transition={{ duration: 0.2, repeat: Infinity, ease: 'easeInOut' }}
          fill="white"
        />
      )
    }

    switch (expression) {
      case 'love':
        return <path d="M44,56 Q50,64 56,56" fill="none" stroke="#ff4b82" strokeWidth="3" strokeLinecap="round" />
      case 'sad':
        return <path d="M45,60 Q50,54 55,60" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      case 'excited':
        return (
          <path d="M43,54 Q50,66 57,54 Z" fill="white" />
        )
      case 'blush':
      case 'smile':
      case 'wink':
      default:
        return <path d="M44,56 Q50,61 56,56" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
    }
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* Outer pulsing glow rings */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-700 blur-xl opacity-60"
          style={{
            background: colors.glow,
            transform: 'scale(1.15)',
          }}
        />

        {status === 'listening' && (
          <div className="absolute inset-[-15px] rounded-full border border-cyan-400/30 animate-ping" />
        )}
        {status === 'speaking' && (
          <div className="absolute inset-[-20px] rounded-full border border-purple-400/20 animate-pulse" />
        )}

        {/* Pika Container */}
        <motion.div
          className={`relative ${sizeClasses[size]} rounded-full overflow-visible p-1.5 flex items-center justify-center bg-gradient-to-br ${colors.gradient} shadow-2xl`}
          animate={
            status === 'listening'
              ? { scale: [1, 1.05, 1] }
              : status === 'thinking'
              ? { rotate: [0, 5, -5, 0] }
              : { y: [0, -3, 0] }
          }
          transition={
            status === 'listening'
              ? { duration: 1.5, repeat: Infinity }
              : status === 'thinking'
              ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          {/* Bunny/Cat Ears for Pika */}
          <div className="absolute -top-4 -left-1 w-6 h-10 bg-gradient-to-t from-cyan-400 to-purple-400 rounded-full -rotate-[25deg] origin-bottom shadow-lg z-0" />
          <div className="absolute -top-4 -right-1 w-6 h-10 bg-gradient-to-t from-purple-400 to-pink-500 rounded-full rotate-[25deg] origin-bottom shadow-lg z-0" />

          {/* Character Face Panel */}
          <div className="w-full h-full rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center relative overflow-hidden z-10 border border-white/10">
            {/* Grid background on face */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />

            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Cute Blush (always visible for blush/love, faint for others) */}
              {(expression === 'blush' || expression === 'love' || expression === 'excited') && (
                <>
                  <circle cx="25" cy="49" r="6" fill="#ff4b82" opacity="0.45" className="blur-[1px]" />
                  <circle cx="75" cy="49" r="6" fill="#ff4b82" opacity="0.45" className="blur-[1px]" />
                </>
              )}

              {/* Eyes */}
              {renderEyes()}

              {/* Mouth */}
              {renderMouth()}
            </svg>
          </div>
        </motion.div>
      </div>

      {interactive && (
        <span className="text-[10px] mt-2 font-mono tracking-widest text-muted-foreground/60 uppercase">
          pika :: {expression}
        </span>
      )}
    </div>
  )
}
