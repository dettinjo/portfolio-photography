// Runs once when the Next.js server starts, before requests are served.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initPayload } = await import('./instrumentation-node')
    await initPayload()
  }
}
