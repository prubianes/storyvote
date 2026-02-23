'use client'

import { createContext, type Dispatch, type ReactNode, type SetStateAction, useMemo, useState } from 'react'

interface RoomContextValue {
  user: string
  setUser: Dispatch<SetStateAction<string>>
  room: string
  setRoom: Dispatch<SetStateAction<string>>
}

export const RoomContext = createContext<RoomContextValue>({
  user: '',
  setUser: () => undefined,
  room: '',
  setRoom: () => undefined,
})

interface RoomContextProviderProps {
  children: ReactNode
}

export default function RoomContextProvider({ children }: RoomContextProviderProps) {
  const [user, setUser] = useState('')
  const [room, setRoom] = useState('')

  const value = useMemo(() => ({ user, setUser, room, setRoom }), [room, user])

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}
