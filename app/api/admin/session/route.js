import { NextResponse } from 'next/server'

import {
  adminCookieOptions,
  createAdminSessionToken,
  getAdminCookieName,
  hashPasscode,
  verifyAdminSessionToken,
} from '@/system/adminSession'
import { getSupabaseServer } from '@/system/supabaseServer'

export async function GET(request) {
  const room = request.nextUrl.searchParams.get('room')
  if (!room) {
    return NextResponse.json({ error: 'Missing room parameter.' }, { status: 400 })
  }

  const cookieName = getAdminCookieName(room)
  const token = request.cookies.get(cookieName)?.value
  const authorized = verifyAdminSessionToken(token, room)
  return NextResponse.json({ authorized })
}

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const room = body?.room
  const passcode = String(body?.passcode ?? '')

  if (!room) {
    return NextResponse.json({ error: 'Missing room.' }, { status: 400 })
  }

  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from('rooms')
    .select('admin_passcode_hash')
    .eq('slug', room)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Failed to validate admin access.' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Room not found.' }, { status: 404 })
  }

  if (data.admin_passcode_hash) {
    const passcodeHash = hashPasscode(passcode)
    if (passcodeHash !== data.admin_passcode_hash) {
      return NextResponse.json({ error: 'Invalid passcode.' }, { status: 401 })
    }
  }

  const token = createAdminSessionToken(room)
  const response = NextResponse.json({ authorized: true })
  response.cookies.set(getAdminCookieName(room), token, adminCookieOptions())
  return response
}

export async function DELETE(request) {
  const room = request.nextUrl.searchParams.get('room')
  if (!room) {
    return NextResponse.json({ error: 'Missing room parameter.' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(getAdminCookieName(room), '', {
    ...adminCookieOptions(),
    maxAge: 0,
  })
  return response
}
