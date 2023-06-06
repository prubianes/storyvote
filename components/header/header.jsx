'use client'
import { useContext } from 'react';
import { RoomContext } from '../RoomContext/roomContextProvider';
import { useRouter } from 'next/navigation';
import { getAllUsersFromRoom, updateUsers } from '@/system/firebase';


export default function Header() {
    const {user, setUser, room, setRoom} =  useContext(RoomContext)
    const router = useRouter()

    const resetAll = async () => {
        let loggedUsers = await getAllUsersFromRoom(room)         
        let newUsers = loggedUsers.filter((logged) => {
            return logged !== user
        })
        console.log('updated '+newUsers)
        updateUsers(newUsers, room)

        setUser('')
        setRoom('')
        router.push('/')
    }

    const UsuarioLogueado = () => {
        return (
            <>
                <div className='grid'>
                    <h5>Hola { user }</h5>
                    <a onClick={resetAll}>Logout</a>
                </div>
            </>
        )
    }

    return (
        <header className='container'>
            <h1>StoryVote {room ? ' @ '+ room : ''}</h1>
            { user ? <UsuarioLogueado /> : ''} 
        </header>
    )
}