// Public endpoint: look up an album by its approval token.
// Returns only the fields the approval UI needs — never exposes admin fields.
import { NextRequest, NextResponse } from 'next/server'
import { fetchAlbumByToken } from '@/lib/payload'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const album = await fetchAlbumByToken(token)
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(album, { headers: { 'Cache-Control': 'no-store' } })
}
