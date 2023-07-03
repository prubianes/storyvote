'use client'

import Keypad from '@/components/keypad/keypad'
import Aside from '@/components/aside/aside'
import { db } from '@/system/firebase'
import { usePathname, useRouter } from 'next/navigation';
import { initialVoteState } from '@/system/stateUtils'
import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'

export default function Page({params}) {

    const [votes, setVotes] = useState(initialVoteState)
    const [story, setStory] = useState('')
    const [users, setUsers] = useState([])
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const query = ref(db, 'rooms/'+params.rooms)
        return onValue(query, (snapshot) => {
            const data = snapshot.val()
            if(snapshot.exists()){
               setVotes(data.votes)
               setStory(data.story)
               setUsers(data.users)
            }
        })
    }, [])
    return (
        <main className="container">
            <div className="grid">
                <section>
                    <h3>Historia: {story}</h3>
                    <Keypad votes={votes} room={params.rooms}/>
                </section>
                    <Aside users={users} votes={votes}/>
                <button type='button' onClick={() => router.push(pathname + '/admin')}>
                    Admin
                </button>
            </div>
        </main>
    )
}