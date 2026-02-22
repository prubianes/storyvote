import { NextResponse } from 'next/server'

import { getAdminCookieName, verifyAdminSessionToken } from '@/system/adminSession'
import { initialVoteState } from '@/system/supabase'
import { getSupabaseServer } from '@/system/supabaseServer'

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const room = body?.room

  if (!room) {
    return NextResponse.json({ error: 'Missing room.' }, { status: 400 })
  }

  const token = request.cookies.get(getAdminCookieName(room))?.value
  if (!verifyAdminSessionToken(token, room)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = getSupabaseServer()
  const { error } = await supabase.from('rooms').update({ votes: initialVoteState }).eq('slug', room)

  if (error) {
    return NextResponse.json({ error: 'Failed to reset votes.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
