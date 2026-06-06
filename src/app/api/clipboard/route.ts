import { NextResponse } from 'next/server'

// In-memory clipboard storage
let clipboardItems: string[] = []

export async function GET() {
  return NextResponse.json({ items: clipboardItems })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    clipboardItems.unshift(text)
    // Keep max 50 items
    if (clipboardItems.length > 50) {
      clipboardItems = clipboardItems.slice(0, 50)
    }

    return NextResponse.json({ success: true, items: clipboardItems })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'clear') {
      clipboardItems = []
    } else {
      const index = parseInt(searchParams.get('index') || '0', 10)
      clipboardItems = clipboardItems.filter((_, i) => i !== index)
    }

    return NextResponse.json({ success: true, items: clipboardItems })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
