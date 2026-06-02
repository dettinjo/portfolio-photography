// Public endpoint called by the portfolio approval page.
// Validates the token, saves the client's selections, and marks the album as submitted.

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface SelectionPayload {
  token: string
  selections: Array<{ filename: string; comment?: string }>
  publicationConsent: boolean
}

export async function POST(req: NextRequest) {
  let body: SelectionPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { token, selections, publicationConsent } = body

  if (!token || !Array.isArray(selections)) {
    return NextResponse.json({ error: 'Missing token or selections' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'albums',
    where: { approvalToken: { equals: token } },
    limit: 1,
  })

  const album = result.docs[0]
  if (!album) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  }

  if (album.approvalStatus === 'approved') {
    return NextResponse.json({ error: 'Album already approved' }, { status: 409 })
  }

  // Validate selection counts
  const count = selections.length
  if (album.selectionMin && count < album.selectionMin) {
    return NextResponse.json(
      { error: `Please select at least ${album.selectionMin} images` },
      { status: 422 },
    )
  }
  if (album.selectionMax && count > album.selectionMax) {
    return NextResponse.json(
      { error: `Please select at most ${album.selectionMax} images` },
      { status: 422 },
    )
  }

  await payload.update({
    collection: 'albums',
    id: album.id,
    data: {
      selections: selections.map((s) => ({ filename: s.filename, comment: s.comment ?? '' })),
      approvalStatus: 'submitted',
      ...(publicationConsent !== undefined && { publicationConsent }),
    },
  })

  return NextResponse.json({ ok: true })
}
