'use client'

import { RoomContext } from '@/components/RoomContext/roomContextProvider';
import { getAllUsersFromRoom, updateUsers } from '@/system/firebase';
import { useRouter } from 'next/navigation';
import { useContext} from 'react';

export default function Page() {
    const router = useRouter()
    const {setUser, setRoom} = useContext(RoomContext)
    const rooms = ['RegCert', 'Shor']

    const handleForm = async (e) => {
        e.preventDefault();

        const form  = e.target
        const formData =  new FormData(form)
        const formJson = Object.fromEntries(formData.entries())
            
        setUser(formJson.user)
        setRoom(formJson.room)

        let loggedUsers = await getAllUsersFromRoom(formJson.room)
        loggedUsers.push(formJson.user);
        updateUsers(loggedUsers, formJson.room)

        router.push(`/${formJson.room}`)
    }

    return (
        <>
            <main className="container">
                <h1>Bienvenidos a StoryVote</h1>
                <br />
                <form onSubmit={handleForm}>
                    <input type="text" id="user" name="user" placeholder="Nombre" required />
                    <select id="room" name="room" defaultValue={''}required>
                        <option key='selector' value='' >Seleccionar una sala</option>
                        {
                            rooms.map((room) => {
                                return <option key={room} value={room} >{room}</option>
                            })
                        }
                    </select>
                    <button type='submit'>Entrar</button>
                </form>
            </main>
        </>
    )
}
