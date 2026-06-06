import { NextResponse } from 'next/server'

// In-memory reminders storage
let reminders: Array<{
  id: string
  text: string
  createdAt: number
  expiresAt: number
  completed: boolean
}> = []

export async function GET() {
  return NextResponse.json({ reminders })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text, duration } = body

    if (!text || !duration) {
      return NextResponse.json({ error: 'Text and duration are required' }, { status: 400 })
    }

    const reminder = {
      id: crypto.randomUUID(),
      text,
      createdAt: Date.now(),
      expiresAt: Date.now() + duration * 60 * 1000,
      completed: false,
    }

    reminders.push(reminder)

    // Auto-remove expired reminders
    setTimeout(() => {
      reminders = reminders.filter((r) => r.id !== reminder.id)
    }, duration * 60 * 1000 + 1000)

    return NextResponse.json({ reminder })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 })
    }

    reminders = reminders.filter((r) => r.id !== id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
