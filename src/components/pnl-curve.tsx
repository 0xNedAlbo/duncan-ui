'use client'

import { useMemo } from 'react'
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, Tooltip } from 'recharts'
import { generatePnLCurve, PnLPoint } from '@/lib/utils/uniswap-v3/position'
import { useTranslations } from '@/i18n/client'
import { formatFractionHuman } from '@/lib/utils/fraction-format'

interface ModernPositionParams {
  liquidity: bigint;
  tickLower: number;
  tickUpper: number;
  initialValue: bigint;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  baseTokenDecimals: number;
  tickSpacing: number;
  priceRange: { min: bigint; max: bigint };
  currentPrice: bigint;
  // For display purposes
  entryPrice: number;
  lowerPrice: number;
  upperPrice: number;
}

interface PnLCurveProps {
  params: ModernPositionParams
  width?: number
  height?: number
  className?: string
}

export function PnLCurve({ params, width, height = 400, className }: PnLCurveProps) {
  const t = useTranslations()
  
  const curveData = useMemo(() => {
    const data = generatePnLCurve(
      params.liquidity,
      params.tickLower,
      params.tickUpper,
      params.initialValue,
      params.baseTokenAddress,
      params.quoteTokenAddress,
      params.baseTokenDecimals,
      params.tickSpacing,
      params.priceRange
    )
    
    // Convert BigInt values to numbers for display and add background color data
    return data.map(point => {
      const priceDisplay = Number(point.price) / Math.pow(10, params.baseTokenDecimals);
      const pnlDisplay = Number(point.pnl) / Math.pow(10, params.baseTokenDecimals); // Assuming quote token has same decimals
      
      return {
        price: priceDisplay,
        positionValue: Number(point.positionValue) / Math.pow(10, params.baseTokenDecimals),
        pnl: pnlDisplay,
        pnlPercent: point.pnlPercent,
        phase: point.phase,
        profitZone: pnlDisplay > 0 ? pnlDisplay : null,
        lossZone: pnlDisplay < 0 ? pnlDisplay : null
      }
    })
  }, [params])

  const { entryPrice, lowerPrice, upperPrice } = params

  // Custom dot component for entry point
  const CustomDot = (props: any) => {
    const { payload, cx, cy } = props
    // Show empty circle only at entry price
    if (payload && Math.abs(payload.price - entryPrice) < 10) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="transparent"
          stroke="#60a5fa"
          strokeWidth={2}
        />
      )
    }
    return <></>
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    
    const data = payload[0].payload
    // Handle scatter points that might not have all properties
    if (!data.hasOwnProperty('positionValue')) return null
    
    // Determine actual profit/loss status based on PnL value
    const isProfitable = data.pnl > 0
    const statusLabel = isProfitable ? t('pnlCurve.feeZone') : t('pnlCurve.lossZone')
    const statusColor = isProfitable ? 'text-green-400' : 'text-red-400'
    
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl backdrop-blur-sm">
        <p className="text-slate-300 text-sm">
          <strong>{t('pnlCurve.price')}:</strong> ${Number(label).toLocaleString()}
        </p>
        <p className="text-slate-300 text-sm">
          <strong>{t('pnlCurve.positionValue')}:</strong> ${data.positionValue.toLocaleString()}
        </p>
        <p className={`text-sm font-medium ${data.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          <strong>{t('pnlCurve.pnl')}:</strong> ${data.pnl.toLocaleString()} ({data.pnlPercent.toFixed(2)}%)
        </p>
        <p className={`text-xs ${statusColor}`}>
          {t('pnlCurve.phase')}: {statusLabel}
        </p>
      </div>
    )
  }

  // Create background areas for the three phases
  const backgroundAreas = useMemo(() => {
    const minPrice = Math.min(...curveData.map(d => d.price))
    const maxPrice = Math.max(...curveData.map(d => d.price))
    
    return [
      // Red zone (below range)
      { 
        x1: minPrice, 
        x2: lowerPrice, 
        fill: 'rgba(239, 68, 68, 0.1)',
        label: 'Verlust Zone'
      },
      // Green zone (in range)  
      {
        x1: lowerPrice,
        x2: upperPrice, 
        fill: 'rgba(34, 197, 94, 0.1)',
        label: 'Fee Zone'
      },
      // Yellow zone (above range)
      {
        x1: upperPrice,
        x2: maxPrice,
        fill: 'rgba(245, 158, 11, 0.1)', 
        label: 'Plateau'
      }
    ]
  }, [curveData, lowerPrice, upperPrice])

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={curveData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          
          {/* Background zones based on profit/loss */}
          <Area
            type="monotone"
            dataKey="profitZone"
            fill="rgba(34, 197, 94, 0.3)"
            stroke="transparent"
            connectNulls={false}
          />
          <Area
            type="monotone"
            dataKey="lossZone"
            fill="rgba(239, 68, 68, 0.3)"
            stroke="transparent"
            connectNulls={false}
          />
          
          <XAxis 
            dataKey="price"
            type="number"
            scale="linear"
            domain={['dataMin', 'dataMax']}
            ticks={[lowerPrice, entryPrice, upperPrice]}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            stroke="#94a3b8"
            fontSize={12}
            axisLine={{ stroke: '#475569' }}
          />
          
          <YAxis 
            domain={['dataMin - 500', 'dataMax + 500']}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            stroke="#94a3b8"
            fontSize={12}
            axisLine={{ stroke: '#475569' }}
            tick={(props) => {
              const { x, y, payload } = props
              const isZero = payload.value === 0
              return (
                <text
                  x={x}
                  y={y}
                  dy={4}
                  textAnchor="end"
                  fill={isZero ? "#e2e8f0" : "#94a3b8"}
                  fontSize={12}
                  fontWeight={isZero ? "bold" : "normal"}
                >
                  ${payload.value.toLocaleString()}
                </text>
              )
            }}
          />
          
          
          {/* Lower range boundary */}
          <ReferenceLine 
            x={lowerPrice} 
            stroke="#06b6d4"
            strokeWidth={2}
            strokeDasharray="8 4"
          />
          
          {/* Upper range boundary */}
          <ReferenceLine 
            x={upperPrice} 
            stroke="#06b6d4" 
            strokeWidth={2}
            strokeDasharray="8 4"
          />
          
          {/* Break-even line (PnL = 0) */}
          <ReferenceLine 
            y={0} 
            stroke="#64748b" 
            strokeDasharray="3 3"
            strokeWidth={2}
          />
          
          {/* Main PnL curve */}
          <Line 
            type="monotone"
            dataKey="pnl" 
            stroke="#ffffff"
            strokeWidth={3}
            dot={<CustomDot />}
            activeDot={{ 
              r: 6, 
              fill: "#ffffff",
              stroke: "#1e293b",
              strokeWidth: 2
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-1 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500/30 border border-green-500 rounded"></div>
          <span className="text-green-400">{t('pnlCurve.feeZone')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500/30 border border-red-500 rounded"></div>
          <span className="text-red-400">{t('pnlCurve.lossZone')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-cyan-500 rounded"></div>
          <span className="text-cyan-400">{t('pnlCurve.range')}</span>
        </div>
      </div>
    </div>
  )
}