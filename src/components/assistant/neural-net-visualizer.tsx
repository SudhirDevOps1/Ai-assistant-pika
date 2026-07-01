'use client'

import { motion } from 'framer-motion'
import { Phone, PhoneOff, Mic, MicOff, ShieldAlert } from 'lucide-react'
import { useAssistantStore } from '@/store/assistant-store'
import { cn } from '@/lib/utils'

export function NeuralNetVisualizer() {
  const { status, setStatus } = useAssistantStore()

  const handleToggleCall = () => {
    setStatus(status === 'listening' ? 'idle' : 'listening')
  }

  return (
    <div className="flex-1 flex flex-col justify-between items-center py-6 h-full min-h-[350px]">
      {/* Upper Status Labels */}
      <div className="w-full max-w-[420px] flex items-center justify-between px-6 text-[10px] font-bold tracking-widest text-emerald-400/80 uppercase select-none">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          NEURAL_NET: READY
        </span>
        <span className="text-cyan-400/90">DELEGATION_CORE: LOADED</span>
      </div>

      {/* Main Circular Gyroscope Visualizer */}
      <div className="relative flex items-center justify-center my-4">
        {/* Animated Radial Shadows */}
        <div className="absolute w-[240px] h-[240px] rounded-full bg-emerald-500/5 blur-3xl" />
        
        {/* Orbits and Gyroscopes */}
        <svg viewBox="0 0 200 200" className="w-[260px] h-[260px] overflow-visible">
          {/* Inner Core Pulsing Grid */}
          <circle cx="100" cy="100" r="18" fill="none" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
          
          {/* Central Core Glowing Sphere */}
          <motion.circle
            cx="100"
            cy="100"
            animate={status === 'listening' ? { r: [8, 14, 8] } : status === 'thinking' ? { r: [8, 11, 8], opacity: [0.5, 1, 0.5] } : { r: 8 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            fill="#10b981"
            className="shadow-2xl shadow-emerald-400"
            style={{ filter: 'drop-shadow(0px 0px 8px #10b981)' }}
          />

          {/* Outer Gyroscope Rings */}
          <motion.circle
            cx="100"
            cy="100"
            r="45"
            fill="none"
            stroke="rgba(16, 185, 129, 0.25)"
            strokeWidth="1.2"
            strokeDasharray="4 8 20 4"
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          />

          <motion.circle
            cx="100"
            cy="100"
            r="65"
            fill="none"
            stroke="rgba(6, 182, 212, 0.2)"
            strokeWidth="1.5"
            strokeDasharray="40 10 90 20"
            animate={{ rotate: -360 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          />

          <motion.circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="rgba(16, 185, 129, 0.15)"
            strokeWidth="1"
            strokeDasharray="150 40 10 30"
            animate={{ rotate: 360 }}
            transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          />

          {/* Connective Neural Net Star Constellations */}
          <g opacity="0.6">
            <line x1="100" y1="100" x2="65" y2="70" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1" />
            <line x1="100" y1="100" x2="135" y2="70" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1" />
            <line x1="100" y1="100" x2="100" y2="160" stroke="rgba(6, 182, 212, 0.25)" strokeWidth="1" />
            
            {/* Satellite Nodes revolving on orbits */}
            <motion.circle cx="65" cy="70" r="3.5" fill="#10b981" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <motion.circle cx="135" cy="70" r="3.5" fill="#06b6d4" animate={{ scale: [1.3, 0.9, 1.3] }} transition={{ duration: 2.3, repeat: Infinity }} />
            <motion.circle cx="100" cy="160" r="4" fill="#10b981" />
          </g>
        </svg>
      </div>

      {/* Lower Readout Labels */}
      <div className="w-full max-w-[420px] flex items-center justify-between px-6 text-[10px] font-bold tracking-widest text-emerald-500/70 uppercase select-none">
        <span>UI_REACTION: 0.02s</span>
        <span className="text-cyan-500/70 animate-pulse">LIVE_STREAM: COMPILING</span>
      </div>

      {/* Interactive Control Buttons */}
      <div className="flex items-center gap-6 mt-5">
        {/* Record/Mute Toggle Control */}
        <button
          onClick={handleToggleCall}
          className={cn(
            "w-12 h-12 rounded-full border border-red-500/30 bg-slate-950/60 hover:bg-red-500/10 flex items-center justify-center transition-all shadow-lg active:scale-95",
            status === 'listening' ? "border-cyan-500 text-cyan-400 bg-cyan-500/5 animate-pulse" : "text-red-400/90"
          )}
          title="Toggle Mic Recording"
        >
          {status === 'listening' ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Core Connect Voice Call Button */}
        <button
          onClick={handleToggleCall}
          className={cn(
            "w-16 h-16 rounded-full border flex items-center justify-center transition-all shadow-xl active:scale-95",
            status === 'listening'
              ? "bg-red-500 border-red-400 text-white hover:bg-red-600 shadow-red-500/20"
              : "bg-emerald-500/15 border-emerald-500 text-emerald-400 hover:bg-emerald-500/30 shadow-emerald-500/10"
          )}
          title={status === 'listening' ? "Hangup Voice Stream" : "Connect Voice Stream"}
        >
          {status === 'listening' ? (
            <PhoneOff className="w-6 h-6 animate-bounce" />
          ) : (
            <Phone className="w-6 h-6" />
          )}
        </button>

        {/* System Settings / Dashboard Shortcut */}
        <button
          onClick={() => {
            const el = document.getElementById('sidebar-settings-btn')
            if (el) el.click()
          }}
          className="w-12 h-12 rounded-full border border-white/5 bg-slate-950/60 hover:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-white transition-all shadow-lg active:scale-95"
          title="Open Settings Dashboard"
        >
          <PhoneOff className="w-5 h-5 opacity-40 rotate-[135deg]" />
        </button>
      </div>
    </div>
  )
}
