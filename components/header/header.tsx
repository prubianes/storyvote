'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'

import { RoomContext } from '../RoomContext/roomContextProvider'
import { markParticipantLeft } from '@/system/supabase'
import { useI18n } from '@/components/LanguageContext/languageContextProvider'

export default function Header() {
  const { user, setUser, room, setRoom } = useContext(RoomContext)
  const { language, toggleLanguage, t } = useI18n()
  const router = useRouter()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const savedUser = sessionStorage.getItem('user') || localStorage.getItem('user')
    if (savedUser) {
      setUser(savedUser)
    }
  }, [setUser])

  useEffect(() => {
    const savedTheme = localStorage.getItem('storyvote_theme')
    const nextTheme = savedTheme === 'light' ? 'light' : 'dark'
    setTheme(nextTheme)
    document.documentElement.classList.toggle('theme-light', nextTheme === 'light')
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    document.documentElement.classList.toggle('theme-light', nextTheme === 'light')
    localStorage.setItem('storyvote_theme', nextTheme)
  }

  const resetAll = async () => {
    const storedRoom = sessionStorage.getItem('room') || localStorage.getItem('room')
    const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user')
    const roomToLeave = room || storedRoom || ''
    const userToLeave = user || storedUser || ''

    if (roomToLeave && userToLeave) {
      await markParticipantLeft(roomToLeave, userToLeave).catch(() => undefined)
      await fetch(`/api/admin/session?room=${encodeURIComponent(roomToLeave)}`, {
        method: 'DELETE',
      }).catch(() => undefined)
    }

    sessionStorage.removeItem('user')
    sessionStorage.removeItem('room')
    localStorage.removeItem('user')
    localStorage.removeItem('room')
    setUser('')
    setRoom('')
    router.push('/')
  }

  return (
    <header className="app-header mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="brand-stack">
        <div className="brand-badge">
          <Image src="/logo.svg" width={26} height={26} alt="StoryVote Logo" priority className="theme-logo" />
        </div>
        <div>
          <span className="brand-meta">Planning poker</span>
          <h1 className="brand-name">{room ? `StoryVote @ ${room}` : 'StoryVote'}</h1>
        </div>
      </div>

      <div className="header-controls">
        {user ? (
          <div className="user-slab">
            <span className="user-slab-item">{room ? `${user} @ ${room}` : user}</span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={toggleLanguage}
          className="ui-btn header-lang-btn"
          aria-label={t('header.languageAria', {
            lang: language === 'es' ? t('header.languageNameEn') : t('header.languageNameEs'),
          })}
        >
          {language === 'es' ? 'EN' : 'ES'}
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="ui-btn is-cyan header-theme-btn"
          aria-label={t('header.themeAria', {
            mode: theme === 'dark' ? t('header.themeModeLight') : t('header.themeModeDark'),
          })}
        >
          {theme === 'dark' ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <circle cx="12" cy="12" r="5" className="fill-current opacity-90" />
              <path
                className="fill-current opacity-45"
                d="M12 2a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 17a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm10-8a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2h2ZM4 11a1 1 0 1 1 0 2H2a1 1 0 1 1 0-2h2Zm13.66-5.24a1 1 0 0 1 1.41 0l1.42 1.41a1 1 0 1 1-1.42 1.42l-1.41-1.42a1 1 0 0 1 0-1.41Zm-12.73 0a1 1 0 0 1 1.41 1.41L4.93 8.59A1 1 0 1 1 3.5 7.17l1.43-1.41Zm14.15 12.73a1 1 0 0 1 1.41 1.41l-1.42 1.42a1 1 0 1 1-1.41-1.42l1.42-1.41ZM4.93 17.08a1 1 0 0 1 1.41 0l1.42 1.41a1 1 0 1 1-1.42 1.42L4.93 18.5a1 1 0 0 1 0-1.42Z"
              />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path
                className="fill-current opacity-90"
                d="M18.5 14.5a7 7 0 0 1-8.97-8.98A8 8 0 1 0 18.5 14.5Z"
              />
              <circle cx="16.5" cy="7.5" r="1.5" className="fill-current opacity-45" />
              <circle cx="18.8" cy="10.2" r="1" className="fill-current opacity-45" />
            </svg>
          )}
        </button>

        {user ? (
          <button type="button" onClick={resetAll} className="ui-btn is-red header-exit-btn">
            {t('header.exit')}
          </button>
        ) : null}
      </div>
    </header>
  )
}
