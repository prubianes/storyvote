import { NextResponse } from 'next/server'

import { getAdminCookieName, verifyAdminSessionToken } from '@/system/adminSession'
import { getSupabaseServer } from '@/system/supabaseServer'

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const room = body?.room
  const story = String(body?.story ?? '').trim()

  if (!room || !story) {
    return NextResponse.json({ error: 'Missing room or story.' }, { status: 400 })
  }

  const token = request.cookies.get(getAdminCookieName(room))?.value
  if (!verifyAdminSessionToken(token, room)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = getSupabaseServer()
  const { error } = await supabase.from('rooms').update({ story }).eq('slug', room)

  if (error) {
    return NextResponse.json({ error: 'Failed to update story.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
