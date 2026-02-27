import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900/75 p-8 text-center shadow-2xl shadow-slate-950/40">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-300">404</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">Página no encontrada</h2>
        <p className="mt-3 text-slate-400">
          La sala o ruta que intentas abrir no existe o ya no está disponible.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  )
}
