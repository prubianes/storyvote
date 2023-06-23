export default function Aside({ users, votes}) {
    const numberOfVotes = votes.reduce((partial, a) => partial+a, 0)
    return (
        <aside>
            <article>
                <h6>Votos emitidos: {numberOfVotes}</h6>
                <br />
                <h6>Usuarios Conectados</h6>
                <ul>
                    {users ? users.map((user) => {return <li key={user}>{user}</li>}) : ''}
                </ul>
            </article>
        </aside>
    )
}