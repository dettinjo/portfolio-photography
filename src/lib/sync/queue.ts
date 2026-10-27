// One task at a time for everything that talks to Nextcloud and sharp, with
// per-key debouncing (the desktop client uploads file by file).
import 'server-only'

let chain: Promise<void> = Promise.resolve()

export function enqueue(label: string, task: () => Promise<void>): Promise<void> {
  chain = chain.then(task).catch((err) => console.error(`[sync] ${label} failed:`, err))
  return chain
}

const timers = new Map<string, NodeJS.Timeout>()

export function debounce(key: string, delay: number, label: string, task: () => Promise<void>) {
  clearTimeout(timers.get(key))
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key)
      void enqueue(label, task)
    }, delay),
  )
}

/** Waits until all queued work is done. */
export const idle = () => chain
