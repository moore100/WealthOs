export interface BinanceKline {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closeTime: number
}

export interface BinanceTicker {
  symbol: string
  price: string
  priceChange: string
  priceChangePercent: string
  highPrice: string
  lowPrice: string
  volume: string
  quoteVolume: string
}

export async function fetchBinanceKlines(
  symbol: string,
  interval: string = '1h',
  limit: number = 100
): Promise<BinanceKline[]> {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  )
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`)
  const data = await res.json()
  return data.map((d: any[]) => ({
    openTime: d[0],
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5]),
    closeTime: d[6],
  }))
}

export async function fetchBinancePrice(symbol: string): Promise<{ price: string }> {
  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
  if (!res.ok) throw new Error(`Binance price error: ${res.status}`)
  return res.json()
}

export async function fetchBinance24hr(symbol: string): Promise<{
  priceChange: string
  priceChangePercent: string
  lastPrice: string
  highPrice: string
  lowPrice: string
  volume: string
}> {
  const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`)
  if (!res.ok) throw new Error(`Binance 24hr error: ${res.status}`)
  return res.json()
}

let exchangeInfoCache: { symbols: { symbol: string; baseAsset: string; quoteAsset: string }[] } | null = null

export async function fetchBinanceSymbols(): Promise<
  { symbol: string; baseAsset: string; quoteAsset: string }[]
> {
  if (exchangeInfoCache) return exchangeInfoCache.symbols.filter(s => s.quoteAsset === 'USDT')
  const res = await fetch('https://api.binance.com/api/v3/exchangeInfo')
  if (!res.ok) throw new Error(`Binance exchangeInfo error: ${res.status}`)
  const data = await res.json()
  exchangeInfoCache = data
  return data.symbols.filter((s: any) => s.quoteAsset === 'USDT' && s.status === 'TRADING').map((s: any) => ({
    symbol: s.symbol,
    baseAsset: s.baseAsset,
    quoteAsset: s.quoteAsset,
  }))
}

export function createBinanceWebSocket(symbol: string, onMessage: (data: BinanceTicker) => void): WebSocket {
  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`)
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    onMessage({
      symbol: data.s,
      price: data.c,
      priceChange: data.p,
      priceChangePercent: data.P,
      highPrice: data.h,
      lowPrice: data.l,
      volume: data.v,
      quoteVolume: data.q,
    })
  }
  return ws
}
