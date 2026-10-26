// Receives Nextcloud webhook_listeners events for files below the portfolio
// folder and schedules a (debounced) sync of the affected series folder.
// Authenticated with a shared secret header configured on the Nextcloud side.
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getPayloadClient } from '@/lib/payload'
import { PORTFOLIO_DAV_PATH, nodePathToRelative } from '@/lib/nextcloud'
import { recordWebhook, scheduleFolderSync, scheduleReconcile } from '@/lib/sync'

const SECRET = process.env.NEXTCLOUD_WEBHOOK_SECRET ?? ''

function authorized(req: NextRequest) {
  const given = Buffer.from(req.headers.get('x-portfolio-webhook-secret') ?? '')
  const expected = Buffer.from(SECRET)
  return SECRET.length >= 16 && given.length === expected.length && timingSafeEqual(given, expected)
}

type Node = { path?: string } | undefined
interface WebhookBody {
  event?: { node?: Node; source?: Node; target?: Node }
}

/** Maps a node path to the series folder it belongs to, or "root" for the portfolio folder itself. */
function affectedFolder(nodePath: string | undefined): string | 'root' | null {
  const rel = nodePath ? nodePathToRelative(nodePath) : null
  if (!rel || (rel !== PORTFOLIO_DAV_PATH && !rel.startsWith(`${PORTFOLIO_DAV_PATH}/`))) return null
  const below = rel.slice(PORTFOLIO_DAV_PATH.length + 1)
  if (!below) return 'root'
  return `${PORTFOLIO_DAV_PATH}/${below.split('/')[0]}`
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: WebhookBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const nodes = [body.event?.node, body.event?.source, body.event?.target]
  const folders = new Set(nodes.map((n) => affectedFolder(n?.path)).filter(Boolean))

  for (const folder of folders) {
    // A change directly in the portfolio folder (new/renamed/deleted series) or
    // to a folder itself is handled by a full reconcile.
    if (folder === 'root') scheduleReconcile()
    else scheduleFolderSync(folder as string)
  }
  if (nodes.some((n) => n?.path && affectedFolder(n.path) && !/\.[a-z0-9]{2,5}$/i.test(n.path))) {
    scheduleReconcile()
  }

  if (folders.size) await recordWebhook(await getPayloadClient()).catch(() => {})
  return NextResponse.json({ ok: true, scheduled: [...folders] }, { status: 202 })
}
