'use client'

import {UserContext} from '@/components/UserContext/userContextProvider'
import Header from '@/components/header/header';
import { useContext } from 'react'

export default function Page() {
    const {user} =  useContext(UserContext);
    return (
        <main class="container">
            <div class="grid">
                <h3>Historia: Agregar xxxxxxx a YYYYYYYYY</h3>
            </div>
        </main>
    )
}