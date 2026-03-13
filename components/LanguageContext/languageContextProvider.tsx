'use client'

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

type Language = 'es' | 'en'

const translations = {
  es: {
    'header.greeting': 'Hola {user}',
    'header.exit': 'Salir',
    'header.themeModeLight': 'claro',
    'header.themeModeDark': 'oscuro',
    'header.themeAria': 'Activar modo {mode}',
    'header.languageAria': 'Cambiar idioma a {lang}',
    'header.languageNameEs': 'espanol',
    'header.languageNameEn': 'ingles',

    'home.badge': 'Planning Poker',
    'home.welcome': 'Bienvenidos a StoryVote',
    'home.description': 'Ingresa tu nombre y una sala para comenzar a votar historias en tiempo real.',
    'home.name': 'Nombre',
    'home.namePlaceholder': 'Tu nombre',
    'home.room': 'Sala',
    'home.roomPlaceholder': 'ejemplo-equipo-mobile',
    'home.adminPasscodeOptional': 'Passcode admin (opcional)',
    'home.adminPasscodePlaceholder': 'Solo para quien crea la sala',
    'home.entering': 'Entrando...',
    'home.enter': 'Entrar',
    'home.newRoomNeedsPasscode': 'Para crear una sala nueva debes definir passcode admin.',
    'home.featureTitle': 'Salas en tiempo real.',
    'home.featureBody': 'StoryVote convierte la estimacion en un ritual visible, no en una tarea de planilla.',
    'home.metricBody': 'Secuencia Fibonacci, votos en vivo, historial de rondas y controles de admin en una sola superficie.',

    'room.currentStory': 'Historia actual',
    'room.undefinedStory': 'Sin historia definida',

    'aside.votesCast': 'Votos emitidos',
    'aside.connectedUsers': 'Usuarios conectados',

    'keypad.openRoundMessage': 'Votacion abierta. Selecciona tu carta.',
    'keypad.closedRoundMessage': 'La ronda esta cerrada. Un admin debe iniciar una nueva ronda.',
    'keypad.noActiveRound': 'No hay ronda activa.',
    'keypad.voteError': 'Error al votar.',

    'history.title': 'Historial de rondas',
    'history.empty': 'Aun no hay rondas cerradas.',
    'history.roundLabel': 'Ronda {number}',
    'history.roundTitle': 'Historia: {story}',
    'history.noStory': 'Sin historia',
    'history.votes': 'Votos: {count}',
    'history.votesWord': 'votos',
    'history.roundScore': 'Puntaje de ronda: {decision}',
    'history.tie': 'Empate',
    'history.start': 'Inicio',
    'history.close': 'Cierre',
    'history.noVotes': 'Sin votos registrados.',
    'history.voteLabel': 'Voto: {value}',

    'admin.roundOpen': 'Ronda abierta',
    'admin.roundClosed': 'Ronda cerrada',
    'admin.invalidPasscode': 'Passcode invalido.',
    'admin.passcodeValidationError': 'No fue posible validar el passcode.',
    'admin.storyOnlyWhenOpen': 'Solo puedes actualizar la historia con la ronda abierta.',
    'admin.storyEmpty': 'La historia no puede estar vacia.',
    'admin.sessionExpired': 'La sesion de admin expiro. Ingresa nuevamente.',
    'admin.storyUpdateFailed': 'No fue posible actualizar la historia.',
    'admin.resetFailed': 'No fue posible resetear la votacion.',
    'admin.storyRequiredToOpen': 'Debes ingresar una historia antes de abrir una nueva ronda.',
    'admin.closeRoundFailed': 'No fue posible cerrar la ronda.',
    'admin.openRoundFailed': 'No fue posible abrir una nueva ronda.',
    'admin.exportWindowFailed': 'No fue posible abrir la ventana de exportacion.',
    'admin.modeButton': 'Modo admin',
    'admin.modeTitle': 'Modo Admin',
    'admin.modeDescription': 'Ingresa passcode para habilitar controles.',
    'admin.entering': 'Validando...',
    'admin.enter': 'Entrar',
    'admin.cancel': 'Cancelar',
    'admin.panelTitle': 'Panel Admin',
    'admin.storyPlaceholder': 'Historia de la ronda',
    'admin.closeRound': 'Cerrar ronda',
    'admin.openRound': 'Abrir ronda',
    'admin.saving': 'Guardando...',
    'admin.updateStory': 'Actualizar historia',
    'admin.resetVotes': 'Resetear votos',
    'admin.exporting': 'Exportando...',
    'admin.exportHistoryPdf': 'Exportar historial (PDF)',
    'admin.pdfDocumentTitle': 'Historial de votaciones - {room}',
    'admin.pdfMainTitle': 'Historial de votaciones',
    'admin.pdfRoom': 'Sala: {room}',
    'admin.pdfExportedAt': 'Exportado: {date}',
    'admin.pdfTotalRounds': 'Total de rondas: {count}',
    'admin.pdfColRound': '#',
    'admin.pdfColStory': 'Historia',
    'admin.pdfColScore': 'Puntaje',
    'admin.pdfColTotalVotes': 'Total votos',
    'admin.pdfColStart': 'Inicio',
    'admin.pdfColClose': 'Cierre',
    'admin.pdfColDistribution': 'Distribucion',
  },
  en: {
    'header.greeting': 'Hi {user}',
    'header.exit': 'Exit',
    'header.themeModeLight': 'light',
    'header.themeModeDark': 'dark',
    'header.themeAria': 'Switch to {mode} mode',
    'header.languageAria': 'Switch language to {lang}',
    'header.languageNameEs': 'Spanish',
    'header.languageNameEn': 'English',

    'home.badge': 'Planning Poker',
    'home.welcome': 'Welcome to StoryVote',
    'home.description': 'Enter your name and a room to start voting stories in real time.',
    'home.name': 'Name',
    'home.namePlaceholder': 'Your name',
    'home.room': 'Room',
    'home.roomPlaceholder': 'example-mobile-team',
    'home.adminPasscodeOptional': 'Admin passcode (optional)',
    'home.adminPasscodePlaceholder': 'Only for the room creator',
    'home.entering': 'Joining...',
    'home.enter': 'Join',
    'home.newRoomNeedsPasscode': 'To create a new room you must define an admin passcode.',
    'home.featureTitle': 'Realtime rooms.',
    'home.featureBody': 'StoryVote turns estimation into a visible ritual instead of a spreadsheet chore.',
    'home.metricBody': 'Fibonacci deck, live presence, round history, and admin controls in one surface.',

    'room.currentStory': 'Current story',
    'room.undefinedStory': 'No story selected',

    'aside.votesCast': 'Votes cast',
    'aside.connectedUsers': 'Connected users',

    'keypad.openRoundMessage': 'Voting is open. Pick your card.',
    'keypad.closedRoundMessage': 'Round is closed. An admin must start a new round.',
    'keypad.noActiveRound': 'No active round.',
    'keypad.voteError': 'Error while voting.',

    'history.title': 'Round history',
    'history.empty': 'There are no closed rounds yet.',
    'history.roundLabel': 'Round {number}',
    'history.roundTitle': 'Story: {story}',
    'history.noStory': 'No story',
    'history.votes': 'Votes: {count}',
    'history.votesWord': 'votes',
    'history.roundScore': 'Round score: {decision}',
    'history.tie': 'Tie',
    'history.start': 'Start',
    'history.close': 'Close',
    'history.noVotes': 'No votes recorded.',
    'history.voteLabel': 'Vote: {value}',

    'admin.roundOpen': 'Round open',
    'admin.roundClosed': 'Round closed',
    'admin.invalidPasscode': 'Invalid passcode.',
    'admin.passcodeValidationError': 'Could not validate passcode.',
    'admin.storyOnlyWhenOpen': 'You can only update story while the round is open.',
    'admin.storyEmpty': 'Story cannot be empty.',
    'admin.sessionExpired': 'Admin session expired. Sign in again.',
    'admin.storyUpdateFailed': 'Could not update story.',
    'admin.resetFailed': 'Could not reset voting.',
    'admin.storyRequiredToOpen': 'You must provide a story before opening a new round.',
    'admin.closeRoundFailed': 'Could not close round.',
    'admin.openRoundFailed': 'Could not open a new round.',
    'admin.exportWindowFailed': 'Could not open export window.',
    'admin.modeButton': 'Admin mode',
    'admin.modeTitle': 'Admin mode',
    'admin.modeDescription': 'Enter passcode to enable controls.',
    'admin.entering': 'Checking...',
    'admin.enter': 'Enter',
    'admin.cancel': 'Cancel',
    'admin.panelTitle': 'Admin panel',
    'admin.storyPlaceholder': 'Round story',
    'admin.closeRound': 'Close round',
    'admin.openRound': 'Open round',
    'admin.saving': 'Saving...',
    'admin.updateStory': 'Update story',
    'admin.resetVotes': 'Reset votes',
    'admin.exporting': 'Exporting...',
    'admin.exportHistoryPdf': 'Export history (PDF)',
    'admin.pdfDocumentTitle': 'Voting history - {room}',
    'admin.pdfMainTitle': 'Voting history',
    'admin.pdfRoom': 'Room: {room}',
    'admin.pdfExportedAt': 'Exported: {date}',
    'admin.pdfTotalRounds': 'Total rounds: {count}',
    'admin.pdfColRound': '#',
    'admin.pdfColStory': 'Story',
    'admin.pdfColScore': 'Score',
    'admin.pdfColTotalVotes': 'Total votes',
    'admin.pdfColStart': 'Start',
    'admin.pdfColClose': 'Close',
    'admin.pdfColDistribution': 'Distribution',
  },
} as const

type TranslationKey = keyof (typeof translations)['es']

interface I18nContextValue {
  language: Language
  locale: string
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue>({
  language: 'es',
  locale: 'es-ES',
  setLanguage: () => undefined,
  toggleLanguage: () => undefined,
  t: (key) => key,
})

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) {
    return template
  }

  return template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`))
}

interface I18nProviderProps {
  children: ReactNode
}

export default function LanguageContextProvider({ children }: I18nProviderProps) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') {
      return 'es'
    }
    const savedLanguage = localStorage.getItem('storyvote_language')
    return savedLanguage === 'en' || savedLanguage === 'es' ? savedLanguage : 'es'
  })

  useEffect(() => {
    localStorage.setItem('storyvote_language', language)
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<I18nContextValue>(() => {
    const nextLanguage: Language = language === 'es' ? 'en' : 'es'
    const locale = language === 'es' ? 'es-ES' : 'en-US'

    return {
      language,
      locale,
      setLanguage,
      toggleLanguage: () => setLanguage(nextLanguage),
      t: (key, params) => interpolate(translations[language][key], params),
    }
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
