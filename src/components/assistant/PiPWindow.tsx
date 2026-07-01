'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Maximize2, Mic, MicOff, Move, Sparkles, Activity } from 'lucide-react'
import { useAssistantStore } from '@/store/assistant-store'
import { cn } from '@/lib/utils'

export function PiPWindow() {
  const { status, setStatus, pipMode, setPipMode, messages, currentCommandText } = useAssistantStore()
  const [minimized, setMinimized] = useState(false)
  
  // Get last message content to show live action
  const lastMessage = messages[messages.length - 1]
  const statusTexts: Record<string, string> = {
    listening: 'सुन रहा हूँ...',
    thinking: 'सोच रहा हूँ...',
    speaking: 'बोल रहा हूँ...',
    idle: 'तैयार हूँ (Hey Pika)',
  }

  const currentStatusText = statusTexts[status] || statusTexts.idle

  if (!pipMode) return null

  // If minimized, show a tiny pulsing circular button
  if (minimized) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed z-50 bottom-5 right-5 cursor-grab active:cursor-grabbing"
      >
        <button
          onClick={() => setMinimized(false)}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center border shadow-lg transition-all",
            status === 'listening' ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 animate-pulse" :
            status === 'thinking' ? "bg-purple-500/20 border-purple-500 text-purple-400 animate-spin" :
            status === 'speaking' ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 animate-bounce" :
            "bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
          )}
          title="Restore PiP Window"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={{ left: 0, right: 800, top: 0, bottom: 600 }}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      className="fixed z-50 bottom-5 right-5 w-[290px] h-[135px] rounded-2xl border border-white/10 bg-[#070b19]/80 backdrop-blur-xl shadow-2xl overflow-hidden select-none flex flex-col justify-between p-3.5"
    >
      {/* Title Bar / Drag Handler */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 drag-handle">
          <Move className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="text-[11px] font-bold tracking-wider uppercase text-cyan-400/90 flex items-center gap-1">
            PIKA PiP Mode
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
            title="Minimize to Dot"
          >
            <span className="block w-2.5 h-0.5 bg-current" />
          </button>
          <button
            onClick={() => setPipMode(false)}
            className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-red-400 transition-colors"
            title="Close PiP Window"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Live Status and Waveform Indicator */}
      <div className="flex-1 flex items-center justify-between py-2">
        <div className="flex flex-col gap-0.5 max-w-[190px]">
          <span className={cn(
            "text-xs font-semibold flex items-center gap-1.5",
            status === 'listening' ? "text-cyan-400" :
            status === 'thinking' ? "text-purple-400" :
            status === 'speaking' ? "text-emerald-400" :
            "text-white/90"
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full",
              status === 'listening' ? "bg-cyan-400 animate-pulse" :
              status === 'thinking' ? "bg-purple-400 animate-ping" :
              status === 'speaking' ? "bg-emerald-400 animate-bounce" :
              "bg-white/40"
            )} />
            {currentStatusText}
          </span>
          <span className={cn(
            "text-[10px] truncate w-full italic",
            currentCommandText ? "text-cyan-400 font-bold" : "text-muted-foreground/80"
          )}>
            {currentCommandText || (status === 'idle' ? 'लॉन्चर रेडी है' : lastMessage ? lastMessage.content : 'मदद के लिए तैयार...')}
          </span>
        </div>

        {/* Live Audio Waveform Simulation */}
        <div className="h-8 flex items-end gap-[3px]">
          {Array.from({ length: 7 }).map((_, idx) => (
            <motion.div
              key={idx}
              animate={status === 'listening' || status === 'speaking' ? {
                height: [4, 16 + Math.sin(idx + Date.now()) * 12, 4],
              } : { height: 4 }}
              transition={{
                duration: 0.6 + idx * 0.1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={cn(
                "w-[3px] rounded-full",
                status === 'listening' ? "bg-cyan-400" :
                status === 'speaking' ? "bg-emerald-400" :
                "bg-white/10"
              )}
            />
          ))}
        </div>
      </div>

      {/* Mic Quick Toggle Control */}
      <div className="pt-1.5 flex items-center justify-between border-t border-white/5">
        <div className="text-[9px] text-muted-foreground/60">
          Hold click on bar to drag
        </div>
        <button
          onClick={() => setStatus(status === 'listening' ? 'idle' : 'listening')}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
            status === 'listening' 
              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
              : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
          )}
        >
          {status === 'listening' ? (
            <>
              <Mic className="w-2.5 h-2.5" />
              <span>Mic On</span>
            </>
          ) : (
            <>
              <MicOff className="w-2.5 h-2.5" />
              <span>Mic Off</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}
