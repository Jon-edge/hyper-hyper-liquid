"use client"

import React from 'react'
import { usePosition } from '@/context/PositionContext'
import TradingViewChart from './TradingViewChart'
import { Panel } from '@/components/ui'

const ChartView: React.FC = () => {
  const { selectedPosition } = usePosition()
  
  return (
    <div className="w-full h-full">
      {selectedPosition ? (
        <TradingViewChart 
          symbol={selectedPosition.position.coin} 
          theme="dark"
          autosize={true}
        />
      ) : (
        <Panel variant="gray" className="h-full flex items-center justify-center">
          <p className="text-gray-500">Select a position to view chart</p>
        </Panel>
      )}
    </div>
  )
}

export default ChartView
