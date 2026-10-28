// Web Share Target: the phone's gallery posts photos here ("Share → Photos by …").
// They are kept for a day and the upload page asks where they should go.
import { NextRequest, NextResponse } from 'next/server'
import { adminFromCookie } from '@/lib/studio'
import { stash } from '@/lib/studio-share'
import { UPLOAD_MAX_BYTES, UPLOAD_TYPES } from '@/lib/studio-upload'

const to = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path } })

export async function POST(req: NextRequest) {
  if (!(await adminFromCookie(req))) return to('/admin/login?redirect=%2Fstudio%2Fupload')
  const form = await req.formData().catch(() => null)
  const files = (form?.getAll('photos') ?? []).filter(
    (f): f is File => f instanceof File && UPLOAD_TYPES.has(f.type) && f.size <= UPLOAD_MAX_BYTES,
  )
  if (!files.length) return to('/studio/upload?share=none')
  return to(`/studio/upload?share=${await stash(files.slice(0, 100))}`)
}
