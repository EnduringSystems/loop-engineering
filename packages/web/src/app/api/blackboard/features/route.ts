import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

const BB = process.env.BLACKBOARD_ROOT || '/bb'

export async function GET() {
  const filePath = join(BB, 'state', 'features.json')
  try {
    const raw = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    // Support both formats:
    // { features: { "id": {...} } }  — map keyed by id
    // [{ id, ... }]                  — already an array
    let arr: Record<string, unknown>[]
    if (Array.isArray(parsed)) {
      arr = parsed
    } else if (parsed && typeof parsed.features === 'object') {
      arr = Object.entries(parsed.features as Record<string, Record<string, unknown>>).map(
        ([id, feat]) => ({ id, ...feat })
      )
    } else {
      // flat object keyed by id
      arr = Object.entries(parsed as Record<string, Record<string, unknown>>).map(
        ([id, feat]) => ({ id, ...feat })
      )
    }
    return NextResponse.json(arr)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: 'Failed to read features' }, { status: 500 })
  }
}
