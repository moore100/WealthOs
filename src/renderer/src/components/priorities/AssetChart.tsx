import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Loader2, AlertCircle, RefreshCw, ZoomIn, ZoomOut, Maximize2, RotateCcw,
  CandlestickChart as CandlestickIcon, LineChart as LineChartIcon, BarChart3, Activity, BrainCircuit,
  TrendingUp, Eye, EyeOff, Pencil, Trash2, Crosshair, Send, GraduationCap
} from 'lucide-react'
import ChartTutorial, { type HighlightTarget } from './ChartTutorial'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import type { OHLCVCandle } from '@/hooks/useOHLCV'
import type { TradeSignal } from './AITradeSignals'
import { LightweightChartView, type AdvancedChartType, type ChartViewHandle, calcRSI } from './TradingViewChart'

export type AdvancedChartType = 'candlestick' | 'line' | 'bar' | 'area' | 'heikin-ashi'

interface AssetChartProps {
  data: OHLCVCandle[]
  loading: boolean
  error: string | null
  chartType: 'candlestick' | 'line'
  onRetry: () => void
  theme: 'dark' | 'light'
  livePrice?: number | null
  signals?: TradeSignal[]
  pinnedSignals?: TradeSignal[]
  supportLevels?: number[]
  resistanceLevels?: number[]
  onExpand?: () => void
  fillHeight?: boolean
  assetName?: string
  assetType?: 'crypto' | 'forex'
  signalChartHighlight?: HighlightTarget
}

// ─── RSI Panel ─────────────────────────────────────────────────────────────
function RSIPanel({ data, theme }: { data: OHLCVCandle[]; theme: string }) {
  const closes = useMemo(() => data.map(d => d.close), [data])
  const rsi = useMemo(() => closes.length >= 15 ? calcRSI(closes, 14) : [], [closes])
  const isDark = theme === 'dark'
  const h = 60
  const w = data.length * 10

  const valid = rsi.map((v, i) => ({ i, v })).filter(({ v }) => v !== null) as { i: number; v: number }[]
  if (valid.length === 0) return null

  const yScale = (v: number) => h - (v / 100) * (h - 8) - 4
  const points = valid.map(({ i, v }) => `${i * 10 + 5},${yScale(v)}`).join(' ')

  return (
    <div className="w-full overflow-x-auto border-t border-border/50 pt-1 mt-1">
      <div className="flex items-center gap-2 px-1 mb-0.5">
        <span className="text-[9px] font-semibold text-muted-foreground">RSI(14)</span>
        {valid.length > 0 && (
          <span className={`text-[9px] font-bold ${valid[valid.length - 1].v > 70 ? 'text-red-500' : valid[valid.length - 1].v < 30 ? 'text-green-500' : 'text-muted-foreground'}`}>
            {valid[valid.length - 1].v.toFixed(1)}
          </span>
        )}
      </div>
      <svg width={w} height={h} className="mx-auto">
        {/* 30/70 reference lines */}
        <line x1={0} y1={yScale(70)} x2={w} y2={yScale(70)} stroke="#ef4444" strokeWidth={0.5} strokeDasharray="2 2" opacity={0.4} />
        <line x1={0} y1={yScale(30)} x2={w} y2={yScale(30)} stroke="#22c55e" strokeWidth={0.5} strokeDasharray="2 2" opacity={0.4} />
        <line x1={0} y1={yScale(50)} x2={w} y2={yScale(50)} stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth={0.3} />
        <polyline fill="none" stroke={isDark ? '#fbbf24' : '#d97706'} strokeWidth={1.5} points={points} />
      </svg>
    </div>
  )
}

