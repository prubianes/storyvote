
'use client'

import { UserContext } from '@/components/UserContext/userContextProvider';
import { db } from '@/system/firebase';
import { set, ref, get, child} from 'firebase/database'
import { useRouter } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';

export default function Page() {
    const router = useRouter()
    const {user, setUser} = useContext(UserContext)
    const [rooms, setRooms] = useState([])

    useEffect(() => {
        get(child(ref(db), `rooms`)).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                console.log(Object.keys(data))
                setRooms(Object.keys(data))
            } else {
              console.log("No data available");
            }
        }).catch((error) => {
        console.error(error);
        });
    }, [])

    const handleForm = (e) => {
        e.preventDefault();

        const form  = e.target
        const formData =  new FormData(form)
        const formJson = Object.fromEntries(formData.entries())
            
        setUser(formJson.user)
        console.log(user)
        router.push(`/${formJson.room}`)
    }

    return (
        <>
            <main className="container">
                <h1>Bienvenidos a StoryVote</h1>

                <form onSubmit={handleForm}>
                    <input type="text" id="user" name="user" placeholder="Nombre" required />

                    <select id="room" name="room" defaultValue={''}required>
                        <option value='' >Seleccionar una sala</option>
                        {
                            rooms.map((room) => {
                                return <option value={room} >{room}</option>
                            })
                        }
                    </select>
                    <button type='submit'>Entrar</button>
                </form>
            </main>
        </>
    )
}
