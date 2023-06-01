'use client'
import { useContext } from 'react'
import { UserContext } from '../UserContext/userContextProvider'

export default function Header() {
    const {user} =  useContext(UserContext);
    return (
        <header className="container">
            <h1>StoryVote</h1>
            { user ? <h5>Hola { user }</h5> : ''} 
        </header>
    )
}