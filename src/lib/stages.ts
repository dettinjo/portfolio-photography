// The project lifecycle (docs/REDESIGN.md §7.1). Labels and the client-facing
// "next step" texts live in messages/<locale>/portal.json under Portal.stages.
export const STAGES = [
  'inquiry',
  'proposal',
  'booked',
  'planning',
  'shoot',
  'sneak-peek',
  'proofing',
  'editing',
  'revisions',
  'delivery',
  'feedback',
  'archive',
] as const

export type Stage = (typeof STAGES)[number]

export const STAGE_LABELS: Record<Stage, string> = {
  inquiry: 'Inquiry',
  proposal: 'Proposal',
  booked: 'Booked',
  planning: 'Planning',
  shoot: 'Shoot',
  'sneak-peek': 'Sneak peek',
  proofing: 'Proofing',
  editing: 'Editing',
  revisions: 'Revisions',
  delivery: 'Delivery',
  feedback: 'Feedback',
  archive: 'Archive',
}

export const isStage = (value: unknown): value is Stage => STAGES.includes(value as Stage)
export const stageIndex = (stage: Stage) => STAGES.indexOf(stage)
