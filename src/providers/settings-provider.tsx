'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type SupportedLocale = 'en-US' | 'de-DE'

type SettingsContextType = {
  locale: SupportedLocale
  setLocale: (locale: SupportedLocale) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en-US')

  // Load persisted locale on mount
  useEffect(() => {
    const stored = localStorage.getItem('duncan-settings-locale')
    if (stored === 'en-US' || stored === 'de-DE') {
      setLocaleState(stored)
    }
  }, [])

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale)
    localStorage.setItem('duncan-settings-locale', newLocale)
  }

  return (
    <SettingsContext.Provider value={{ locale, setLocale }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}