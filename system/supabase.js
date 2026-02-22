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
    .select('slug, admin_passcode_hash')
    .eq('slug', room)
    .maybeSingle()

  if (readError) {
    throw readError
  }

  if (existing) {
    if (adminPasscode && !existing.admin_passcode_hash) {
      const adminPasscodeHash = await sha256(adminPasscode)
      const { error: updateError } = await getSupabase()
        .from('rooms')
        .update({ admin_passcode_hash: adminPasscodeHash })
        .eq('slug', room)

      if (updateError) {
        throw updateError
      }
    }

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
    .select('story, votes, users, admin_passcode_hash')
    .eq('slug', room)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function verifyAdminPasscode(room, passcode) {
  const { data, error } = await getSupabase()
    .from('rooms')
    .select('admin_passcode_hash')
    .eq('slug', room)
    .single()

  if (error) {
    throw error
  }

  if (!data.admin_passcode_hash) {
    return true
  }

  const providedHash = await sha256(passcode)
  return providedHash === data.admin_passcode_hash
}

export async function getAdminPasscodeHash(room) {
  const { data, error } = await getSupabase()
    .from('rooms')
    .select('admin_passcode_hash')
    .eq('slug', room)
    .single()

  if (error) {
    throw error
  }

  return data.admin_passcode_hash
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
  const { error } = await getSupabase()
    .from('rooms')
    .update({ votes })
    .eq('slug', room)

  if (error) {
    throw error
  }
}

export async function updateStory(story, room) {
  const { error } = await getSupabase()
    .from('rooms')
    .update({ story })
    .eq('slug', room)

  if (error) {
    throw error
  }
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
