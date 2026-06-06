'use client'

import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { motion } from 'framer-motion'
import { Copy, Check, Bot, User } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Message } from '@/store/assistant-store'
import { AvatarCharacter } from './avatar-character'

interface ChatBubbleProps {
  message: Message
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 bg-gradient-to-br from-purple-500 to-cyan-500">
          <User className="w-4 h-4 text-white" />
        </div>
      ) : (
        <div className="w-8 h-8 shrink-0 mt-1">
          <AvatarCharacter size="sm" interactive={false} />
        </div>
      )}

      {/* Message */}
      <div
        className={cn(
          'relative max-w-[75%] sm:max-w-[80%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-white/8 border border-white/10 text-white'
              : 'gradient-border'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none [&_code]:text-cyan-300 [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_a]:text-cyan-400 [&_a]:underline [&_blockquote]:border-l-purple-400 [&_blockquote]:border-l-2 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_ul]:list-disc [&_ol]:list-decimal [&_li]:text-sm [&_p]:text-sm">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match
                    if (isInline) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    }
                    return (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="!rounded-xl !bg-black/40 !p-0 !text-xs"
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className={cn(
            'flex items-center gap-2 mt-1 transition-opacity',
            isUser ? 'justify-end' : 'justify-start',
            'opacity-0 group-hover:opacity-100'
          )}
        >
          <span className="text-[10px] text-muted-foreground/60">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <button
            onClick={handleCopy}
            className="p-1 rounded-md hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 animate-pulse"
    >
      <div className="w-8 h-8 shrink-0">
        <AvatarCharacter size="sm" interactive={false} />
      </div>
      <div className="gradient-border rounded-2xl px-5 py-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-purple-400 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot" />
        </div>
      </div>
    </motion.div>
  )
}
