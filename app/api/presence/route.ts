import { NextResponse } from 'next/server'

import { getSupabaseServer } from '@/system/supabaseServer'

interface PresenceBody {
  room?: string
  voterKey?: string
  displayName?: string
  isActive?: boolean
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PresenceBody | null
  const room = String(body?.room ?? '').trim()
  const voterKey = String(body?.voterKey ?? '').trim()
  const displayName = String(body?.displayName ?? '').trim()
  const isActive = Boolean(body?.isActive)

  if (!room || !voterKey || !displayName) {
    return NextResponse.json(
      { error: 'Missing room, voterKey, or displayName.' },
      { status: 400 }
    )
  }

  const db: any = getSupabaseServer()
  const { error } = await db.rpc('upsert_participant_presence', {
    p_room_slug: room,
    p_voter_key: voterKey,
    p_display_name: displayName,
    p_is_active: isActive,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to update participant presence.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
