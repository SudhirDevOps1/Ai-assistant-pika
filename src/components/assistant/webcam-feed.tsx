'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, SwitchCamera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'

export function WebcamFeed() {
  const [active, setActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (active) {
      navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        .then((s) => {
          setStream(s)
          if (videoRef.current) {
            videoRef.current.srcObject = s
          }
        })
        .catch((err) => {
          console.error("Webcam access failed:", err)
          setActive(false)
        })
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [active])

  return (
    <div className="glass-card rounded-2xl border border-white/5 bg-slate-950/40 p-4 space-y-3 flex flex-col justify-between h-[210px]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75",
              active ? "animate-ping bg-emerald-400" : "bg-red-400"
            )}></span>
            <span className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              active ? "bg-emerald-400" : "bg-red-400"
            )}></span>
          </span>
          Webcam Feed
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">{active ? 'ON' : 'OFF'}</span>
          <Switch
            checked={active}
            onCheckedChange={setActive}
            className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-slate-800"
          />
        </div>
      </div>

      <div className="flex-1 rounded-xl border border-white/5 bg-[#030611] flex items-center justify-center overflow-hidden relative min-h-[120px]">
        {active ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-center p-3 select-none">
            <Camera className="w-6 h-6 text-muted-foreground/40 animate-pulse" />
            <span className="text-[11px] font-bold text-muted-foreground/50 tracking-wide uppercase">
              Camera Feed Offline
            </span>
            <span className="text-[9px] text-muted-foreground/35">
              Click &apos;ON&apos; toggle to stream
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
