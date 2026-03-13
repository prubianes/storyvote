import { NextRequest, NextResponse } from 'next/server'

import { getAdminCookieName, verifyAdminSessionToken } from '@/system/adminSession'
import { getSupabaseServer } from '@/system/supabaseServer'

interface ReopenRoundBody {
  room?: string
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ReopenRoundBody | null
  const room = body?.room

  if (!room) {
    return NextResponse.json({ error: 'Missing room.' }, { status: 400 })
  }

  const token = request.cookies.get(getAdminCookieName(room))?.value
  if (!verifyAdminSessionToken(token, room)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const db: any = getSupabaseServer()
  const { data, error } = await db.rpc('reopen_revealed_round', {
    p_room_slug: room,
  })

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to reopen round.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
