import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, appendFile, access, readdir } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

const BB = process.env.BLACKBOARD_ROOT || '/bb'

interface ResolveBody {
  id: string
  resolution: string
}

async function findEscalationFile(id: string): Promise<string | null> {
  // First try direct path
  const direct = join(BB, 'state', 'escalations', `${id}.json`)
  try {
    await access(direct)
    return direct
  } catch {
    // not found at direct path, fall through to search
  }

  // Search directory for a file whose name contains the id
  const dir = join(BB, 'state', 'escalations')
  try {
    const files = await readdir(dir)
    const match = files.find((f) => f.includes(id) && f.endsWith('.json'))
    return match ? join(dir, match) : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  let body: ResolveBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, resolution } = body
  if (!id || !resolution) {
    return NextResponse.json({ error: 'Missing required fields: id, resolution' }, { status: 400 })
  }

  const filePath = await findEscalationFile(id)
  if (!filePath) {
    return NextResponse.json({ error: `Escalation not found: ${id}` }, { status: 404 })
  }

  let escalation: Record<string, unknown>
  try {
    const raw = await readFile(filePath, 'utf-8')
    escalation = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Failed to read escalation file' }, { status: 500 })
  }

  const now = new Date().toISOString()
  escalation.resolved = now
  escalation.resolution = resolution

  await writeFile(filePath, JSON.stringify(escalation, null, 2), 'utf-8')

  const logLine = `${now} | founder | ESCALATION_RESOLVED | ${id}: ${resolution} | none\n`
  const logPath = join(BB, 'events', 'loop.log')
  await appendFile(logPath, logLine, 'utf-8')

  return NextResponse.json({ status: 'ok' })
}
