import { getRequestConfig } from 'next-intl/server'
import { SupportedLocale } from "@/app-shared/store/settings-store"

export default getRequestConfig(async () => {
  // In a client-side context, we'll get the locale from our settings store
  // For now, we'll default to 'en' and handle the dynamic part in the client
  const locale = 'en' as SupportedLocale
  
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  }
})