import './pico.min.css'
import './globals.css'
import Header from '@/components/header/header'
import UserContextProvider from '@/components/RoomContext/roomContextProvider'

export const metadata = {
    title: 'StoryVote',
    description: 'Realtime vote!',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <UserContextProvider>
                    <Header />
                    {children}
                </UserContextProvider>
            </body>
        </html>
    )
}