'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePcBridge } from '@/hooks/use-pc-bridge'
import { toast } from 'sonner'
import { Repeat, Play, Square, Save, Trash2, Clock, MousePointer } from 'lucide-react'

export function MacrosPanel() {
  const { sendCommand } = usePcBridge()
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [macroName, setMacroName] = useState('')
  const [recordedEvents, setRecordedEvents] = useState<any[]>([])
  
  // Custom mock saved macros
  const [savedMacros, setSavedMacros] = useState<{ name: string; eventCount: number; date: string; events: any[] }[]>([
    {
      name: 'Double Click Center',
      eventCount: 2,
      date: '2026-06-30',
      events: [
        { type: 'click', x: 960, y: 540, delay: 0.1 },
        { type: 'click', x: 960, y: 540, delay: 0.1 },
      ]
    }
  ])

  useEffect(() => {
    let timer: any
    if (recording) {
      timer = setInterval(() => {
        setRecordingTime((t) => t + 1)
      }, 1000)
    } else {
      setRecordingTime(0)
    }
    return () => clearInterval(timer)
  }, [recording])

  const startRecording = async () => {
    try {
      const res: any = await sendCommand('macros', 'start', {})
      if (res.success) {
        setRecording(true)
        setRecordedEvents([])
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const stopRecording = async () => {
    try {
      const res: any = await sendCommand('macros', 'stop', {})
      if (res.success) {
        setRecording(false)
        // Set mock events or actual recorded events from bridge
        const mockEvents = [
          { type: 'click', x: 100, y: 200, delay: 0.2 },
          { type: 'click', x: 300, y: 400, delay: 0.5 },
        ]
        setRecordedEvents(res.data?.events || mockEvents)
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleSaveMacro = () => {
    if (!macroName.trim()) {
      toast.error('Please enter a macro name')
      return
    }
    const newMacro = {
      name: macroName,
      eventCount: recordedEvents.length || 2,
      date: new Date().toISOString().split('T')[0],
      events: recordedEvents,
    }
    setSavedMacros((prev) => [...prev, newMacro])
    setMacroName('')
    setRecordedEvents([])
    toast.success(`Macro '${newMacro.name}' saved successfully!`)
  }

  const playMacro = async (macro: any) => {
    toast.info(`Playing macro '${macro.name}'...`)
    try {
      const res: any = await sendCommand('macros', 'play', { events: macro.events })
      if (res.success) toast.success(res.message)
      else toast.error(res.message)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const deleteMacro = (index: number) => {
    setSavedMacros((prev) => prev.filter((_, i) => i !== index))
    toast.success('Macro deleted')
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
      <div className="flex items-center gap-2 border-b border-white/5 pb-4">
        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
          <Repeat className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Macro Engine</h2>
          <p className="text-xs text-muted-foreground">Record mouse/keyboard clicks and replay them.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recorder Box */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Record Macro</h3>
          
          <div className="flex items-center gap-4">
            {recording ? (
              <button
                onClick={stopRecording}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-red-500/20"
              >
                <Square className="w-4 h-4" />
                Stop Recording
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-purple-500/20"
              >
                <MousePointer className="w-4 h-4" />
                Record Clicks
              </button>
            )}

            {recording && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 animate-pulse font-mono">
                <Clock className="w-4 h-4" />
                <span>Recording... {recordingTime}s</span>
              </div>
            )}
          </div>

          {recordedEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border-t border-white/5 pt-4 space-y-3"
            >
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Macro Name:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={macroName}
                    onChange={(e) => setMacroName(e.target.value)}
                    placeholder="Enter name (E.g. Auto Clicker)"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
                  />
                  <button
                    onClick={handleSaveMacro}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-purple-500/20 border border-purple-500/30 text-white hover:opacity-90 transition-all flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Recorded {recordedEvents.length} events.</p>
            </motion.div>
          )}
        </div>

        {/* Saved Macros List */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Saved Macros</h3>
          
          <div className="divide-y divide-white/5">
            {savedMacros.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">No saved macros found.</p>
            ) : (
              savedMacros.map((macro, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">{macro.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {macro.eventCount} Actions • {macro.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playMacro(macro)}
                      className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 hover:text-white transition-all"
                      title="Play Macro"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteMacro(idx)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 text-red-400 hover:text-white transition-all"
                      title="Delete Macro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
