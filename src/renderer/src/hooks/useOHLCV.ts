import { useEffect, useState, useCallback } from 'react'
import { fetchBinanceKlines, type BinanceKline } from '@/services/binanceService'
import { fetchFrankfurterHistory, type FrankfurterRate } from '@/services/frankfurterService'

export type OHLCVCandle = {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function useOHLCV(
  type: 'crypto' | 'forex',
  symbol: string,
  interval: string = '1h',
  fromCurrency?: string,
  toCurrency?: string
) {
  const [data, setData] = useState<OHLCVCandle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (type === 'crypto') {
        const klines = await fetchBinanceKlines(symbol, interval, 100)
        const candles = klines.map((k) => ({
          time: new Date(k.openTime).toISOString(),
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
        }))
        setData(candles)
      } else if (type === 'forex' && fromCurrency && toCurrency) {
        const rates = await fetchFrankfurterHistory(fromCurrency, toCurrency, 90)
        const candles = rates.map((r, i) => ({
          time: r.date,
          open: i > 0 ? rates[i - 1].rate : r.rate * 0.998,
          high: r.rate * 1.002,
          low: r.rate * 0.998,
          close: r.rate,
          volume: 0,
        }))
        setData(candles)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [type, symbol, interval, fromCurrency, toCurrency])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}
