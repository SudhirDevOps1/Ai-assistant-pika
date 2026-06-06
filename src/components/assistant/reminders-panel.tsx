'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Bell, Clock } from 'lucide-react'
import { useAssistantStore, type Reminder } from '@/store/assistant-store'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

function CountdownTimer({ expiresAt }: { expiresAt: number }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = expiresAt - Date.now()
      if (diff <= 0) {
        setTimeLeft('Expired')
        return
      }
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${minutes}m ${seconds}s`)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const isExpired = expiresAt - Date.now() <= 0

  return (
    <span className={`text-xs font-mono ${isExpired ? 'text-red-400' : 'text-cyan-400'}`}>
      {timeLeft}
    </span>
  )
}

export function RemindersPanel() {
  const { reminders, addReminder, removeReminder } = useAssistantStore()
  const [text, setText] = useState('')
  const [duration, setDuration] = useState('5')

  const handleAdd = async () => {
    if (!text.trim()) return
    const dur = parseInt(duration, 10)
    if (!dur || dur <= 0) return

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), duration: dur }),
      })
      const data = await res.json()
      if (data.reminder) {
        addReminder(data.reminder)
        setText('')
        toast.success('Reminder added!')
      }
    } catch {
      toast.error('Failed to add reminder')
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' })
      removeReminder(id)
      toast.success('Reminder removed')
    } catch {
      toast.error('Failed to remove reminder')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Reminders
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your reminders with live countdowns</p>
        </motion.div>

        {/* Add Reminder */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 space-y-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold">Add Reminder</h3>
          </div>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What to remind you about?"
            className="bg-white/5 border-white/10 text-sm h-10"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Duration"
                className="bg-white/5 border-white/10 text-sm h-9"
                min={1}
              />
            </div>
            <select
              value="minutes"
              disabled
              className="px-3 h-9 glass-card rounded-lg text-xs text-muted-foreground bg-transparent outline-none"
            >
              <option value="minutes">minutes</option>
            </select>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAdd}
              className="px-4 h-9 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Add
            </motion.button>
          </div>
        </motion.div>

        {/* Reminder List */}
        <div className="space-y-3">
          <AnimatePresence>
            {reminders.map((reminder) => (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                className="glass-card p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400/20 to-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bell className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{reminder.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <CountdownTimer expiresAt={reminder.expiresAt} />
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleRemove(reminder.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>

          {reminders.length === 0 && (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No active reminders</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add a reminder to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
