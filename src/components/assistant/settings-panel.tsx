'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Save, Volume2, Zap, Terminal, Loader2 } from 'lucide-react'
import { useAssistantStore } from '@/store/assistant-store'
import { providerModels, providerNames } from '@/lib/model-catalog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
    pipMode,
    setPipMode,
    wakeWord,
    setWakeWord,
    ttsVoice,
    setTtsVoice,
    pcBridgeUrl,
    setPcBridgeUrl,
    auroraTheme,
    setAuroraTheme,
    speechMode,
    setSpeechMode,
    sttEngine,
    setSttEngine,
    ttsEngine,
    setTtsEngine,
  } = useAssistantStore()
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [localTtsVoice, setLocalTtsVoice] = useState(ttsVoice)
  const [localWakeWord, setLocalWakeWord] = useState(wakeWord)
  const [localAuroraTheme, setLocalAuroraTheme] = useState(auroraTheme)
  const [localSpeechMode, setLocalSpeechMode] = useState<'online' | 'offline'>('online')
  const [localSttEngine, setLocalSttEngine] = useState<'web_speech' | 'vosk'>('web_speech')
  const [localTtsEngine, setLocalTtsEngine] = useState<'edge_tts' | 'pyttsx3'>('edge_tts')
  const [loaded, setLoaded] = useState(false)
  const [isCustomModel, setIsCustomModel] = useState(false)

  // Auto-detect if current model is custom or preset
  useEffect(() => {
    if (loaded && provider) {
      const presets = providerModels[provider] || []
      const isPreset = presets.some((m) => m.id === model)
      setIsCustomModel(!isPreset && model !== '')
    }
  }, [loaded, provider, model])

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
          if (data.auroraTheme) {
            setAuroraTheme(data.auroraTheme)
            setLocalAuroraTheme(data.auroraTheme)
          }
          if (data.pcBridgeUrl) {
            setPcBridgeUrl(data.pcBridgeUrl)
          }
          if (data.speechMode) {
            setSpeechMode(data.speechMode)
            setLocalSpeechMode(data.speechMode)
          }
          if (data.sttEngine) {
            setSttEngine(data.sttEngine)
            setLocalSttEngine(data.sttEngine)
          }
          if (data.ttsEngine) {
            setTtsEngine(data.ttsEngine)
            setLocalTtsEngine(data.ttsEngine)
          }
          setLoaded(true)
        })
        .catch(() => setLoaded(true))
    }
  }, [loaded, setProvider, setModel, setApiKey, setAutoFallback, setConversationLimit, setWakeWord, setTtsVoice, setAuroraTheme, setSpeechMode, setSttEngine, setTtsEngine])

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
          auroraTheme: localAuroraTheme,
          pcBridgeUrl,
          speechMode: localSpeechMode,
          sttEngine: localSttEngine,
          ttsEngine: localTtsEngine,
        }),
      })
      setTtsVoice(localTtsVoice)
      setWakeWord(localWakeWord)
      setAuroraTheme(localAuroraTheme)
      setSpeechMode(localSpeechMode)
      setSttEngine(localSttEngine)
      setTtsEngine(localTtsEngine)
      toast.success('Settings saved successfully!')
    } catch {
      toast.error('Failed to save settings')
    }
  }

  const toggleKeyVisibility = (p: string) => {
    setShowKeys((prev) => ({ ...prev, [p]: !prev[p] }))
  }

  const [testingKey, setTestingKey] = useState<Record<string, boolean>>({})

  const handleTestKey = async (p: string) => {
    const key = apiKeys[p]
    if (!key || key.trim() === '') {
      toast.error(`Please enter a key for ${providerNames[p]} first`)
      return
    }

    setTestingKey((prev) => ({ ...prev, [p]: true }))
    try {
      const response = await fetch('/api/config/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: p,
          apiKey: key,
          model: p === provider ? model : undefined,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`🎉 ${providerNames[p]} API Key is valid and working!`)
      } else {
        toast.error(`❌ ${data.error}`)
      }
    } catch (e: any) {
      toast.error(`Failed to test key: ${e.message || e}`)
    } finally {
      setTestingKey((prev) => ({ ...prev, [p]: false }))
    }
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
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground">Model</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Custom Model ID</span>
                  <Switch
                    checked={isCustomModel}
                    onCheckedChange={(checked) => {
                      setIsCustomModel(checked)
                      if (!checked && currentModels.length > 0) {
                        setModel(currentModels[0].id)
                      }
                    }}
                  />
                </div>
              </div>

              {isCustomModel ? (
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Enter custom model ID (e.g. google/gemini-2.5-pro or glm-4)"
                  className="bg-white/5 border-white/10 text-sm h-9"
                />
              ) : (
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
              )}
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
                  <button
                    onClick={() => handleTestKey(p)}
                    disabled={testingKey[p]}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-white hover:opacity-90 disabled:opacity-50 transition-all shrink-0 flex items-center gap-1.5"
                  >
                    {testingKey[p] ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Testing
                      </>
                    ) : 'Test'}
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
              <Label className="text-xs text-muted-foreground">TTS Voice (Microsoft Edge)</Label>
              <select
                value={['hi-IN-SwaraNeural', 'hi-IN-MadhurNeural', 'en-US-EmmaNeural', 'en-US-GuyNeural', 'en-GB-SoniaNeural'].includes(localTtsVoice) ? localTtsVoice : 'custom'}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'custom') {
                    setLocalTtsVoice('en-US-AvaNeural')
                  } else {
                    setLocalTtsVoice(val)
                  }
                }}
                className="w-full bg-white/5 border border-white/10 text-xs h-9 rounded-xl px-2.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="hi-IN-SwaraNeural" className="bg-[#0f0f20] text-white">Hindi - Swara (Female)</option>
                <option value="hi-IN-MadhurNeural" className="bg-[#0f0f20] text-white">Hindi - Madhur (Male)</option>
                <option value="en-US-EmmaNeural" className="bg-[#0f0f20] text-white">English (US) - Emma (Female)</option>
                <option value="en-US-GuyNeural" className="bg-[#0f0f20] text-white">English (US) - Guy (Male)</option>
                <option value="en-GB-SoniaNeural" className="bg-[#0f0f20] text-white">English (UK) - Sonia (Female)</option>
                <option value="custom" className="bg-[#0f0f20] text-white">Custom Voice Name...</option>
              </select>
              {!['hi-IN-SwaraNeural', 'hi-IN-MadhurNeural', 'en-US-EmmaNeural', 'en-US-GuyNeural', 'en-GB-SoniaNeural'].includes(localTtsVoice) && (
                <Input
                  value={localTtsVoice}
                  onChange={(e) => setLocalTtsVoice(e.target.value)}
                  placeholder="Enter custom Edge TTS voice name (e.g. en-US-BrianNeural)"
                  className="bg-white/5 border-white/10 text-xs h-9 mt-1.5"
                />
              )}
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
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Speech Profile Preset</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocalSpeechMode('online')
                    setLocalSttEngine('web_speech')
                    setLocalTtsEngine('edge_tts')
                  }}
                  className={cn(
                    'py-2 px-3 rounded-xl text-xs font-semibold border transition-all',
                    localSpeechMode === 'online'
                      ? 'bg-cyan-500/10 border-cyan-500 text-white'
                      : 'border-white/5 bg-white/5 hover:bg-white/10 text-muted-foreground'
                  )}
                >
                  🌐 Online Profile (Fast & Clear)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocalSpeechMode('offline')
                    setLocalSttEngine('vosk')
                    setLocalTtsEngine('pyttsx3')
                  }}
                  className={cn(
                    'py-2 px-3 rounded-xl text-xs font-semibold border transition-all',
                    localSpeechMode === 'offline'
                      ? 'bg-purple-500/10 border-purple-500 text-white'
                      : 'border-white/5 bg-white/5 hover:bg-white/10 text-muted-foreground'
                  )}
                >
                  🔌 Offline Profile (Local SAPI/Vosk)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Speech-to-Text (STT) Engine</Label>
              <select
                value={localSttEngine}
                onChange={(e) => setLocalSttEngine(e.target.value as 'web_speech' | 'vosk')}
                className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="web_speech">Web Speech API (Browser-based, Online)</option>
                <option value="vosk">Vosk STT (Offline local PC model, Hindi/English)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Text-to-Speech (TTS) Engine</Label>
              <select
                value={localTtsEngine}
                onChange={(e) => setLocalTtsEngine(e.target.value as 'edge_tts' | 'pyttsx3')}
                className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="edge_tts">Edge TTS (Microsoft, Natural neural voices)</option>
                <option value="pyttsx3">Pyttsx3 (Offline local SAPI5 voices)</option>
              </select>
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
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs text-muted-foreground">Picture-in-Picture (PiP) Window</Label>
                <p className="text-[10px] text-muted-foreground/60">Show a floating status widget on screen</p>
              </div>
              <Switch
                checked={pipMode}
                onCheckedChange={(checked) => setPipMode(checked)}
              />
            </div>
          </div>
        </motion.div>

        {/* Ambient Glow Theme Settings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="glass-card p-5 space-y-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 animate-pulse" />
            <h3 className="text-sm font-semibold">Ambient Glow Theme</h3>
          </div>
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Select Preset Profile</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'neon', name: 'Neon Quantum', desc: 'Classic Cyan & Purple', colors: ['bg-[#06b6d4]', 'bg-[#a855f7]'] },
                { id: 'cyber', name: 'Hyper Cyber', desc: 'Neon Pink & Neon Blue', colors: ['bg-[#ff007f]', 'bg-[#00f0ff]'] },
                { id: 'sunset', name: 'Solar Sunset', desc: 'Warm Red & Gold Sunset', colors: ['bg-[#ff4e50]', 'bg-[#f9d423]'] },
                { id: 'emerald', name: 'Emerald Forest', desc: 'Tech Green & Mint Teal', colors: ['bg-[#059669]', 'bg-[#34d399]'] }
              ].map((themePreset) => {
                const isSelected = localAuroraTheme === themePreset.id
                return (
                  <motion.button
                    key={themePreset.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setLocalAuroraTheme(themePreset.id)
                      setAuroraTheme(themePreset.id)
                    }}
                    className={cn(
                      'p-3.5 rounded-xl text-left border flex flex-col justify-between transition-all duration-300 relative overflow-hidden group',
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/5'
                        : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                    )}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className={cn('text-xs font-semibold', isSelected ? 'text-white' : 'text-muted-foreground')}>
                        {themePreset.name}
                      </span>
                      <div className="flex gap-1">
                        {themePreset.colors.map((c, idx) => (
                          <div key={idx} className={cn('w-2.5 h-2.5 rounded-full shadow-sm', c)} />
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 mt-1 truncate">
                      {themePreset.desc}
                    </span>
                  </motion.button>
                )
              })}
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
