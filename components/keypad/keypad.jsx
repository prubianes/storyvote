import { db } from '@/system/firebase'
import { ref, update } from 'firebase/database'
import { useEffect, useState } from 'react'

export default function Keypad( {votes, room} ) {
    const values = [1,2,3,5,8,13,20,'X']
    const [userVote, setUserVote] = useState([false, 0])
    const [maxVotes, setMaxVotes] = useState(1)

    useEffect(() => {
        const max = votes.reduce((partial, a) => partial+a, 0)
        setMaxVotes(max)
        if(max === 0){
            if(userVote[1] !== 0){
                const button = document.getElementById(userVote[1]).classList.remove('contrast')
                updateVoteState(0, false);
            }
        }
    }, [votes])
    
    const handleVote = (vote) => {
        let indexValue = values.indexOf(vote)
        if(!userVote[0]){
            const newVotes = votes.map((total, index) => {
                if ( index === indexValue){
                    return total + 1
                } else {
                    return total
                }
            })
            const button = document.getElementById(vote).classList.add('contrast')
            updateVoteState(vote, true)
            writeVotesDB(newVotes)
        } else {
            if(vote === userVote[1]){
                const newVotes = votes.map((total, index) => {
                    if ( index === indexValue){
                        return total - 1
                    } else {
                        return total
                    }
                })
                const button = document.getElementById(vote).classList.remove('contrast')
                updateVoteState(0, false)
                writeVotesDB(newVotes)
            }
        }
    }
    
    const buttonList = values.map(value => (
        <button key={value} id={value} onClick={() => handleVote(value)}>{value}</button>
    ))

    const progressList = values.map((value, index) => (
        <div key={'key'+value}>
            {value}
            <progress value={votes[index]} max={maxVotes} />
        </div>
        )
    )
    
    const updateVoteState = (vote, haveVote) => {
        setUserVote([haveVote, vote])
    }

    const writeVotesDB = (newVotes) => {
        update(ref(db, 'rooms/' + room ), {
            votes: newVotes
        })
    }
    
    return (
        <>
            <section className='grid'>
                {buttonList}
            </section>
            {progressList}
        </>
    )

}