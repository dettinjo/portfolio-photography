// Runs once when the Next.js server starts.
// Initialises Payload (which triggers db push when push:true is set)
// so that all tables are ready before the first request arrives.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { getPayload } = await import('payload')
      const configPromise = await import('@payload-config')
      const payload = await getPayload({ config: configPromise.default })
      // db.connect may not exist on all adapters; getPayload already connects
      await payload.db.connect?.({ payload })
      console.log('[instrumentation] Payload DB connected and schema synced')
    } catch (err) {
      console.error('[instrumentation] Payload init failed:', err)
    }
  }
}
