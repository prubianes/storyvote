import { NextRequest, NextResponse } from 'next/server'

import { getAdminCookieName, verifyAdminSessionToken } from '@/system/adminSession'
import { getSupabaseServer } from '@/system/supabaseServer'

interface EndRoundBody {
  room?: string
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as EndRoundBody | null
  const room = body?.room

  if (!room) {
    return NextResponse.json({ error: 'Missing room.' }, { status: 400 })
  }

  const token = request.cookies.get(getAdminCookieName(room))?.value
  if (!verifyAdminSessionToken(token, room)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const db: any = getSupabaseServer()
  const { error } = await db.rpc('end_active_round', {
    p_room_slug: room,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to end round.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
