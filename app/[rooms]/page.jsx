'use client'

import Keypad from '@/components/keypad/keypad'
import Aside from '@/components/aside/Aside'

export default function Page() {
    
    return (
        <main className="container">
            <div className="grid">
                <section>
                    <h3>Historia: Agregar xxxxxxx a YYYYYYYYY</h3>
                    <Keypad />
                </section>
                <Aside />
            </div>
        </main>
    )
}