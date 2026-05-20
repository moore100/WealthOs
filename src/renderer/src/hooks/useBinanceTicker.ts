import { useEffect, useRef, useState } from 'react'
import { createBinanceWebSocket, type BinanceTicker } from '@/services/binanceService'

export function useBinanceTicker(symbol: string | null) {
  const [ticker, setTicker] = useState<BinanceTicker | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!symbol) return
    const ws = createBinanceWebSocket(symbol, (data) => {
      setTicker(data)
    })
    wsRef.current = ws
    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [symbol])

  return ticker
}
