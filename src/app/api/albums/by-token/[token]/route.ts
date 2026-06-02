// Public endpoint: look up an album by its approval token.
// Returns only the fields the approval UI needs — never exposes admin fields.

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'albums',
    where: { approvalToken: { equals: token } },
    limit: 1,
    select: {
      slug: true,
      title: true,
      clientName: true,
      approvalStatus: true,
      selections: true,
      selectionMin: true,
      selectionMax: true,
      allowDownloads: true,
      approvalTerms: true,
    },
  })

  const album = result.docs[0]
  if (!album) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(album)
}
