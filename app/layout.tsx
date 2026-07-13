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
      <head>
        <link rel="icon" href="/icon-light.svg" type="image/svg+xml" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/icon-dark.svg" type="image/svg+xml" media="(prefers-color-scheme: dark)" />
      </head>
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
