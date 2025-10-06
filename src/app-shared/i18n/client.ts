'use client'

import { createTranslator } from 'next-intl'
import { useSettingsStore } from "@/app-shared/store/settings-store"
import { useMemo } from 'react'

import enMessages from '../messages/en.json'
import deMessages from '../messages/de.json'

const messages = {
  'en-US': enMessages,
  'de-DE': deMessages
}

export function useTranslations() {
  const { locale } = useSettingsStore()
  
  const t = useMemo(() => {
    // Convert 'en-US' -> 'en', 'de-DE' -> 'de' for message lookup
    const messageLocale = locale === 'de-DE' ? 'de-DE' : 'en-US'
    const translator = createTranslator({
      locale: messageLocale,
      messages: messages[messageLocale]
    })
    return translator
  }, [locale])

  return t
}