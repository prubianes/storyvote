import { createClient, type RealtimeChannel } from '@supabase/supabase-js'

let supabaseClient: ReturnType<typeof createClient> | undefined

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

function getDb(): any {
  return getSupabase()
}

export const initialVoteState = [0, 0, 0, 0, 0, 0, 0, 0] as number[]

export interface RoomState {
  round_id: string | null
  round_active: boolean
  story: string
  users: string[]
  votes: number[]
}

export interface CastVoteResult {
  roundId: string | null
  selectedVoteIndex: number | null
  votes: number[]
}

export interface HistoryRound {
  id: string
  story: string
  status: 'closed' | 'active'
  created_at: string
  closed_at: string | null
  vote_counts: number[]
  total_votes: number
}

async function callRpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await getDb().rpc(fn, args)
  if (error) {
    throw error
  }
  return data as T
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hashArray = Array.from(new Uint8Array(digest))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function ensureRoom(room: string, adminPasscode = ''): Promise<void> {
  const { data: existing, error: readError } = await getDb()
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

  const { error: insertError } = await getDb().from('rooms').insert({
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

  await ensureActiveRound(room)
}

export async function ensureActiveRound(room: string): Promise<void> {
  await callRpc<string>('ensure_active_round', { p_room_slug: room })
}

export async function getRoom(room: string): Promise<RoomState> {
  const { data, error } = await getDb().from('rooms').select('story, users').eq('slug', room).single()

  if (error) {
    throw error
  }

  return {
    story: data.story,
    users: data.users ?? [],
    votes: initialVoteState,
    round_id: null,
    round_active: false,
  }
}

export async function getRoomState(room: string): Promise<RoomState> {
  const data = await callRpc<{
    round_id: string | null
    round_active: boolean
    story: string
    users: string[]
    vote_counts: number[]
  }>('get_room_state', {
    p_room_slug: room,
  })

  return {
    round_id: data.round_id,
    round_active: Boolean(data.round_active),
    story: data.story ?? '',
    users: data.users ?? [],
    votes: data.vote_counts ?? initialVoteState,
  }
}

export async function getRoomHistory(room: string, limit = 12): Promise<HistoryRound[]> {
  const data = await callRpc<HistoryRound[]>('get_room_history', {
    p_room_slug: room,
    p_limit: limit,
  })

  return Array.isArray(data) ? data : []
}

export async function castVote(
  room: string,
  voterKey: string,
  voteIndex: number
): Promise<CastVoteResult> {
  const data = await callRpc<{
    round_id: string | null
    selected_vote_index: number | null
    vote_counts: number[]
  }>('cast_vote', {
    p_room_slug: room,
    p_voter_key: voterKey,
    p_vote_index: voteIndex,
  })

  return {
    roundId: data.round_id,
    selectedVoteIndex:
      typeof data.selected_vote_index === 'number' ? data.selected_vote_index : null,
    votes: data.vote_counts ?? initialVoteState,
  }
}

export async function getAllUsersFromRoom(room: string): Promise<string[]> {
  const roomData = await getRoom(room)
  return roomData.users ?? []
}

export async function updateUsers(users: string[], room: string): Promise<void> {
  const { error } = await getDb().from('rooms').update({ users }).eq('slug', room)

  if (error) {
    throw error
  }
}

export function subscribeToRoom(room: string, onChange: () => void | Promise<void>): RealtimeChannel {
  return getDb()
    .channel(`room-${room}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `slug=eq.${room}`,
      },
      onChange
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rounds',
        filter: `room_slug=eq.${room}`,
      },
      onChange
    )
    .subscribe()
}

export function unsubscribeFromRoom(channel: RealtimeChannel): void {
  getDb().removeChannel(channel)
}
