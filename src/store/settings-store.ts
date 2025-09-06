import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type SupportedLocale = 'en-US' | 'de-DE'

export type SettingsState = {
  locale: SupportedLocale
  
  // Actions
  setLocale: (locale: SupportedLocale) => void
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        locale: 'en-US',

        // Actions
        setLocale: (locale) => set({ locale })
      }),
      { 
        name: 'duncan-settings',
        // Only persist certain fields
        partialize: (state) => ({ 
          locale: state.locale
        })
      }
    ),
    { name: 'duncan-settings-store' }
  )
)