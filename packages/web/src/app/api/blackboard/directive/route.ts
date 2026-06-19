import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile, appendFile } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

const BB = process.env.BLACKBOARD_ROOT || '/bb'

interface DirectiveBody {
  loop?: string
  target_loop?: string
  type: string
  priority: string
  directive: string
  context?: string
}

export async function POST(req: NextRequest) {
  let body: DirectiveBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Accept both 'loop' and 'target_loop' field names
  const loop = body.loop ?? body.target_loop
  const { type, priority, directive, context } = body
  if (!loop || !type || !priority || !directive) {
    return NextResponse.json(
      { error: 'Missing required fields: loop (or target_loop), type, priority, directive' },
      { status: 400 }
    )
  }

  const id = 'dir-' + randomBytes(4).toString('hex')
  const now = new Date().toISOString()
  const dirPath = join(BB, 'state', 'directives', loop)

  try {
    await mkdir(dirPath, { recursive: true })
  } catch {
    // ignore if exists
  }

  const payload = { id, loop, type, priority, directive, context: context ?? null, created: now }
  const filePath = join(dirPath, `${id}.json`)

  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')

  const logLine = `${now} | founder | DIRECTIVE_SENT | →${loop} [${type}]: ${directive} | none\n`
  const logPath = join(BB, 'events', 'loop.log')
  await appendFile(logPath, logLine, 'utf-8')

  return NextResponse.json({ id, status: 'ok' })
}
