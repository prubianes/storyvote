'use client'
import { db } from '@/system/firebase';
import { ref, update } from 'firebase/database';


export default function Page({params}) {
    const handleStoryForm = (e) => {
        e.preventDefault();

        const form  = e.target
        const formData =  new FormData(form)
        const formJson = Object.fromEntries(formData.entries())
        update(ref(db, 'rooms/' + params.rooms ), {
            story: formJson.story
        })
    }

    const handleReset = () => {
        update(ref(db, 'rooms/' + params.rooms ), {
            votes: [0,0,0,0,0,0,0,0]
        })  
    }
    return (
        <main className="container">
            <section>
                <h3>Administracion de {params.rooms}</h3>
                <form onSubmit={handleStoryForm}>
                    <input type="text" id="story" name="story" placeholder="Historia" required />
                    <button type='submit'>Actualizar</button>
                </form>
                <button onClick={handleReset}>Reset Votacion</button>
            </section>
        </main>
    )
}