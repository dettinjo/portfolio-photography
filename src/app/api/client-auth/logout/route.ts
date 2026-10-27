import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/client-session'

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  const prefix = form?.get('locale') === 'de' ? '/de' : ''
  const res = redirect(`${prefix}/c/login?signedOut=1`)
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}

// Relative Location: correct behind the reverse proxy, whatever host Next sees
const redirect = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path } })
