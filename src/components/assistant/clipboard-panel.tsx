'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Plus, Trash2, ClipboardList, XCircle } from 'lucide-react'
import { useAssistantStore } from '@/store/assistant-store'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useState } from 'react'

export function ClipboardPanel() {
  const { clipboardItems, addClipboardItem, removeClipboardItem, clearClipboard } = useAssistantStore()
  const [newItem, setNewItem] = useState('')

  const handleAdd = async () => {
    if (!newItem.trim()) return
    try {
      const res = await fetch('/api/clipboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newItem.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        addClipboardItem(newItem.trim())
        setNewItem('')
        toast.success('Item added to clipboard')
      }
    } catch {
      toast.error('Failed to add item')
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const handleRemove = async (index: number) => {
    try {
      await fetch(`/api/clipboard?index=${index}`, { method: 'DELETE' })
      removeClipboardItem(index)
    } catch {
      toast.error('Failed to remove item')
    }
  }

  const handleClear = async () => {
    try {
      await fetch('/api/clipboard?action=clear', { method: 'DELETE' })
      clearClipboard()
      toast.success('Clipboard cleared')
    } catch {
      toast.error('Failed to clear clipboard')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Clipboard Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your clipboard items</p>
        </motion.div>

        {/* Add Item */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 space-y-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold">Add Item</h3>
          </div>
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Text to add to clipboard..."
              className="bg-white/5 border-white/10 text-sm h-10"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAdd}
              className="px-4 h-10 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition-opacity shrink-0"
            >
              Add
            </motion.button>
          </div>
        </motion.div>

        {/* Clear All */}
        {clipboardItems.length > 0 && (
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClear}
              className="px-3 py-1.5 text-xs glass-card rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              Clear All
            </motion.button>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-2">
          <AnimatePresence>
            {clipboardItems.map((item, index) => (
              <motion.div
                key={`${item}-${index}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-3 flex items-center justify-between gap-3 group"
              >
                <p className="text-sm text-muted-foreground truncate flex-1">{item}</p>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleCopy(item)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleRemove(index)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {clipboardItems.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No clipboard items</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add items manually</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
