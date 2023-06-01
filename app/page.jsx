'use client'

import { UserContext } from '@/components/UserContext/userContextProvider';
import { useRouter } from 'next/navigation';
import { useContext} from 'react';

export default function Page() {
    const router = useRouter()
    const {user, setUser} = useContext(UserContext)
    const rooms = ['RegCert', 'Shor', 'Cobranza']

    const handleForm = (e) => {
        e.preventDefault();

        const form  = e.target
        const formData =  new FormData(form)
        const formJson = Object.fromEntries(formData.entries())
            
        setUser(formJson.user)
        router.push(`/${formJson.room}`)
    }

    return (
        <>
            <main className="container">
                <h1>Bienvenidos a StoryVote</h1>

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
