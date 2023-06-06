'use client'

import { createContext, useState } from 'react'

export const RoomContext = createContext({});

export default function RoomContextProvider( {children}) {
    const [user, setUser] = useState('');
    const [room, setRoom] = useState('')
    return <RoomContext.Provider value={{user, setUser, room, setRoom}}>{children}</RoomContext.Provider>
}