// ─── Main Advanced Chart ────────────────────────────────────────────────────
export default function AssetChart({
  data,
  loading,
  error,
  chartType: propChartType,
  onRetry,
  theme,
  livePrice,
  signals,
  pinnedSignals,
  supportLevels,
  resistanceLevels,
  onExpand,
  fillHeight = false,
  assetName = '',
  assetType = 'crypto',
  signalChartHighlight,
}: AssetChartProps) {
  // Sanitize data to remove candles with invalid numeric values
  const safeData = useMemo(() => data.filter(d =>
    Number.isFinite(d.open) && Number.isFinite(d.high) &&
    Number.isFinite(d.low) && Number.isFinite(d.close) && Number.isFinite(d.volume)
  ), [data])

  // Sanitize livePrice
  const safeLivePrice = livePrice !== null && livePrice !== undefined && !isNaN(livePrice) && Number.isFinite(livePrice) ? livePrice : null

  const [activeChartType, setActiveChartType] = useState<AdvancedChartType>(propChartType === 'candlestick' ? 'candlestick' : 'line')
  const chartViewRef = useRef<ChartViewHandle>(null)

  // Tutorial state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)
  const [tutorialStep, setTutorialStep] = useState<HighlightTarget | null>(null)

  // Indicator toggles
  const [indicators, setIndicators] = useState({
    sma: false,
    ema: false,
    bollinger: false,
    rsi: false,
    macd: false,
  })

  // AI Command
  const [aiCommand, setAiCommand] = useState('')

  const toggleIndicator = (key: keyof typeof indicators) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // AI Command Parser
  const handleAICommand = useCallback((cmd: string) => {
    const lower = cmd.toLowerCase()
    if (lower.includes('candlestick') || lower.includes('candles')) setActiveChartType('candlestick')
    if (lower.includes('line chart') || lower.includes('switch to line')) setActiveChartType('line')
    if (lower.includes('bar chart') || lower.includes('bars')) setActiveChartType('bar')
    if (lower.includes('area chart') || lower.includes('area')) setActiveChartType('area')
    if (lower.includes('heikin')) setActiveChartType('heikin-ashi')

    if (lower.includes('sma') || lower.includes('simple moving')) toggleIndicator('sma')
    if (lower.includes('ema') || lower.includes('exponential')) toggleIndicator('ema')
    if (lower.includes('bollinger')) toggleIndicator('bollinger')
    if (lower.includes('rsi')) toggleIndicator('rsi')
    if (lower.includes('macd')) toggleIndicator('macd')

    if (lower.includes('zoom in')) chartViewRef.current?.zoomIn()
    if (lower.includes('zoom out')) chartViewRef.current?.zoomOut()
    if (lower.includes('reset zoom') || lower.includes('reset view')) chartViewRef.current?.zoomReset()
    if (lower.includes('show all indicators')) setIndicators({ sma: true, ema: true, bollinger: true, rsi: true, macd: true })
    if (lower.includes('hide all indicators') || lower.includes('clear indicators')) setIndicators({ sma: false, ema: false, bollinger: false, rsi: false, macd: false })

    setAiCommand('')
  }, [])

  const zoomIn = () => chartViewRef.current?.zoomIn()
  const zoomOut = () => chartViewRef.current?.zoomOut()
  const zoomReset = () => chartViewRef.current?.zoomReset()

  if (loading) {
    return (
      <div className="h-[220px] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-xs">Loading chart data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground gap-2">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <span className="text-xs">{error}</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={onRetry}>
          <RefreshCw className="h-3 w-3" /> Retry
        </Button>
      </div>
    )
  }

  if (safeData.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-muted-foreground">
        <span className="text-xs">No data available</span>
      </div>
    )
  }

  const chartTypeIcons: Record<AdvancedChartType, React.ReactNode> = {
    candlestick: <CandlestickIcon className="h-3.5 w-3.5" />,
    line: <LineChartIcon className="h-3.5 w-3.5" />,
    bar: <BarChart3 className="h-3.5 w-3.5" />,
    area: <Activity className="h-3.5 w-3.5" />,
    'heikin-ashi': <TrendingUp className="h-3.5 w-3.5" />,
  }

  const chartTypeLabels: Record<AdvancedChartType, string> = {
    candlestick: 'Candlestick',
    line: 'Line',
    bar: 'Bar',
    area: 'Area',
    'heikin-ashi': 'Heikin-Ashi',
  }

  const renderChart = () => {
    const commonProps = {
      data: safeData,
      theme,
      livePrice: safeLivePrice,
      signals,
      pinnedSignals,
      supportLevels,
      resistanceLevels,
      fillHeight,
      showSma: indicators.sma,
      showEma: indicators.ema,
      showBollinger: indicators.bollinger,
      chartType: activeChartType,
      tutorialHighlight: signalChartHighlight || tutorialStep,
    }
    return <LightweightChartView ref={chartViewRef} {...commonProps} />
  }

  return (
    <>
      {/* Advanced Toolbar */}
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
        <div className="flex items-center gap-1">
          {/* Chart Type Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2">
                {chartTypeIcons[activeChartType]} {chartTypeLabels[activeChartType]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              <DropdownMenuLabel>Chart Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(chartTypeLabels) as AdvancedChartType[]).map((type) => (
                <DropdownMenuItem key={type} onClick={() => setActiveChartType(type)} className="gap-2 text-xs">
                  {chartTypeIcons[type]} {chartTypeLabels[type]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Indicators Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2">
                <TrendingUp className="h-3 w-3" /> Indicators
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              <DropdownMenuLabel>Technical Indicators</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { key: 'sma' as const, label: 'SMA (20)' },
                { key: 'ema' as const, label: 'EMA (20)' },
                { key: 'bollinger' as const, label: 'Bollinger Bands' },
                { key: 'rsi' as const, label: 'RSI (14)' },
                { key: 'macd' as const, label: 'MACD' },
              ].map(({ key, label }) => (
                <DropdownMenuItem key={key} onClick={() => toggleIndicator(key)} className="gap-2 text-xs">
                  {indicators[key] ? <Eye className="h-3 w-3 text-green-500" /> : <EyeOff className="h-3 w-3" />}
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Zoom Controls */}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomOut} title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomIn} title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={zoomReset} title="Reset zoom">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {/* AI Command Input */}
          <div className="flex items-center gap-1">
            <Input
              value={aiCommand}
              onChange={(e) => setAiCommand(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && aiCommand.trim()) handleAICommand(aiCommand) }}
              placeholder="Ask AI: Show SMA, Zoom in, etc..."
              className="h-6 text-[10px] w-48 px-2 py-0"
            />
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => aiCommand.trim() && handleAICommand(aiCommand)} title="Send AI command">
              <Send className="h-3 w-3" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1 px-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20"
            onClick={() => setIsTutorialOpen(true)}
          >
            <GraduationCap className="h-3 w-3 text-amber-500" /> Learn Trading
          </Button>
          {onExpand && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={onExpand}>
              <Maximize2 className="h-3 w-3" /> Enlarge
            </Button>
          )}
        </div>
      </div>

      {/* Active indicators badges */}
      {(indicators.sma || indicators.ema || indicators.bollinger || indicators.rsi || indicators.macd) && (
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {indicators.sma && <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">SMA20</Badge>}
          {indicators.ema && <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20">EMA20</Badge>}
          {indicators.bollinger && <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Bollinger</Badge>}
          {indicators.rsi && <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-1 bg-orange-500/10 text-orange-600 border-orange-500/20">RSI</Badge>}
          {indicators.macd && <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">MACD</Badge>}
        </div>
      )}

      <div className={cn("relative", fillHeight && 'h-full flex flex-col')}>
        <div className={cn("w-full", fillHeight && 'flex-1 min-h-0')} style={{ height: fillHeight ? '100%' : 280 }}>
          {renderChart()}
        </div>

        {/* RSI Panel */}
        {indicators.rsi && <RSIPanel data={safeData} theme={theme} />}

        {/* Learn Trading Tooltip Journey */}
        <ChartTutorial
          assetName={assetName}
          assetType={assetType}
          currentPrice={safeLivePrice ?? safeData[safeData.length - 1]?.close ?? 0}
          candles={safeData}
          isOpen={isTutorialOpen}
          onClose={() => setIsTutorialOpen(false)}
          onStepChange={(step) => setTutorialStep(step?.highlight ?? null)}
        />
      </div>
    </>
  )
}
