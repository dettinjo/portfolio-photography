// Runs once when the Next.js server starts.
// Initialises Payload (which triggers db push when push:true is set)
// so that all tables are ready before the first request arrives.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { getPayload } = await import('payload')
      const configPromise = await import('@payload-config')
      // getPayload() connects to the DB and runs push:true schema sync internally
      await getPayload({ config: configPromise.default })
      console.log('[instrumentation] Payload DB connected and schema synced')
    } catch (err) {
      console.error('[instrumentation] Payload init failed:', err)
    }
  }
}
