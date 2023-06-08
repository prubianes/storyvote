'use client'
import { useContext } from 'react';
import { RoomContext } from '../RoomContext/roomContextProvider';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getAllUsersFromRoom, updateUsers } from '@/system/firebase';


export default function Header() {
    const { user, setUser, room, setRoom } = useContext(RoomContext)
    const router = useRouter()

    const resetAll = async () => {
        let loggedUsers = await getAllUsersFromRoom(room)
        let newUsers = loggedUsers.filter((logged) => {
            return logged !== user
        })
        console.log('updated ' + newUsers)
        updateUsers(newUsers, room)

        setUser('')
        setRoom('')
        router.push('/')
    }

    const UsuarioLogueado = () => {
        return (
            <>
                <h5>Hola {user}</h5>
                <a onClick={resetAll}>Logout</a>
            </>
        )
    }

    return (
        <header className='container'>
            <div className='grid'>
                <h1><Image
                    src="/logo.svg"
                    width={60}
                    height={60}
                    alt="Storyvote Logo"
                />{room ? ' StoryVote @ ' + room : ''}</h1>
            </div>
            {user ? <UsuarioLogueado /> : ''}
        </header>
    )
}