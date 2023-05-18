'use client'
import { useContext } from 'react'
import { UserContext } from '../UserContext/userContextProvider'

export default function Header() {
    const {user} =  useContext(UserContext);
    return (
        <header className="container">
            <div className="grid">
                <h2>StoryVote</h2>
                { user ? <h5>Hola { user }</h5> : ''} 
            </div>
        </header>
    )
}