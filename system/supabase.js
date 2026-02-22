import { createClient } from '@supabase/supabase-js'

let supabaseClient

function getSupabase() {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseClient
}

export const initialVoteState = [0, 0, 0, 0, 0, 0, 0, 0]

async function sha256(value) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hashArray = Array.from(new Uint8Array(digest))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function ensureRoom(room, adminPasscode = '') {
  const { data: existing, error: readError } = await getSupabase()
    .from('rooms')
    .select('slug')
    .eq('slug', room)
    .maybeSingle()

  if (readError) {
    throw readError
  }

  if (existing) {
    return
  }

  const adminPasscodeHash = adminPasscode ? await sha256(adminPasscode) : null

  const { error: insertError } = await getSupabase().from('rooms').insert({
    slug: room,
    name: room,
    story: '',
    votes: initialVoteState,
    users: [],
    admin_passcode_hash: adminPasscodeHash,
  })

  if (insertError) {
    throw insertError
  }
}

export async function getRoom(room) {
  const { data, error } = await getSupabase()
    .from('rooms')
    .select('story, votes, users')
    .eq('slug', room)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getAllUsersFromRoom(room) {
  const roomData = await getRoom(room)
  return roomData.users ?? []
}

export async function updateUsers(users, room) {
  const { error } = await getSupabase()
    .from('rooms')
    .update({ users })
    .eq('slug', room)

  if (error) {
    throw error
  }
}

export async function updateVotes(votes, room) {
  const { error } = await getSupabase().from('rooms').update({ votes }).eq('slug', room)

  if (error) {
    throw error
  }
}

export async function applyVoteDelta(room, voteIndex, delta) {
  const { data, error } = await getSupabase().rpc('apply_vote_delta', {
    p_room_slug: room,
    p_vote_index: voteIndex,
    p_delta: delta,
  })

  if (error) {
    throw error
  }

  return data
}

export function subscribeToRoom(room, onChange) {
  return getSupabase()
    .channel(`room-${room}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `slug=eq.${room}`,
      },
      async () => {
        const latest = await getRoom(room)
        onChange(latest)
      }
    )
    .subscribe()
}

export function unsubscribeFromRoom(channel) {
  getSupabase().removeChannel(channel)
}
