import { NextRequest, NextResponse } from 'next/server'

import { getAdminCookieName, verifyAdminSessionToken } from '@/system/adminSession'
import { getSupabaseServer } from '@/system/supabaseServer'

interface StartRoundBody {
  room?: string
  story?: string
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as StartRoundBody | null
  const room = body?.room
  const story = typeof body?.story === 'string' ? body.story.trim() : null

  if (!room) {
    return NextResponse.json({ error: 'Missing room.' }, { status: 400 })
  }

  const token = request.cookies.get(getAdminCookieName(room))?.value
  if (!verifyAdminSessionToken(token, room)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const db: any = getSupabaseServer()
  const { error } = await db.rpc('start_new_round', {
    p_room_slug: room,
    p_story: story || null,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to start round.' }, { status: 500 })
  }

  if (story) {
    const { error: roomError } = await db.from('rooms').update({ story }).eq('slug', room)
    if (roomError) {
      return NextResponse.json({ error: 'Failed to update story.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
