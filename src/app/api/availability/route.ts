// Busy days for the inquiry calendar: GET /api/availability?from=YYYY-MM&months=1..13.
// Public, but only day keys — never what the appointment is.
import { NextRequest, NextResponse } from 'next/server'
import { getAvailability } from '@/lib/availability'

export async function GET(req: NextRequest) {
  const now = new Date()
  const param = req.nextUrl.searchParams.get('from') ?? ''
  const months = Math.min(13, Math.max(1, Number(req.nextUrl.searchParams.get('months')) || 3))
  const m = /^(\d{4})-(\d{2})$/.exec(param)
  let from = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  // Nothing in the past, nothing beyond ~2 years
  const firstThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  if (from < firstThisMonth) from = firstThisMonth
  if (from.getTime() > now.getTime() + 2 * 366 * 86_400_000) return NextResponse.json({ busy: [] })
  const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, 1))
  const { busy } = await getAvailability(from, to)
  return NextResponse.json(
    { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), busy },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } },
  )
}
