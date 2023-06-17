export default function Aside({ users }) {

    return (
        <aside>
            <article>
                <h6>Usuarios Conectados</h6>
                <ul>
                    {users ? users.map((user) => {return <li key={user}>{user}</li>}) : ''}
                </ul>
            </article>
        </aside>
    )
}