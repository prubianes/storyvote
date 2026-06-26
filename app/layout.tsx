import type { ReactNode } from 'react'

import './globals.css'
import Header from '@/components/header/header'
import UserContextProvider from '@/components/RoomContext/roomContextProvider'
import LanguageContextProvider from '@/components/LanguageContext/languageContextProvider'

export const metadata = {
  title: 'StoryVote',
  description: 'Realtime vote!',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>
        <LanguageContextProvider>
          <UserContextProvider>
            <Header />
            {children}
          </UserContextProvider>
        </LanguageContextProvider>
      </body>
    </html>
  )
}
