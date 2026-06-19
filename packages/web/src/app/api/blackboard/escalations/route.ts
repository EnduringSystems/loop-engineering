import { NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

const BB = process.env.BLACKBOARD_ROOT || '/bb'

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export async function GET() {
  const dir = join(BB, 'state', 'escalations')
  try {
    const files = await readdir(dir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))
    const escalations = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const raw = await readFile(join(dir, file), 'utf-8')
          return JSON.parse(raw)
        } catch {
          return null
        }
      })
    )
    const unresolved = escalations
      .filter((e): e is Record<string, unknown> => e !== null && !e.resolved)
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[(a.priority as string)?.toLowerCase()] ?? 99
        const pb = PRIORITY_ORDER[(b.priority as string)?.toLowerCase()] ?? 99
        return pa - pb
      })
    return NextResponse.json(unresolved)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: 'Failed to read escalations' }, { status: 500 })
  }
}
