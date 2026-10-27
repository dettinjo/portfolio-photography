// Node-only startup work, imported from instrumentation.ts.
// Initialises Payload so the database is ready: development pushes the schema,
// production applies the pending migrations in src/migrations. Then starts the
// Nextcloud photo sync (src/lib/sync).
import { getPayload, type Payload } from 'payload'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import config from '@payload-config'
import { migrations } from './migrations'
import { startSync } from './lib/sync'

export async function initPayload() {
  try {
    const payload = await getPayload({ config })
    if (process.env.NODE_ENV === 'production') await runMigrations(payload)
    console.log('[instrumentation] Payload initialised')
    startSync()
  } catch (err) {
    console.error('[instrumentation] Payload init failed:', err)
  }
}

/**
 * Applies pending migrations, each in its own transaction, and records them in
 * payload_migrations exactly like `payload migrate`. Payload's own runner is not
 * used at startup because it prompts (and exits) when the database was created
 * by dev-mode push, and calls process.exit(1) on any failure — which would turn
 * one bad statement into a crash-looping site. Here a failure is logged and the
 * site keeps serving.
 */
async function runMigrations(payload: Payload) {
  const db = payload.db as unknown as PostgresAdapter

  let applied: { name?: string | null; batch?: number | null }[] = []
  try {
    applied = (
      await payload.find({ collection: 'payload-migrations', limit: 0, pagination: false })
    ).docs
  } catch {
    // payload_migrations does not exist yet (fresh database)
  }

  const done = new Set(applied.map((m) => m.name))
  const batch = Math.max(0, ...applied.map((m) => Number(m.batch) || 0)) + 1

  // Data seeds ("…_seed_…") use the Local API, which always expects the newest
  // schema, so they run after every pending schema migration.
  const isSeed = (name: string) => /_seed_/.test(name)
  const pending = migrations.filter((m) => !done.has(m.name))
  const ordered = [...pending.filter((m) => !isSeed(m.name)), ...pending.filter((m) => isSeed(m.name))]

  for (const migration of ordered) {
    payload.logger.info(`Migrating: ${migration.name}`)
    try {
      const start = Date.now()
      await db.drizzle.transaction(async (tx) => {
        await migration.up({ db: tx, payload, req: {} } as unknown as Parameters<
          typeof migration.up
        >[0])
      })
      await payload.create({
        collection: 'payload-migrations',
        data: { name: migration.name, batch },
      })
      payload.logger.info(`Migrated:  ${migration.name} (${Date.now() - start}ms)`)
    } catch (err) {
      payload.logger.error({ err, msg: `Migration ${migration.name} failed; later migrations skipped` })
      return
    }
  }

  // A database first created by dev-mode push carries a "dev" marker (batch -1)
  // that would make `payload migrate` stop and prompt. The schema is now managed
  // by migrations, so the marker is obsolete.
  if (applied.some((m) => Number(m.batch) === -1)) {
    await payload.delete({ collection: 'payload-migrations', where: { batch: { equals: -1 } } })
  }
}
