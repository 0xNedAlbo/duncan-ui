'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { usePositionStore } from '@/store/position-store'
import { SettingsModal } from '@/components/settings-modal'
import { PnLCurve } from '@/components/pnl-curve'
import { getExamplePosition } from '@/lib/calculations/pnl'
import { useTranslations } from '@/i18n/client'
import { useAccount } from 'wagmi'
import { useState, useEffect } from 'react'

export default function Home() {
  const { selectedChain, currentPosition } = usePositionStore()
  const { isConnected } = useAccount()
  const t = useTranslations()
  const [hasMounted, setHasMounted] = useState(false)
  
  // Example position data for demonstration
  const examplePosition = getExamplePosition()

  useEffect(() => {
    setHasMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {t('header.title')}
            </h1>
            <p className="text-lg text-slate-300">
              {t('header.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SettingsModal />
            {hasMounted && isConnected && <ConnectButton />}
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Position Planner */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-xl p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-semibold mb-4 text-white">
              {t('positionPlanner.title')}
            </h2>
            <p className="text-slate-300 mb-6">
              {t('positionPlanner.description')}
            </p>
            
            {/* Wallet Connection or Position Form */}
            <div className="space-y-4">
              {!hasMounted ? (
                <div className="p-4 border-2 border-dashed border-slate-600 rounded-lg text-center bg-slate-900/30">
                  <p className="text-slate-400">
                    {t('common.loading')}
                  </p>
                </div>
              ) : !isConnected ? (
                <div className="p-8 border-2 border-dashed border-slate-600 rounded-lg text-center bg-slate-900/30">
                  <p className="text-slate-400 mb-4">
                    {t('positionPlanner.connectWallet')}
                  </p>
                  <ConnectButton />
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-slate-600 rounded-lg text-center bg-slate-900/30">
                  <p className="text-slate-400">
                    {t('positionPlanner.comingSoon')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* PnL Curve Visualization */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-xl p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-semibold mb-4 text-white">
              {t('riskVisualization.title')}
            </h2>
            <p className="text-slate-300 mb-6">
              {t('riskVisualization.description')}
            </p>
            
            {/* PnL Curve Visualization */}
            <PnLCurve 
              params={examplePosition}
              height={350}
              className="bg-slate-900/30 rounded-lg p-4"
            />
            
            {/* Position Details */}
            <div className="mt-4 p-4 bg-slate-900/30 rounded-lg border border-slate-600">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Position Size:</span>
                  <span className="text-white ml-2 font-mono">
                    ${((examplePosition.initialBaseAmount * examplePosition.entryPrice) + examplePosition.initialQuoteAmount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Entry Price:</span>
                  <span className="text-white ml-2 font-mono">${examplePosition.entryPrice.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400">Range:</span>
                  <span className="text-white ml-2 font-mono">
                    ${examplePosition.lowerPrice.toLocaleString()} - ${examplePosition.upperPrice.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Asset Pair:</span>
                  <span className="text-white ml-2 font-mono">WETH/USDC</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Status Info */}
        <div className="mt-8 p-4 bg-slate-800/30 border border-slate-700 rounded-lg backdrop-blur-sm">
          <p className="text-sm text-slate-400">
            {t('status.selectedChain')}: {selectedChain} | 
            {t('status.currentPosition')}: {currentPosition ? t('status.active') : t('status.none')} |
            {t('status.developmentMode')}
          </p>
        </div>

      </div>
    </div>
  )
}