import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

const BB = process.env.BLACKBOARD_ROOT || '/bb'
const MAX_LINES = 100

export async function GET() {
  const filePath = join(BB, 'events', 'loop.log')
  try {
    const raw = await readFile(filePath, 'utf-8')
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const last = lines.slice(-MAX_LINES)
    return NextResponse.json(last)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: 'Failed to read event log' }, { status: 500 })
  }
}
