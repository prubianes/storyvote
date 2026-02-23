import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: Promise<{ rooms: string }> }) {
  const resolved = await params
  redirect(`/${resolved.rooms}`)
}
