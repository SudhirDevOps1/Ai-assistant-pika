'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Save, Volume2, Zap, Terminal } from 'lucide-react'
import { useAssistantStore } from '@/store/assistant-store'
import { providerModels, providerNames } from '@/lib/model-catalog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

export function SettingsPanel() {
  const {
    provider,
    model,
    setProvider,
    setModel,
    apiKeys,
    setApiKey,
    autoFallback,
    setAutoFallback,
    conversationLimit,
    setConversationLimit,
    wakeWord,
    setWakeWord,
    ttsVoice,
    setTtsVoice,
    pcBridgeUrl,
    setPcBridgeUrl,
  } = useAssistantStore()
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [localTtsVoice, setLocalTtsVoice] = useState(ttsVoice)
  const [localWakeWord, setLocalWakeWord] = useState(wakeWord)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!loaded) {
      fetch('/api/config')
        .then((r) => r.json())
        .then((data) => {
          if (data.provider) setProvider(data.provider)
          if (data.model) setModel(data.model)
          if (data.apiKeys) {
            Object.entries(data.apiKeys).forEach(([k, v]) => setApiKey(k, v as string))
          }
          if (data.autoFallback !== undefined) setAutoFallback(data.autoFallback)
          if (data.conversationLimit) setConversationLimit(data.conversationLimit)
          if (data.wakeWord) setWakeWord(data.wakeWord)
          if (data.ttsVoice) {
            setTtsVoice(data.ttsVoice)
            setLocalTtsVoice(data.ttsVoice)
          }
          setLoaded(true)
        })
        .catch(() => setLoaded(true))
    }
  }, [loaded, setProvider, setModel, setApiKey, setAutoFallback, setConversationLimit, setWakeWord, setTtsVoice])

  const handleSave = async () => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          apiKeys,
          ttsVoice: localTtsVoice,
          wakeWord: localWakeWord,
        }),
      })
      setTtsVoice(localTtsVoice)
      setWakeWord(localWakeWord)
      toast.success('Settings saved successfully!')
    } catch {
      toast.error('Failed to save settings')
    }
  }

  const toggleKeyVisibility = (p: string) => {
    setShowKeys((prev) => ({ ...prev, [p]: !prev[p] }))
  }

  const currentModels = providerModels[provider] || []

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure your voice assistant</p>
        </motion.div>

        {/* Provider & Model */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 space-y-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold">Provider & Model</h3>
          </div>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Provider</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.keys(providerModels).map((p) => (
                  <motion.button
                    key={p}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setProvider(p)
                      const models = providerModels[p]
                      if (models.length > 0) setModel(models[0].id)
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                      provider === p
                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-white'
                        : 'glass-card text-muted-foreground hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {providerNames[p]}
                  </motion.button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Model</Label>
              <div className="grid gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {currentModels.map((m) => (
                  <motion.button
                    key={m.id}
                    whileHover={{ x: 2 }}
                    onClick={() => setModel(m.id)}
                    className={`w-full px-3 py-2 rounded-lg text-xs text-left transition-all duration-200 ${
                      model === m.id
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-white'
                        : 'hover:bg-white/5 text-muted-foreground hover:text-white'
                    }`}
                  >
                    {m.name}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* API Keys */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5 space-y-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold">API Keys</h3>
          </div>
          <div className="space-y-3">
            {Object.keys(providerModels).map((p) => (
              <div key={p} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{providerNames[p]} API Key</Label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys[p] ? 'text' : 'password'}
                    value={apiKeys[p] || ''}
                    onChange={(e) => setApiKey(p, e.target.value)}
                    placeholder={`Enter ${providerNames[p]} API key...`}
                    className="bg-white/5 border-white/10 text-sm h-9"
                  />
                  <button
                    onClick={() => toggleKeyVisibility(p)}
                    className="px-3 glass-card rounded-lg text-muted-foreground hover:text-white transition-colors"
                  >
                    {showKeys[p] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Voice Settings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 space-y-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold">Voice Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">TTS Voice</Label>
              <Input
                value={localTtsVoice}
                onChange={(e) => setLocalTtsVoice(e.target.value)}
                placeholder="en-US-Neural2-A"
                className="bg-white/5 border-white/10 text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Wake Word</Label>
              <Input
                value={localWakeWord}
                onChange={(e) => setLocalWakeWord(e.target.value)}
                placeholder="Hey Assistant"
                className="bg-white/5 border-white/10 text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Conversation History Limit</Label>
              <Input
                type="number"
                value={conversationLimit}
                onChange={(e) => setConversationLimit(parseInt(e.target.value, 10) || 50)}
                className="bg-white/5 border-white/10 text-sm h-9"
                min={5}
                max={200}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs text-muted-foreground">Auto-fallback</Label>
                <p className="text-[10px] text-muted-foreground/60">Switch providers if current fails</p>
              </div>
              <Switch
                checked={autoFallback}
                onCheckedChange={(checked) => setAutoFallback(checked)}
              />
            </div>
          </div>
        </motion.div>

        {/* PC Bridge Settings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-5 space-y-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold">PC Bridge (WebSocket)</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">WebSocket Server URL</Label>
              <Input
                value={pcBridgeUrl || ''}
                onChange={(e) => setPcBridgeUrl(e.target.value)}
                placeholder="ws://localhost:8765 or ws://192.168.1.100:8765"
                className="bg-white/5 border-white/10 text-sm h-9"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              Run <code className="text-emerald-400">python pc_bridge.py</code> on your PC, then enter the WebSocket URL here.
              The PC Control panel will connect automatically.
            </p>
          </div>
        </motion.div>

        {/* Save */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </motion.button>
      </div>
    </div>
  )
}
