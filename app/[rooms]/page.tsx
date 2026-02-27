import { notFound } from 'next/navigation'

import RoomPageClient from './roomPageClient'
import { getSupabaseServer } from '@/system/supabaseServer'

interface RoomPageProps {
  params: Promise<{ rooms: string }>
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { rooms } = await params
  const roomSlug = String(rooms ?? '').trim()

  if (!roomSlug) {
    notFound()
  }

  const db: any = getSupabaseServer()
  const { data, error } = await db.from('rooms').select('slug').eq('slug', roomSlug).maybeSingle()

  if (error || !data) {
    notFound()
  }

  return <RoomPageClient roomSlug={roomSlug} />
}
