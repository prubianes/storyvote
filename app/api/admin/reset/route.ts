import { NextRequest, NextResponse } from 'next/server'

import { getAdminCookieName, verifyAdminSessionToken } from '@/system/adminSession'
import { getSupabaseServer } from '@/system/supabaseServer'

interface ResetBody {
  room?: string
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ResetBody | null
  const room = body?.room

  if (!room) {
    return NextResponse.json({ error: 'Missing room.' }, { status: 400 })
  }

  const token = request.cookies.get(getAdminCookieName(room))?.value
  if (!verifyAdminSessionToken(token, room)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const db: any = getSupabaseServer()
  const { data, error } = await db.rpc('reset_active_round_votes', {
    p_room_slug: room,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to reset votes.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, deleted_votes: Number(data ?? 0) })
}
