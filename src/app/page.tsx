'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { usePositionStore } from '@/store/position-store'

export default function Home() {
  const { selectedChain, currentPosition } = usePositionStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              DUNCAN
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Uniswap V3 Risk Management Platform
            </p>
          </div>
          <ConnectButton />
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Position Planner */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
              Position Planner
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Plan and analyze your Uniswap V3 liquidity positions with advanced risk metrics.
            </p>
            
            {/* Placeholder for Position Form */}
            <div className="space-y-4">
              <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Position configuration form coming soon...
                </p>
              </div>
            </div>
          </div>

          {/* PnL Curve Visualization */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
              Risk Visualization
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Interactive PnL curve showing the three-phase risk structure.
            </p>
            
            {/* Placeholder for PnL Curve */}
            <div className="aspect-video bg-gradient-to-r from-red-100 via-green-100 to-yellow-100 dark:from-red-900/20 dark:via-green-900/20 dark:to-yellow-900/20 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  PnL Curve Visualization
                </p>
                <div className="flex gap-4 text-sm">
                  <span className="text-red-600">Red Zone</span>
                  <span className="text-green-600">Green Zone</span>
                  <span className="text-yellow-600">Yellow Zone</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Status Info */}
        <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Selected Chain: {selectedChain} | 
            Current Position: {currentPosition ? 'Active' : 'None'} |
            Status: Development Mode
          </p>
        </div>

      </div>
    </div>
  )
}