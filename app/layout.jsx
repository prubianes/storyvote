import './globals.css'
import Header from '@/components/header/header'
import UserContextProvider from '@/components/RoomContext/roomContextProvider'

export const metadata = {
  title: 'StoryVote',
  description: 'Realtime vote!',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <UserContextProvider>
          <Header />
          {children}
        </UserContextProvider>
      </body>
    </html>
  )
}
