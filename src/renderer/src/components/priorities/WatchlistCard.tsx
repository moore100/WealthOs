import { useState, useMemo, useRef, useCallback } from 'react'
import {
  Trash2, CandlestickChart, LineChart as LineChartIcon,
  TrendingUp, TrendingDown, X, Bell, GripVertical, History, ListChecks, DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useBinanceTicker } from '@/hooks/useBinanceTicker'
import { useOHLCV } from '@/hooks/useOHLCV'
import AssetChart from './AssetChart'
import AIAnalysisPanel from './AIAnalysisPanel'
import AITradeSignals, { type TradeSignal } from './AITradeSignals'
import { type HighlightTarget } from './ChartTutorial'
import { fetchBinancePrice } from '@/services/binanceService'
import { fetchFrankfurterLatest } from '@/services/frankfurterService'
import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'

export interface WatchlistItem {
  id: string
  type: 'crypto' | 'forex'
  symbol: string
  displayName: string
  chartType: 'candlestick' | 'line'
  interval: string
  addedAt: string
  lastAnalysis: null
}

interface WatchlistCardProps {
  item: WatchlistItem
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<WatchlistItem>) => void
}

const CRYPTO_INTERVALS = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
]

export default function WatchlistCard({ item, onRemove, onUpdate }: WatchlistCardProps) {
  if (!item || !item.id) return null

  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const [signals, setSignals] = useState<TradeSignal[]>([])
  const [pinnedSignals, setPinnedSignals] = useState<TradeSignal[]>([])
  const [triggeredAlerts, setTriggeredAlerts] = useState<Set<string>>(new Set())
  const [signalChartHighlight, setSignalChartHighlight] = useState<HighlightTarget | null>(null)
  const prevPriceRef = useRef<number | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [signalPanelWidth, setSignalPanelWidth] = useState(420)
  const [activeTab, setActiveTab] = useState<'chart' | 'trades' | 'history'>('chart')
  const [fullscreenTab, setFullscreenTab] = useState<'chart' | 'trades' | 'history'>('chart')
  const [symbolTrades, setSymbolTrades] = useState<any[]>([])
  const [tradesLoading, setTradesLoading] = useState(false)
  const { theme } = useThemeStore()

  // Resizable panel drag handlers
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(420)
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = signalPanelWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [signalPanelWidth])
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return
    const dx = startX.current - e.clientX
    const newWidth = Math.max(280, Math.min(800, startWidth.current + dx))
    setSignalPanelWidth(newWidth)
  }, [])
  const handleResizeEnd = useCallback(() => {
    isResizing.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])
  useEffect(() => {
    if (!fullscreen) return
    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)
    return () => {
      window.removeEventListener('mousemove', handleResizeMove)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [fullscreen, handleResizeMove, handleResizeEnd])
  const resolvedTheme = theme?.mode ?? 'dark'

  const ticker = useBinanceTicker(item.type === 'crypto' ? item.symbol : null)

  const fromTo = useMemo(() => {
    if (item.type === 'forex') {
      // Parse EURUSD format
      const m = item.symbol.match(/^([A-Z]{3})([A-Z]{3})$/)
      if (m) return { from: m[1], to: m[2] }
    }
    return null
  }, [item.type, item.symbol])

  const { data: ohlcvData, loading, error, reload } = useOHLCV(
    item.type,
    item.symbol,
    item.interval,
    fromTo?.from,
    fromTo?.to
  )

  // Live price updates
  useEffect(() => {
    if (item.type === 'crypto' && ticker) {
      const price = parseFloat(ticker.price)
      const change = parseFloat(ticker.priceChangePercent)
      if (isNaN(price)) return
      if (livePrice !== null) {
        if (price > livePrice) setFlash('up')
        else if (price < livePrice) setFlash('down')
        setTimeout(() => setFlash(null), 600)
      }
      setLivePrice(price)
      setPriceChange(change)
    }
  }, [ticker])

  // Forex polling
  useEffect(() => {
    if (item.type !== 'forex' || !fromTo) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetchFrankfurterLatest(fromTo.from, fromTo.to)
        if (!cancelled) {
          const rate = res.rates[fromTo.to]
          if (typeof rate !== 'number' || isNaN(rate)) return
          const prev = livePrice
          if (prev !== null) {
            if (rate > prev) setFlash('up')
            else if (rate < prev) setFlash('down')
            setTimeout(() => setFlash(null), 600)
          }
          setLivePrice(rate)
          // Approximate 24h change from ohlcv close
          if (ohlcvData.length >= 2) {
            const yesterday = ohlcvData[ohlcvData.length - 2].close
            if (yesterday !== 0) setPriceChange(((rate - yesterday) / yesterday) * 100)
          }
        }
      } catch { /* ignore */ }
    }
    load()
    const timer = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [item.type, fromTo, ohlcvData.length])

  const rawCurrentPrice = livePrice ?? (ohlcvData.length > 0 ? ohlcvData[ohlcvData.length - 1].close : null)
  const currentPrice = rawCurrentPrice !== null && Number.isFinite(rawCurrentPrice) ? rawCurrentPrice : null
  const isPositive = priceChange >= 0

  // Load trades for this symbol
  const loadSymbolTrades = useCallback(async () => {
    try {
      setTradesLoading(true)
      const trades = await window.api.trading.getTradesBySymbol(item.symbol)
      setSymbolTrades(trades || [])
    } catch { /* ignore */ } finally {
      setTradesLoading(false)
    }
  }, [item.symbol])

  useEffect(() => {
    loadSymbolTrades()
    const timer = setInterval(loadSymbolTrades, 10000)
    return () => clearInterval(timer)
  }, [loadSymbolTrades])

  const openSymbolTrades = symbolTrades.filter((t) => t.status === 'open')
  const closedSymbolTrades = symbolTrades.filter((t) => t.status === 'closed')
  const totalPnl = closedSymbolTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)

  // Pin/unpin handlers
  const handlePinSignal = (idx: number) => {
    const sig = signals[idx]
    if (!sig) return
    setPinnedSignals(prev => {
      if (prev.some(p => p.entry_price === sig.entry_price && p.direction === sig.direction)) return prev
      return [...prev, sig]
    })
  }
  const handleUnpinSignal = (idx: number) => {
    const sig = signals[idx]
    if (!sig) return
    setPinnedSignals(prev => prev.filter(p => !(p.entry_price === sig.entry_price && p.direction === sig.direction)))
  }
  const clearAllAlerts = () => {
    setPinnedSignals([])
    setTriggeredAlerts(new Set())
  }

  const handleShowOnChart = (sig: TradeSignal) => {
    // Pin the signal if not already pinned
    setPinnedSignals(prev => {
      if (prev.some(p => p.entry_price === sig.entry_price && p.direction === sig.direction)) return prev
      return [...prev, sig]
    })
    // Create a trade-example highlight for this signal
    setSignalChartHighlight({
      type: 'trade-example',
      entryPrice: sig.entry_price,
      stopLoss: sig.stop_loss,
      takeProfit: sig.take_profits[0]?.price ?? 0,
      direction: sig.direction,
      label: `${sig.direction.toUpperCase()} setup`,
    })
    // Auto-clear after 8 seconds
    setTimeout(() => setSignalChartHighlight(null), 8000)
  }

  // Live price alert checking
  useEffect(() => {
    if (currentPrice === null || pinnedSignals.length === 0) {
      prevPriceRef.current = currentPrice
      return
    }
    const prev = prevPriceRef.current
    if (prev === null) {
      prevPriceRef.current = currentPrice
      return
    }

    pinnedSignals.forEach((sig) => {
      const alertKey = `${item.id}-${sig.entry_price}-${sig.direction}`
      if (triggeredAlerts.has(alertKey)) return

      const entryCrossed = (prev < sig.entry_price && currentPrice >= sig.entry_price) || (prev > sig.entry_price && currentPrice <= sig.entry_price)
      const slCrossed = (prev > sig.stop_loss && currentPrice <= sig.stop_loss) || (prev < sig.stop_loss && currentPrice >= sig.stop_loss)

      if (entryCrossed) {
        const title = `Trade Alert: ${item.displayName}`
        const body = `${sig.direction.toUpperCase()} entry at ${sig.entry_price.toFixed(item.type === 'forex' ? 5 : 2)} triggered!`
        window.api?.notifications?.send(title, body)
        setTriggeredAlerts(prev => new Set([...prev, alertKey]))
      }
      if (slCrossed) {
        const title = `Stop Loss Hit: ${item.displayName}`
        const body = `Stop loss at ${sig.stop_loss.toFixed(item.type === 'forex' ? 5 : 2)} triggered on your ${sig.direction.toUpperCase()} position!`
        window.api?.notifications?.send(title, body)
        setTriggeredAlerts(prev => new Set([...prev, alertKey]))
      }
    })

    prevPriceRef.current = currentPrice
  }, [currentPrice, pinnedSignals, item.id, item.displayName, item.type, triggeredAlerts])

  // Build pinned indices for AITradeSignals
  const pinnedIds = signals
    .map((s, i) => pinnedSignals.some(p => p.entry_price === s.entry_price && p.direction === s.direction) ? i : -1)
    .filter(i => i !== -1)

  return (
    <>
      <Card className={cn(
        'overflow-hidden transition-all duration-300',
        flash === 'up' && 'ring-1 ring-green-500/30',
        flash === 'down' && 'ring-1 ring-red-500/30'
      )}>
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold truncate">{item.displayName}</h3>
                <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                  {item.type === 'crypto' ? 'BINANCE' : 'FOREX'}
                </Badge>
              </div>
              {currentPrice !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tabular-nums">
                    {currentPrice.toFixed(item.type === 'forex' ? 5 : 2)}
                  </span>
                  <span className={cn(
                    'text-xs font-medium flex items-center gap-0.5',
                    isPositive ? 'text-green-500' : 'text-red-500'
                  )}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {pinnedSignals.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 px-2 text-muted-foreground hover:text-destructive"
                  onClick={clearAllAlerts}
                  title="Clear all pinned alerts"
                >
                  <Bell className="h-3 w-3" /> {pinnedSignals.length}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground"
                onClick={() => onUpdate(item.id, { chartType: item.chartType === 'candlestick' ? 'line' : 'candlestick' })}
                title={item.chartType === 'candlestick' ? 'Switch to line' : 'Switch to candlestick'}
              >
                {item.chartType === 'candlestick' ? <LineChartIcon className="h-3.5 w-3.5" /> : <CandlestickChart className="h-3.5 w-3.5" />}
              </Button>
              {item.type === 'crypto' && (
                <Select
                  value={item.interval}
                  onValueChange={(v) => onUpdate(item.id, { interval: v })}
                >
                  <SelectTrigger className="h-6 w-[55px] text-[10px] px-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRYPTO_INTERVALS.map((i) => (
                      <SelectItem key={i.value} value={i.value} className="text-xs">{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-3 space-y-3">
          {activeTab === 'chart' && (
            <>
              <AssetChart
                data={ohlcvData}
                loading={loading}
                error={error}
                chartType={item.chartType}
                onRetry={reload}
                theme={resolvedTheme === 'light' ? 'light' : 'dark'}
                livePrice={livePrice}
                signals={signals}
                pinnedSignals={pinnedSignals}
                supportLevels={signals?.flatMap?.(s => s?.support_levels ?? [])?.filter?.(v => Number.isFinite(v)) ?? []}
                resistanceLevels={signals?.flatMap?.(s => s?.resistance_levels ?? [])?.filter?.(v => Number.isFinite(v)) ?? []}
                onExpand={() => setFullscreen(true)}
                assetName={item.displayName}
                assetType={item.type}
                signalChartHighlight={signalChartHighlight ?? undefined}
              />

              {currentPrice !== null && !isNaN(currentPrice) && ohlcvData.length > 0 && (
                <>
                  <AIAnalysisPanel
                    assetName={item.displayName}
                    assetType={item.type}
                    currentPrice={currentPrice}
                    priceChangePercent={priceChange}
                    candles={ohlcvData}
                  />
                  <AITradeSignals
                    assetName={item.displayName}
                    assetType={item.type}
                    currentPrice={currentPrice}
                    priceChangePercent={priceChange}
                    candles={ohlcvData}
                    onSignalsChange={setSignals}
                    pinnedIds={pinnedIds}
                    onPinSignal={handlePinSignal}
                    onUnpinSignal={handleUnpinSignal}
                    onShowOnChart={handleShowOnChart}
                  />
                </>
              )}
            </>
          )}

          {activeTab === 'trades' && (
            <div className="space-y-2 min-h-[180px]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground">Active Positions</h4>
                {openSymbolTrades.length > 0 && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {openSymbolTrades.length} open
                  </span>
                )}
              </div>
              {tradesLoading && openSymbolTrades.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">Loading trades...</div>
              ) : openSymbolTrades.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No active trades for {item.displayName}</div>
              ) : (
                <div className="space-y-1.5">
                  {openSymbolTrades.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${t.side === 'long' ? 'text-green-500' : 'text-red-500'}`}>
                          {t.side.toUpperCase()}
                        </span>
                        <span className="text-muted-foreground">Qty: {t.quantity}</span>
                        <span className="text-muted-foreground">@ {t.entry_price?.toFixed?.(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.stop_loss && <span className="text-[10px] text-red-400">SL {t.stop_loss.toFixed(2)}</span>}
                        {t.take_profit && <span className="text-[10px] text-green-400">TP {t.take_profit.toFixed(2)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2 min-h-[180px]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground">Trade History</h4>
                {closedSymbolTrades.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                    <span className={`text-[10px] font-medium ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} total
                    </span>
                  </div>
                )}
              </div>
              {tradesLoading && closedSymbolTrades.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">Loading history...</div>
              ) : closedSymbolTrades.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No closed trades for {item.displayName}</div>
              ) : (
                <div className="space-y-1.5">
                  {closedSymbolTrades.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${t.side === 'long' ? 'text-green-500' : 'text-red-500'}`}>
                          {t.side.toUpperCase()}
                        </span>
                        <span className="text-muted-foreground">Qty: {t.quantity}</span>
                        <span className="text-muted-foreground">@ {t.entry_price?.toFixed?.(2)}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                      <span className={`font-medium ${(t.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {t.pnl !== undefined && t.pnl !== null ? `${t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Bar */}
          <div className="flex items-center gap-1 border-t border-border/50 pt-2">
            {(['chart', 'trades', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-medium py-1 rounded-md transition-colors ${
                  activeTab === tab
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {tab === 'chart' && <CandlestickChart className="w-3 h-3" />}
                {tab === 'trades' && <ListChecks className="w-3 h-3" />}
                {tab === 'history' && <History className="w-3 h-3" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'trades' && openSymbolTrades.length > 0 && (
                  <span className="ml-0.5 w-3.5 h-3.5 rounded-full bg-primary text-white text-[8px] flex items-center justify-center">
                    {openSymbolTrades.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Overlay */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{item.displayName}</h3>
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                {item.type === 'crypto' ? 'BINANCE' : 'FOREX'}
              </Badge>
              {currentPrice !== null && (
                <span className="text-sm font-bold tabular-nums">
                  {currentPrice.toFixed(item.type === 'forex' ? 5 : 2)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {item.type === 'crypto' && (
                <Select
                  value={item.interval}
                  onValueChange={(v) => onUpdate(item.id, { interval: v })}
                >
                  <SelectTrigger className="h-6 w-[55px] text-[10px] px-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRYPTO_INTERVALS.map((i) => (
                      <SelectItem key={i.value} value={i.value} className="text-xs">{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => setFullscreen(false)}>
                <X className="h-3.5 w-3.5" /> Close
              </Button>
            </div>
          </div>
          {/* Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left - Chart + Tabs */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Chart area */}
              <div className="flex-1 p-4 overflow-hidden flex flex-col min-w-0">
                <AssetChart
                  data={ohlcvData}
                  loading={loading}
                  error={error}
                  chartType={item.chartType}
                  onRetry={reload}
                  theme={resolvedTheme === 'light' ? 'light' : 'dark'}
                  livePrice={livePrice}
                  signals={signals}
                  pinnedSignals={pinnedSignals}
                  supportLevels={signals.flatMap(s => s.support_levels)}
                  resistanceLevels={signals.flatMap(s => s.resistance_levels)}
                  fillHeight
                  assetName={item.displayName}
                  assetType={item.type}
                  signalChartHighlight={signalChartHighlight ?? undefined}
                />
              </div>

              {/* Tab Bar */}
              <div className="flex items-center gap-1 border-t border-border px-4 py-1 shrink-0">
                {(['chart', 'trades', 'history'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFullscreenTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-medium py-1 rounded-md transition-colors ${
                      fullscreenTab === tab
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {tab === 'chart' && <CandlestickChart className="w-3 h-3" />}
                    {tab === 'trades' && <ListChecks className="w-3 h-3" />}
                    {tab === 'history' && <History className="w-3 h-3" />}
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'trades' && openSymbolTrades.length > 0 && (
                      <span className="ml-0.5 w-3.5 h-3.5 rounded-full bg-primary text-white text-[8px] flex items-center justify-center">
                        {openSymbolTrades.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Trades / History Content */}
              {fullscreenTab === 'trades' && (
                <div className="h-[220px] border-t border-border overflow-y-auto px-4 py-2 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">Active Positions</h4>
                    {openSymbolTrades.length > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                        {openSymbolTrades.length} open
                      </span>
                    )}
                  </div>
                  {tradesLoading && openSymbolTrades.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">Loading trades...</div>
                  ) : openSymbolTrades.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">No active trades for {item.displayName}</div>
                  ) : (
                    <div className="space-y-1.5">
                      {openSymbolTrades.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${t.side === 'long' ? 'text-green-500' : 'text-red-500'}`}>
                              {t.side.toUpperCase()}
                            </span>
                            <span className="text-muted-foreground">Qty: {t.quantity}</span>
                            <span className="text-muted-foreground">@ {t.entry_price?.toFixed?.(2)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {t.stop_loss && <span className="text-[10px] text-red-400">SL {t.stop_loss.toFixed(2)}</span>}
                            {t.take_profit && <span className="text-[10px] text-green-400">TP {t.take_profit.toFixed(2)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {fullscreenTab === 'history' && (
                <div className="h-[220px] border-t border-border overflow-y-auto px-4 py-2 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">Trade History</h4>
                    {closedSymbolTrades.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span className={`text-[10px] font-medium ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} total
                        </span>
                      </div>
                    )}
                  </div>
                  {tradesLoading && closedSymbolTrades.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">Loading history...</div>
                  ) : closedSymbolTrades.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">No closed trades for {item.displayName}</div>
                  ) : (
                    <div className="space-y-1.5">
                      {closedSymbolTrades.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${t.side === 'long' ? 'text-green-500' : 'text-red-500'}`}>
                              {t.side.toUpperCase()}
                            </span>
                            <span className="text-muted-foreground">Qty: {t.quantity}</span>
                            <span className="text-muted-foreground">@ {t.entry_price?.toFixed?.(2)}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                          </div>
                          <span className={`font-medium ${(t.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {t.pnl !== undefined && t.pnl !== null ? `${t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resize Handle */}
            <div
              className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40 transition-colors flex items-center justify-center"
              onMouseDown={handleResizeStart}
              style={{ minHeight: '100%' }}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
            </div>

            {/* Right - Signals + Analysis */}
            {currentPrice !== null && ohlcvData.length > 0 && (
              <div
                className="border-l border-border overflow-y-auto shrink-0 flex flex-col"
                style={{ width: signalPanelWidth }}
              >
                <div className="p-4 space-y-4">
                  <AITradeSignals
                    assetName={item.displayName}
                    assetType={item.type}
                    currentPrice={currentPrice}
                    priceChangePercent={priceChange}
                    candles={ohlcvData}
                    onSignalsChange={setSignals}
                    pinnedIds={pinnedIds}
                    onPinSignal={handlePinSignal}
                    onUnpinSignal={handleUnpinSignal}
                    onShowOnChart={handleShowOnChart}
                  />
                  <AIAnalysisPanel
                    assetName={item.displayName}
                    assetType={item.type}
                    currentPrice={currentPrice}
                    priceChangePercent={priceChange}
                    candles={ohlcvData}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
