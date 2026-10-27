// The client's selection as files for Lightroom, written to
// Clients/<project>/_from-client/: selection.txt (with a ready-to-paste
// Library filter line) and selection.csv.
import 'server-only'
import type { Proofing } from '@/lib/portal'

const base = (filename: string) => filename.replace(/\.[^.]+$/, '')
const pct = (v: number | null) => (v === null ? '' : `${Math.round(v * 100)} %`)
const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function selectionFiles(proofing: Proofing, sentBy: string, sentAt: Date) {
  const picked = proofing.photos.filter((p) => proofing.pickedBy[p.id]?.length)
  const commentsOf = (id: number) => proofing.comments.filter((c) => c.photo === id && !c.fromPhotographer)
  const extra = proofing.quota !== null ? Math.max(0, picked.length - proofing.quota) : 0

  const lines: string[] = [
    `Selection — ${proofing.project.title}`,
    `Sent ${sentAt.toISOString().slice(0, 16).replace('T', ' ')} UTC by ${sentBy}`,
    `${picked.length} photos${proofing.quota !== null ? ` (${proofing.quota} included${extra ? `, ${extra} extra` : ''})` : ''}`,
    '',
    'Lightroom: Library → Library Filter → Text → Filename → Contains, then paste:',
    picked.map((p) => base(p.filename)).join(', '),
    '',
    '── Picked ──',
  ]
  for (const p of picked) {
    lines.push(`${p.filename}   ♥ ${proofing.pickedBy[p.id].join(', ')}`)
    for (const c of commentsOf(p.id)) lines.push(`    ${c.x !== null ? `📍 ${pct(c.x)} / ${pct(c.y)}  ` : ''}${c.author}: ${c.body.replace(/\s*\n\s*/g, ' ')}`)
  }
  const otherComments = proofing.photos.filter((p) => !proofing.pickedBy[p.id]?.length && commentsOf(p.id).length)
  if (otherComments.length) {
    lines.push('', '── Comments on photos not picked ──')
    for (const p of otherComments) {
      lines.push(p.filename)
      for (const c of commentsOf(p.id)) lines.push(`    ${c.x !== null ? `📍 ${pct(c.x)} / ${pct(c.y)}  ` : ''}${c.author}: ${c.body.replace(/\s*\n\s*/g, ' ')}`)
    }
  }

  const csv = [
    ['filename', 'picked', 'picked_by', 'comments'].join(','),
    ...proofing.photos.map((p) =>
      [
        p.filename,
        proofing.pickedBy[p.id]?.length ? 1 : 0,
        (proofing.pickedBy[p.id] ?? []).join(' & '),
        commentsOf(p.id)
          .map((c) => `${c.x !== null ? `[${pct(c.x)} / ${pct(c.y)}] ` : ''}${c.author}: ${c.body}`)
          .join(' | '),
      ]
        .map(csvCell)
        .join(','),
    ),
  ].join('\n')

  return { txt: lines.join('\n') + '\n', csv: csv + '\n', count: picked.length, extra }
}
