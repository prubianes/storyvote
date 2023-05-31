import { useState } from 'react'

export default function Keypad() {
    const values = [1,2,3,5,8,13,20,'X']
    const [votes, setVotes] = useState([0,0,0,0,0,0,0,0])
    const [userVote, setUserVote] = useState([false, 0])
    
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
            updateStates(newVotes, vote, true)
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
                updateStates(newVotes, 0, false)
            }
        }
    }
    
    const buttonList = values.map(value => (
        <button id={value} onClick={() => handleVote(value)}>{value}</button>
    ))
    const progressList = values.map((value, index) => (
        <>
            {value}
            <progress value={votes[index]} max={4} />
        </>
        )
    )
    
    const updateStates = (newVotes, vote, haveVote) => {
        setVotes(newVotes)
        setUserVote([haveVote, vote])
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