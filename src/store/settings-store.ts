import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type SupportedLocale = 'en-US' | 'de-DE'

export type SettingsState = {
  locale: SupportedLocale
  
  // Future settings
  currency: 'USD' | 'EUR'
  notifications: boolean
  
  // Actions
  setLocale: (locale: SupportedLocale) => void
  setCurrency: (currency: 'USD' | 'EUR') => void
  setNotifications: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        locale: 'en-US',
        currency: 'USD',
        notifications: true,

        // Actions
        setLocale: (locale) => set({ locale }),
        setCurrency: (currency) => set({ currency }),
        setNotifications: (notifications) => set({ notifications })
      }),
      { 
        name: 'duncan-settings',
        // Only persist certain fields
        partialize: (state) => ({ 
          locale: state.locale,
          currency: state.currency,
          notifications: state.notifications
        })
      }
    ),
    { name: 'duncan-settings-store' }
  )
)