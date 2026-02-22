export default function Aside({ users, votes }) {
  const numberOfVotes = votes.reduce((partial, value) => partial + value, 0)

  return (
    <aside className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/30">
      <p className="text-sm text-slate-400">Votos emitidos</p>
      <h3 className="mb-4 text-2xl font-semibold text-cyan-300">{numberOfVotes}</h3>

      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        Usuarios conectados
      </h4>
      <ul className="space-y-2 text-sm text-slate-200">
        {(users ?? []).map((user) => (
          <li key={user} className="rounded-md bg-slate-800/90 px-3 py-2">
            {user}
          </li>
        ))}
      </ul>
    </aside>
  )
}
