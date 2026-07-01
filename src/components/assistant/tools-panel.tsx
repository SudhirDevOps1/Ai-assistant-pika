'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePcBridge } from '@/hooks/use-pc-bridge'
import { toast } from 'sonner'
import { Wrench, Scan, FileText, Image as ImageIcon, QrCode, Calculator as CalcIcon, Languages, Key, Type, Loader2 } from 'lucide-react'

type ToolTab = 'ocr' | 'pdf' | 'image' | 'qrcode' | 'calculator' | 'translator' | 'password' | 'text_expand'

export function ToolsPanel() {
  const { sendCommand, speakText } = usePcBridge()
  const sendCommandWithSpeech = async (category: string, action: string, params: Record<string, unknown> = {}) => {
    const res: any = await sendCommand(category, action, params)
    if (res.success) {
      if (res.message) speakText(res.message)
    } else {
      if (res.message) speakText("कमांड फ़ेल हो गई: " + res.message)
    }
    return res
  }
  const [activeTab, setActiveTab] = useState<ToolTab>('ocr')
  const [loading, setLoading] = useState(false)

  // OCR state
  const [ocrText, setOcrText] = useState('')
  const [ocrFilePath, setOcrFilePath] = useState('')

  // PDF state
  const [pdfFile1, setPdfFile1] = useState('')
  const [pdfFile2, setPdfFile2] = useState('')
  const [pdfOutput, setPdfOutput] = useState('merged.pdf')
  const [pdfExtractPath, setPdfExtractPath] = useState('')
  const [pdfExtractedText, setPdfExtractedText] = useState('')

  // Image state
  const [imgPath, setImgPath] = useState('')
  const [imgWidth, setImgWidth] = useState('800')
  const [imgHeight, setImgHeight] = useState('600')
  const [imgFormat, setImgFormat] = useState('JPEG')

  // QR state
  const [qrData, setQrData] = useState('')
  const [qrOutput, setQrOutput] = useState('qrcode.png')
  const [qrResultPath, setQrResultPath] = useState('')

  // Calculator state
  const [calcExpression, setCalcExpression] = useState('')
  const [calcResult, setCalcResult] = useState('')

  // Translator state
  const [transText, setTransText] = useState('')
  const [transTarget, setTransTarget] = useState('hi')
  const [transResult, setTransResult] = useState('')

  // Password state
  const [passLength, setPassLength] = useState('16')
  const [passResult, setPassResult] = useState('')

  // Snippets state
  const [snippetTrigger, setSnippetTrigger] = useState('')
  const [snippetContent, setSnippetContent] = useState('')
  const [snippetsList, setSnippetsList] = useState<Record<string, string>>({})

  const handleOcr = async (action: 'screen' | 'file') => {
    setLoading(true)
    try {
      const res: any = await sendCommandWithSpeech('ocr', action, { path: ocrFilePath })
      if (res.success) {
        setOcrText(res.data?.text || 'No text found.')
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message || 'OCR failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePdfMerge = async () => {
    setLoading(true)
    try {
      const res: any = await sendCommandWithSpeech('pdf', 'merge', { files: [pdfFile1, pdfFile2], output: pdfOutput })
      if (res.success) toast.success(res.message)
      else toast.error(res.message)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePdfExtract = async () => {
    setLoading(true)
    try {
      const res: any = await sendCommandWithSpeech('pdf', 'extract_text', { path: pdfExtractPath })
      if (res.success) {
        setPdfExtractedText(res.data?.text || '')
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImageResize = async () => {
    setLoading(true)
    try {
      const res: any = await sendCommandWithSpeech('image', 'resize', { path: imgPath, width: imgWidth, height: imgHeight })
      if (res.success) toast.success(res.message)
      else toast.error(res.message)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImageConvert = async () => {
    setLoading(true)
    try {
      const res: any = await sendCommandWithSpeech('image', 'convert', { path: imgPath, format: imgFormat })
      if (res.success) toast.success(res.message)
      else toast.error(res.message)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleQrGenerate = async () => {
    setLoading(true)
    try {
      const res: any = await sendCommandWithSpeech('qrcode', 'generate', { data: qrData, output: qrOutput })
      if (res.success) {
        setQrResultPath(res.data?.path || '')
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculator = async () => {
    setLoading(true)
    try {
      const res: any = await sendCommandWithSpeech('calculator', 'eval', { expression: calcExpression })
      if (res.success) {
        setCalcResult(String(res.data?.result))
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTranslate = async () => {
    setLoading(true)
    try {
      const res: any = await sendCommandWithSpeech('translator', 'translate', { text: transText, target_lang: transTarget })
      if (res.success) {
        setTransResult(res.data?.translation || '')
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePassword = async () => {
    setLoading(true)
    try {
      const res: any = await sendCommandWithSpeech('password', 'generate', { length: parseInt(passLength, 10) || 16 })
      if (res.success) {
        setPassResult(res.data?.password || '')
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSnippet = async () => {
    setLoading(true)
    try {
      const res: any = await sendCommandWithSpeech('text_expand', 'add', { trigger: snippetTrigger, content: snippetContent })
      if (res.success) {
        toast.success(res.message)
        setSnippetTrigger('')
        setSnippetContent('')
        loadSnippets()
      } else {
        toast.error(res.message)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSnippets = async () => {
    try {
      const res: any = await sendCommand('text_expand', 'list', {})
      if (res.success && res.data?.snippets) {
        setSnippetsList(res.data.snippets)
      }
    } catch {}
  }

  const handleDeleteSnippet = async (trigger: string) => {
    try {
      const res: any = await sendCommandWithSpeech('text_expand', 'delete', { trigger })
      if (res.success) {
        toast.success(res.message)
        loadSnippets()
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const tabs: { id: ToolTab; icon: any; label: string }[] = [
    { id: 'ocr', icon: Scan, label: 'OCR' },
    { id: 'pdf', icon: FileText, label: 'PDF Tools' },
    { id: 'image', icon: ImageIcon, label: 'Image resize' },
    { id: 'qrcode', icon: QrCode, label: 'QR Code' },
    { id: 'calculator', icon: CalcIcon, label: 'Calculator' },
    { id: 'translator', icon: Languages, label: 'Translator' },
    { id: 'password', icon: Key, label: 'Password' },
    { id: 'text_expand', icon: Type, label: 'Snippets' },
  ]

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sub Tabs Sidebar */}
      <div className="w-48 border-r border-white/5 bg-white/5 py-4 px-2 space-y-1">
        <div className="px-3 mb-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Wrench className="w-3.5 h-3.5" />
          <span>Offline Tools</span>
        </div>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'text_expand') loadSnippets()
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/15 border border-cyan-500/20 text-white'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : ''}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Work Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs text-muted-foreground">Running command...</p>
            </div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {activeTab === 'ocr' && (
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
                    <Scan className="w-4 h-4 text-cyan-400" />
                    OCR (Optical Character Recognition)
                  </h3>
                  <p className="text-xs text-muted-foreground">Extract text from your screen or an image file.</p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleOcr('screen')}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-white hover:opacity-90 transition-all"
                    >
                      Capture & Read Screen
                    </button>
                  </div>

                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <label className="text-xs text-muted-foreground">Read text from local file path:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ocrFilePath}
                        onChange={(e) => setOcrFilePath(e.target.value)}
                        placeholder="E.g. C:\images\invoice.png"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
                      />
                      <button
                        onClick={() => handleOcr('file')}
                        className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all"
                      >
                        Read File
                      </button>
                    </div>
                  </div>

                  {ocrText && (
                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs text-muted-foreground">Extracted Text:</label>
                      <pre className="bg-black/35 border border-white/5 rounded-xl p-3 text-xs text-[#a5b4fc] overflow-auto max-h-60 whitespace-pre-wrap font-mono">
                        {ocrText}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pdf' && (
                <div className="grid gap-6">
                  <div className="glass-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white">Merge PDFs</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={pdfFile1}
                        onChange={(e) => setPdfFile1(e.target.value)}
                        placeholder="Path to PDF 1"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
                      />
                      <input
                        type="text"
                        value={pdfFile2}
                        onChange={(e) => setPdfFile2(e.target.value)}
                        placeholder="Path to PDF 2"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
                      />
                      <input
                        type="text"
                        value={pdfOutput}
                        onChange={(e) => setPdfOutput(e.target.value)}
                        placeholder="Output File (E.g. merged.pdf)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
                      />
                      <button
                        onClick={handlePdfMerge}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-white hover:opacity-90 transition-all"
                      >
                        Merge PDFs
                      </button>
                    </div>
                  </div>

                  <div className="glass-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white">Extract PDF Text</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pdfExtractPath}
                        onChange={(e) => setPdfExtractPath(e.target.value)}
                        placeholder="Path to PDF File"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
                      />
                      <button
                        onClick={handlePdfExtract}
                        className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-white hover:opacity-90 transition-all"
                      >
                        Extract
                      </button>
                    </div>
                    {pdfExtractedText && (
                      <pre className="bg-black/35 border border-white/5 rounded-xl p-3 text-xs text-[#a5b4fc] overflow-auto max-h-60 whitespace-pre-wrap font-mono">
                        {pdfExtractedText}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'image' && (
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Image Manipulation</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Image Path:</label>
                      <input
                        type="text"
                        value={imgPath}
                        onChange={(e) => setImgPath(e.target.value)}
                        placeholder="E.g. C:\photos\vacation.jpg"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-white">Resize Image</h4>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={imgWidth}
                            onChange={(e) => setImgWidth(e.target.value)}
                            placeholder="Width"
                            className="w-20 bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
                          />
                          <input
                            type="number"
                            value={imgHeight}
                            onChange={(e) => setImgHeight(e.target.value)}
                            placeholder="Height"
                            className="w-20 bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
                          />
                          <button
                            onClick={handleImageResize}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-white hover:opacity-90 transition-all"
                          >
                            Resize
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-white">Convert Format</h4>
                        <div className="flex gap-2">
                          <select
                            value={imgFormat}
                            onChange={(e) => setImgFormat(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
                          >
                            <option value="JPEG" className="bg-[#0f0f20]">JPEG</option>
                            <option value="PNG" className="bg-[#0f0f20]">PNG</option>
                            <option value="WEBP" className="bg-[#0f0f20]">WEBP</option>
                          </select>
                          <button
                            onClick={handleImageConvert}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-white hover:opacity-90 transition-all"
                          >
                            Convert
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'qrcode' && (
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Generate QR Code</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={qrData}
                      onChange={(e) => setQrData(e.target.value)}
                      placeholder="Enter Text or URL to encode"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
                    />
                    <input
                      type="text"
                      value={qrOutput}
                      onChange={(e) => setQrOutput(e.target.value)}
                      placeholder="Output Path (E.g. qrcode.png)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
                    />
                    <button
                      onClick={handleQrGenerate}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-white hover:opacity-90 transition-all"
                    >
                      Generate QR
                    </button>
                    {qrResultPath && (
                      <p className="text-xs text-green-400">QR Code generated at: <span className="font-mono">{qrResultPath}</span></p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'calculator' && (
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Safe Math Calculator</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={calcExpression}
                      onChange={(e) => setCalcExpression(e.target.value)}
                      placeholder="E.g. (25 * 4) + 120 / 3"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
                    />
                    <button
                      onClick={handleCalculator}
                      className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-white hover:opacity-90 transition-all"
                    >
                      Calculate
                    </button>
                  </div>
                  {calcResult && (
                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-sm text-cyan-400 font-mono">
                      Result: {calcResult}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'translator' && (
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Language Translator</h3>
                  <div className="space-y-4">
                    <textarea
                      value={transText}
                      onChange={(e) => setTransText(e.target.value)}
                      placeholder="Type text to translate..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-muted-foreground focus:outline-none"
                    />
                    <div className="flex gap-3 items-center">
                      <label className="text-xs text-muted-foreground">Target Language:</label>
                      <select
                        value={transTarget}
                        onChange={(e) => setTransTarget(e.target.value)}
                        className="bg-[#0f0f20] border border-white/10 rounded-xl px-3 py-1 text-xs text-white focus:outline-none"
                      >
                        <option value="hi">Hindi</option>
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="es">Spanish</option>
                        <option value="ja">Japanese</option>
                      </select>
                      <button
                        onClick={handleTranslate}
                        className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-white hover:opacity-90 transition-all"
                      >
                        Translate
                      </button>
                    </div>
                    {transResult && (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Translation:</p>
                        <p className="font-medium text-cyan-400">{transResult}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'password' && (
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Password Generator</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-muted-foreground">Password Length:</label>
                      <input
                        type="number"
                        value={passLength}
                        onChange={(e) => setPassLength(e.target.value)}
                        min={8}
                        max={64}
                        className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-xs text-white focus:outline-none"
                      />
                      <button
                        onClick={handlePassword}
                        className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-white hover:opacity-90 transition-all"
                      >
                        Generate Secure Password
                      </button>
                    </div>
                    {passResult && (
                      <div className="bg-black/35 border border-white/5 rounded-xl p-3 text-xs text-green-400 font-mono flex items-center justify-between">
                        <span>{passResult}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold border border-white/10 rounded px-1.5 py-0.5 bg-white/5">Copied</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'text_expand' && (
                <div className="grid gap-6">
                  <div className="glass-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white">Add Abbreviation Snippet</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={snippetTrigger}
                        onChange={(e) => setSnippetTrigger(e.target.value)}
                        placeholder="Trigger word (E.g. #brb)"
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
                      />
                      <input
                        type="text"
                        value={snippetContent}
                        onChange={(e) => setSnippetContent(e.target.value)}
                        placeholder="Expansion text (E.g. Be right back)"
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-muted-foreground focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleAddSnippet}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-white hover:opacity-90 transition-all"
                    >
                      Add Snippet
                    </button>
                  </div>

                  <div className="glass-card p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white">Active Expanders</h3>
                    <div className="divide-y divide-white/5">
                      {Object.keys(snippetsList).length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3">No expansion snippets saved.</p>
                      ) : (
                        Object.entries(snippetsList).map(([trigger, content]) => (
                          <div key={trigger} className="py-2.5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-cyan-400">{trigger}</p>
                              <p className="text-xs text-muted-foreground">{content}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteSnippet(trigger)}
                              className="text-[10px] text-red-400 hover:text-red-500 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
