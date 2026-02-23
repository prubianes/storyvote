import { NextRequest, NextResponse } from 'next/server'

import { getAdminCookieName, verifyAdminSessionToken } from '@/system/adminSession'
import { getSupabaseServer } from '@/system/supabaseServer'

interface StoryBody {
  room?: string
  story?: string
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as StoryBody | null
  const room = body?.room
  const story = String(body?.story ?? '').trim()

  if (!room || !story) {
    return NextResponse.json({ error: 'Missing room or story.' }, { status: 400 })
  }

  const token = request.cookies.get(getAdminCookieName(room))?.value
  if (!verifyAdminSessionToken(token, room)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const db: any = getSupabaseServer()
  const { data: activeRound, error: readRoundError } = await db
    .from('rounds')
    .select('id')
    .eq('room_slug', room)
    .eq('status', 'active')
    .maybeSingle()

  if (readRoundError) {
    return NextResponse.json({ error: 'Failed to update story.' }, { status: 500 })
  }

  let roundError: unknown = null
  if (activeRound) {
    const { error } = await db.from('rounds').update({ story }).eq('id', activeRound.id)
    roundError = error
  } else {
    const { error } = await db.from('rounds').insert({
      room_slug: room,
      story,
      status: 'active',
    })
    roundError = error
  }

  if (roundError) {
    return NextResponse.json({ error: 'Failed to update story.' }, { status: 500 })
  }

  const { error: roomError } = await db.from('rooms').update({ story }).eq('slug', room)
  if (roomError) {
    return NextResponse.json({ error: 'Failed to update story.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
