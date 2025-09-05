'use client'

import { useState } from 'react'
import { X, Settings, Globe, DollarSign, Bell } from 'lucide-react'
import { useSettingsStore } from '@/store/settings-store'
import { useTranslations } from '@/i18n/client'

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false)
  const { 
    locale, 
    currency, 
    notifications, 
    setLocale, 
    setCurrency, 
    setNotifications 
  } = useSettingsStore()
  const t = useTranslations()

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
        title={t('settings.title')}
      >
        <Settings size={20} />
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Settings size={20} />
              {t('settings.title')}
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            
            {/* Language Setting */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Globe size={16} />
                {t('settings.language')}
              </label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="en-US">English (US)</option>
                <option value="de-DE">Deutsch (DE)</option>
              </select>
            </div>

            {/* Currency Setting */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <DollarSign size={16} />
                {t('settings.currency')}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            {/* Notifications Setting */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Bell size={16} />
                {t('settings.notifications')}
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications 
                      ? 'bg-blue-600' 
                      : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-slate-400">
                  {notifications ? t('settings.enabled') : t('settings.disabled')}
                </span>
              </div>
            </div>

            {/* Future Settings Placeholder */}
            <div className="pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                {t('settings.moreComing')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-700">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {t('common.done')}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}