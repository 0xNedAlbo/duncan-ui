import enMessages from '@/messages/en.json'
import deMessages from '@/messages/de.json'

type Messages = typeof enMessages

function getBrowserLocale(): 'de' | 'en' {
  if (typeof window === 'undefined') return 'en'
  
  // Check localStorage first (same key as settings store)
  try {
    const stored = localStorage.getItem('duncan-settings')
    if (stored) {
      const settings = JSON.parse(stored)
      if (settings.state?.locale === 'de-DE') return 'de'
      if (settings.state?.locale === 'en-US') return 'en'
    }
  } catch {}

  // Fall back to browser language
  const browserLang = navigator.language.toLowerCase()
  return browserLang.startsWith('de') ? 'de' : 'en'
}

export function useAuthTranslations() {
  const locale = getBrowserLocale()
  const messages = locale === 'de' ? deMessages : enMessages
  
  return {
    t: (key: string) => {
      const keys = key.split('.')
      let value: any = messages
      
      for (const k of keys) {
        value = value?.[k]
        if (value === undefined) break
      }
      
      return value || key
    }
  }
}