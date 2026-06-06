import { NextResponse } from 'next/server'

export async function GET() {
  // System info comes from the PC Bridge via WebSocket (real-time).
  // This API provides fallback/mock data for when PC Bridge is not connected.
  // When PC Bridge IS connected, the frontend gets live data directly via WebSocket
  // through the usePcBridge hook and updates the system monitor panel automatically.
  const info = {
    cpuUsage: 35,
    ramUsage: 48,
    ramUsed: 7.68,
    ramTotal: 16,
    diskUsed: 256,
    diskTotal: 512,
    battery: 78,
    isCharging: true,
    ip: '127.0.0.1',
    hostname: 'voice-ai-desktop',
    os: 'Windows 11',
    uptime: 43200,
    gpuUsage: 22,
    cpuTemp: 52,
    processes: 245,
  }

  return NextResponse.json(info)
}
