import { NextRequest, NextResponse } from 'next/server'
import { submitSelections } from '@/lib/payload'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const result = await submitSelections(data)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
