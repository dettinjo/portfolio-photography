// Public endpoint called by the approval page: saves the client's selection.
// The approval token in the body is the credential.
import { NextRequest, NextResponse } from 'next/server'
import { submitSelections } from '@/lib/payload'
import { clientIp, rateLimit } from '@/lib/security'

export async function POST(req: NextRequest) {
  if (!rateLimit(`selections:${clientIp(req)}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let data: Parameters<typeof submitSelections>[0]
  try {
    data = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const result = await submitSelections(data)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[selections] failed:', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
