'use client'

import Keypad from '@/components/keypad/keypad'
import Aside from '@/components/aside/Aside'
import { useEffect, useState } from 'react'
import { onValue, ref, set } from 'firebase/database'
import { db } from '@/system/firebase'

export default function Page({params}) {

    const [votes, setVotes] = useState([0,0,0,0,0,0,0,0])
    const [story, setStory] = useState('')

    useEffect(() => {
        const query = ref(db, 'rooms/'+params.rooms)
        return onValue(query, (snapshot) => {
            const data = snapshot.val()
            if(snapshot.exists()){
               setVotes(data.votes)
               setStory(data.story)
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
            </div>
        </main>
    )
}