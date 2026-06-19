import { NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

const BB = process.env.BLACKBOARD_ROOT || '/bb'

export async function GET() {
  const dir = join(BB, 'state', 'loop-status')
  try {
    const files = await readdir(dir)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))
    const loops = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const raw = await readFile(join(dir, file), 'utf-8')
          return JSON.parse(raw)
        } catch {
          return null
        }
      })
    )
    return NextResponse.json(loops.filter(Boolean))
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: 'Failed to read loop statuses' }, { status: 500 })
  }
}
