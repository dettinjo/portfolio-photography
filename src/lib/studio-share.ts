// Photos shared to the app from the phone's gallery (Web Share Target) wait
// here until a destination is picked in /studio/upload.
import 'server-only'
import { randomBytes } from 'crypto'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'

const ROOT = path.join(os.tmpdir(), 'studio-share')
const MAX_AGE_MS = 24 * 60 * 60 * 1000
export const isToken = (t: string) => /^[a-f0-9]{32}$/.test(t)

export interface SharedFile {
  name: string
  type: string
  size: number
}

export async function stash(files: File[]): Promise<string> {
  await cleanup()
  const token = randomBytes(16).toString('hex')
  const dir = path.join(ROOT, token)
  await mkdir(dir, { recursive: true })
  const meta: SharedFile[] = []
  for (const [i, f] of files.entries()) {
    await writeFile(path.join(dir, String(i)), Buffer.from(await f.arrayBuffer()))
    meta.push({ name: f.name, type: f.type, size: f.size })
  }
  await writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta))
  return token
}

export async function listShared(token: string): Promise<SharedFile[] | null> {
  if (!isToken(token)) return null
  try {
    return JSON.parse(await readFile(path.join(ROOT, token, 'meta.json'), 'utf8'))
  } catch {
    return null
  }
}

export async function readShared(token: string, index: number) {
  return readFile(path.join(ROOT, token, String(index)))
}

export const dropShared = (token: string) => (isToken(token) ? rm(path.join(ROOT, token), { recursive: true, force: true }) : Promise.resolve())

async function cleanup() {
  for (const entry of await readdir(ROOT).catch(() => [] as string[])) {
    const info = await stat(path.join(ROOT, entry)).catch(() => null)
    if (info && Date.now() - info.mtimeMs > MAX_AGE_MS) await rm(path.join(ROOT, entry), { recursive: true, force: true })
  }
}
