import { useState, useCallback } from 'react'
import {
  BrainCircuit, Loader2, Target, Shield, TrendingUp, TrendingDown, Zap, Activity,
  BarChart3, RefreshCw, ChevronDown, ChevronRight, Pin, Rocket, Settings2,
  Wallet, AlertTriangle, Info, CheckCircle2, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { chatComplete, isLLMConfigured } from '@/lib/ai'
import type { OHLCVCandle } from '@/hooks/useOHLCV'
import { useTradingStore } from '@/store/tradingStore'

export interface TradeSignal {
  strategy: 'scalping' | 'day_trade' | 'swing' | 'position'
  direction: 'long' | 'short'
  entry_price: number
  take_profits: { price: number; label: string }[]
  stop_loss: number
  confidence: number
  reasoning: string
  indicators: string[]
  support_levels: number[]
  resistance_levels: number[]
  risk_reward: string
  max_hold_time: string
  // Budget-aware enriched fields
  position_size?: number
  position_size_quote?: number
  risk_amount?: number
  risk_percent?: number
  rationale?: string
  warnings?: string[]
  market_read?: string
  suggested_mode?: string
  suggested_duration?: string
  trailing_stop_distance?: number
}

interface AITradeSignalsProps {
  assetName: string
  assetType: 'crypto' | 'forex'
  currentPrice: number
  priceChangePercent: number
  candles: OHLCVCandle[]
  onSignalsChange?: (signals: TradeSignal[]) => void
  compact?: boolean
  pinnedIds?: number[]
  onPinSignal?: (idx: number) => void
  onUnpinSignal?: (idx: number) => void
  onShowOnChart?: (sig: TradeSignal) => void
}

const STRATEGY_LABELS: Record<string, string> = {
  scalping: 'Scalping',
  day_trade: 'Day Trade',
  swing: 'Swing',
  position: 'Position',
}

const STRATEGY_ICONS: Record<string, React.ReactNode> = {
  scalping: <Zap className="h-3.5 w-3.5" />,
  day_trade: <Activity className="h-3.5 w-3.5" />,
  swing: <TrendingUp className="h-3.5 w-3.5" />,
  position: <BarChart3 className="h-3.5 w-3.5" />,
}

const MODE_LABELS: Record<string, string> = {
  ai_suggest: 'AI Suggest',
  scalping: 'Scalping',
  day_trade: 'Day Trade',
  swing: 'Swing',
  position: 'Position',
}

const DURATION_LABELS: Record<string, string> = {
  ai_suggest: 'AI Suggest',
  '1h': '1 Hour',
  '4h': '4 Hours',
  '1d': '1 Day',
  '3d': '3 Days',
  '1w': '1 Week',
  '2w': '2 Weeks',
  '1m': '1 Month',
}

export default function AITradeSignals({
  assetName,
  assetType,
  currentPrice,
  priceChangePercent,
  candles,
  onSignalsChange,
  compact = false,
  pinnedIds = [],
  onPinSignal,
  onUnpinSignal,
  onShowOnChart,
}: AITradeSignalsProps) {
  const prefs = useTradingStore(s => s.tradingPreferences)
  const setPrefs = useTradingStore(s => s.setTradingPreferences)

  const [signals, setSignals] = useState<TradeSignal[]>([])
  const [loading, setLoading] = useState(false)
  const [executingIdx, setExecutingIdx] = useState<number | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [showPrefs, setShowPrefs] = useState(false)
  const [localBudget, setLocalBudget] = useState(prefs.portfolioBudget.toString())

  const handleAnalyze = async () => {
    if (!(await isLLMConfigured())) {
      toast.error('No AI provider configured. Go to Settings → AI Provider.')
      return
    }
    setLoading(true)
    try {
      const lastCandles = candles.slice(-30)
      const candleSummary = lastCandles
        .map((c) => `O:${c.open.toFixed(4)} H:${c.high.toFixed(4)} L:${c.low.toFixed(4)} C:${c.close.toFixed(4)}`)
        .join('\n')

      const budget = prefs.portfolioBudget || 1000
      const riskPct = prefs.riskPercentPerTrade || 2
      const modePref = prefs.tradingMode === 'ai_suggest'
        ? 'The user wants you to SUGGEST the best trading mode based on current market conditions.'
        : `The user wants ONLY ${MODE_LABELS[prefs.tradingMode]} trades.`
      const durationPref = prefs.maxHoldDuration === 'ai_suggest'
        ? 'The user wants you to SUGGEST the best hold duration based on current market conditions.'
        : `The user wants max hold duration of ${DURATION_LABELS[prefs.maxHoldDuration]}.`

      const systemPrompt = `You are an elite trading analyst AI. Analyze the provided market data and generate actionable trade signals.

CRITICAL: The user has provided their trading preferences below. You MUST factor these into every signal you generate.

Respond ONLY with valid JSON in this exact format:
{
  "signals": [
    {
      "strategy": "scalping|day_trade|swing|position",
      "direction": "long|short",
      "entry_price": number,
      "take_profits": [
        { "price": number, "label": "TP1 - Partial exit" },
        { "price": number, "label": "TP2 - Full exit" }
      ],
      "stop_loss": number,
      "confidence": number (0-100),
      "reasoning": "Detailed explanation of the setup, including market context and why this direction",
      "rationale": "Explain why this specific route was chosen given the user's preferences and market conditions",
      "warnings": ["List of things the trader should watch out for"],
      "market_read": "What the AI sees in the current market (trend, momentum, key levels)",
      "suggested_mode": "If user asked for AI suggestion, state what mode you recommend and why",
      "suggested_duration": "If user asked for AI suggestion, state recommended duration and why",
      "indicators": ["RSI", "MACD", "EMA20", etc.],
      "support_levels": [number, number],
      "resistance_levels": [number, number],
      "risk_reward": "string like '1:2.5'",
      "max_hold_time": "string like '2 hours' or '3 days'",
      "position_size": number,
      "position_size_quote": number,
      "risk_amount": number,
      "risk_percent": number,
      "trailing_stop_distance": number
    }
  ]
}

USER PREFERENCES:
- Total portfolio budget: $${budget}
- Risk per trade: ${riskPct}% of portfolio ($${(budget * riskPct / 100).toFixed(2)} max risk per trade)
- Trading mode preference: ${modePref}
- Max hold duration preference: ${durationPref}
- Trailing stop: ${prefs.useTrailingStop ? 'Enabled' : 'Disabled'}

Rules:
- Provide 1-3 signals for different strategies based on market conditions and user preferences
- If user selected AI Suggest for mode, give at least one signal per mode that fits the market, and label which mode each is
- Position size MUST be calculated so that if the stop loss is hit, the user loses at most $${(budget * riskPct / 100).toFixed(2)} (their risk budget)
- Position_size_quote is the dollar value of the position. Formula: position_size_quote = risk_amount / |entry - stop_loss| * entry_price
- Risk_percent should be the actual % of portfolio at risk for this specific signal
- Scalping: tight stops (<1%), quick profits, high volatility needed. Position size can be larger.
- Day trade: intraday holds, moderate stops (1-3%)
- Swing: multi-day holds, wider stops (3-8%), trend following
- Position: long-term, very wide stops (8%+)
- Calculate realistic support/resistance from recent swing highs/lows
- Confidence should reflect setup quality (70+ = high quality)
- Risk:reward should be at least 1:1.5
- Take profits should be staggered (partial then full)
- Give DETAILED reasoning, rationale, and warnings. Don't be vague.
- Include a market_read field describing current trend, momentum, and key levels
- If the user selected AI Suggest, explain in suggested_mode and suggested_duration why you chose those values`;

      const userContent = `Asset: ${assetName} (${assetType.toUpperCase()})
Current price: ${currentPrice.toFixed(assetType === 'forex' ? 5 : 2)}
24h change: ${priceChangePercent.toFixed(2)}%

Last 30 candles OHLC:
${candleSummary}

Generate trade signals with exact prices, TP/SL levels, position sizing based on the user's $${budget} budget and ${riskPct}% risk preference, and a detailed breakdown of WHY each signal was chosen and what the trader should watch out for.`;

      const response = await chatComplete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        maxTokens: 3000,
        jsonResponse: true,
      })

      const parsed = JSON.parse(response)
      const newSignals: TradeSignal[] = (parsed.signals || []).map((s: any) => ({
        strategy: s.strategy || 'day_trade',
        direction: s.direction || 'long',
        entry_price: s.entry_price || currentPrice,
        take_profits: s.take_profits || [],
        stop_loss: s.stop_loss || 0,
        confidence: s.confidence || 50,
        reasoning: s.reasoning || '',
        indicators: s.indicators || [],
        support_levels: s.support_levels || [],
        resistance_levels: s.resistance_levels || [],
        risk_reward: s.risk_reward || '1:1',
        max_hold_time: s.max_hold_time || '',
        position_size: s.position_size,
        position_size_quote: s.position_size_quote,
        risk_amount: s.risk_amount,
        risk_percent: s.risk_percent,
        rationale: s.rationale || '',
        warnings: s.warnings || [],
        market_read: s.market_read || '',
        suggested_mode: s.suggested_mode || '',
        suggested_duration: s.suggested_duration || '',
        trailing_stop_distance: s.trailing_stop_distance,
      }))

      setSignals(newSignals)
      onSignalsChange?.(newSignals)

      // Submit to auto-trade engine if enabled
      try {
        const settings = await window.api.trading.getAutoTradeSettings(0)
        if (settings?.enabled) {
          const rawSymbol = assetName.includes('/') ? assetName : `${assetName}/USDT`
          const cleanSymbol = rawSymbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
          const submitSignals = newSignals.map((s) => ({
            symbol: cleanSymbol,
            direction: s.direction,
            entry_price: s.entry_price,
            take_profit: s.take_profits[0]?.price,
            stop_loss: s.stop_loss,
            strategy: s.strategy,
            confidence: s.confidence,
          }))
          await window.api.trading.submitSignals(submitSignals)
          toast.success(`${submitSignals.length} signal${submitSignals.length !== 1 ? 's' : ''} queued for auto-trade`)
        } else {
          toast.success(`${newSignals.length} trade signal${newSignals.length !== 1 ? 's' : ''} generated`)
        }
      } catch {
        toast.success(`${newSignals.length} trade signal${newSignals.length !== 1 ? 's' : ''} generated`)
      }
    } catch (e: any) {
      toast.error(e?.message || 'Signal generation failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleExecuteTrade(sig: TradeSignal, idx: number) {
    setExecutingIdx(idx)
    try {
      const brokers = await window.api.trading.getBrokers()
      const activeBroker = brokers.find((b: any) => b.is_active === 1)
      if (!activeBroker) {
        toast.error('No trading platform connected. Please set up Binance first.', {
          action: {
            label: 'Set Up',
            onClick: () => window.location.href = '#/trading',
          },
        })
        return
      }

      const rawSymbol = assetName.includes('/') ? assetName : `${assetName}/USDT`
      const symbol = rawSymbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      const orderSize = sig.position_size_quote && sig.position_size_quote > 0
        ? sig.position_size_quote
        : 50
      const order = {
        symbol,
        side: sig.direction === 'long' ? 'BUY' : 'SELL',
        type: 'MARKET',
        quoteOrderQty: Math.min(orderSize, prefs.portfolioBudget * 0.25),
        price: sig.entry_price,
        stopLoss: sig.stop_loss,
        takeProfit: sig.take_profits[0]?.price,
      }
      const result = await window.api.trading.placeOrder(order)
      if (result.ok) {
        toast.success(`Trade executed! Order #${result.orderId}`)
      } else {
        toast.error('Trade execution failed')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to execute trade')
    } finally {
      setExecutingIdx(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Settings Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs h-8"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : signals.length > 0 ? <RefreshCw className="h-3.5 w-3.5" /> : <BrainCircuit className="h-3.5 w-3.5" />}
          {loading ? 'Analyzing market...' : signals.length > 0 ? 'Refresh Signals' : 'Generate Trade Signals'}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${showPrefs ? 'bg-muted' : ''}`}
          onClick={() => setShowPrefs(v => !v)}
          title="Trading Preferences"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Preferences Panel */}
      {showPrefs && (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Trading Preferences</span>
          </div>

          {/* Budget */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground flex justify-between">
              <span>Portfolio Budget</span>
              <span className="font-medium text-foreground">${prefs.portfolioBudget.toLocaleString()}</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">$</span>
              <Input
                type="number"
                value={localBudget}
                onChange={(e) => setLocalBudget(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(localBudget)
                  if (!isNaN(val) && val > 0) setPrefs({ portfolioBudget: val })
                }}
                className="h-6 text-xs"
                placeholder="1000"
              />
            </div>
          </div>

          {/* Risk */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground flex justify-between">
              <span>Risk Per Trade</span>
              <span className="font-medium text-foreground">{prefs.riskPercentPerTrade}% (${(prefs.portfolioBudget * prefs.riskPercentPerTrade / 100).toFixed(0)})</span>
            </label>
            <Slider
              value={[prefs.riskPercentPerTrade]}
              onValueChange={([v]) => setPrefs({ riskPercentPerTrade: v })}
              min={0.5}
              max={10}
              step={0.5}
              className="py-1"
            />
          </div>

          {/* Mode */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Trading Mode</label>
            <div className="flex flex-wrap gap-1">
              {(['ai_suggest', 'scalping', 'day_trade', 'swing', 'position'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setPrefs({ tradingMode: m })}
                  className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                    prefs.tradingMode === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Max Hold Duration</label>
            <div className="flex flex-wrap gap-1">
              {(['ai_suggest', '1h', '4h', '1d', '3d', '1w', '2w', '1m'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setPrefs({ maxHoldDuration: d })}
                  className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                    prefs.maxHoldDuration === d
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  }`}
                >
                  {DURATION_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.useTrailingStop}
                onChange={(e) => setPrefs({ useTrailingStop: e.target.checked })}
                className="h-3 w-3 rounded accent-primary"
              />
              <span className="text-[10px] text-muted-foreground">Trailing Stop</span>
            </label>
          </div>
        </div>
      )}

      {/* AI Suggestion Banner */}
      {signals.length > 0 && signals[0]?.suggested_mode && prefs.tradingMode === 'ai_suggest' && (
        <div className="rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2">
          <div className="flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-blue-600">AI Recommendation</p>
              <p className="text-[10px] text-muted-foreground">{signals[0].suggested_mode}</p>
              {signals[0].suggested_duration && (
                <p className="text-[10px] text-muted-foreground">{signals[0].suggested_duration}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {signals.length > 0 && (
        <div className="space-y-2">
          {signals.map((sig, idx) => {
            const isExpanded = expandedIdx === idx
            return (
            <div
              key={idx}
              className={`rounded-lg border cursor-pointer transition-all ${
                sig.direction === 'long'
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              }`}
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
            >
              {/* Compact Row */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                    {STRATEGY_ICONS[sig.strategy] || <Activity className="h-3 w-3" />}
                    {STRATEGY_LABELS[sig.strategy] || sig.strategy}
                  </Badge>
                  <Badge
                    variant={sig.direction === 'long' ? 'default' : 'destructive'}
                    className="text-[10px] h-5 shrink-0"
                  >
                    {sig.direction.toUpperCase()}
                  </Badge>
                  {sig.position_size_quote && sig.position_size_quote > 0 && (
                    <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                      ${sig.position_size_quote.toFixed(0)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${sig.confidence >= 70 ? 'bg-green-500' : sig.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${sig.confidence}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium">{sig.confidence}%</span>
                  </div>
                  {onPinSignal && (
                    <button
                      className="p-0.5 rounded hover:bg-muted transition-colors"
                      onClick={(e) => { e.stopPropagation(); pinnedIds.includes(idx) ? onUnpinSignal?.(idx) : onPinSignal(idx); }}
                      title={pinnedIds.includes(idx) ? 'Unpin alert' : 'Pin alert to chart'}
                    >
                      {pinnedIds.includes(idx) ? (
                        <Pin className="h-3.5 w-3.5 text-blue-500 fill-blue-500" />
                      ) : (
                        <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
                {/* Meta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">R:R {sig.risk_reward}</span>
                    {sig.max_hold_time && <span className="text-[10px] text-muted-foreground">Hold: {sig.max_hold_time}</span>}
                    {sig.risk_percent !== undefined && (
                      <span className="text-[10px] text-muted-foreground">Risk: {sig.risk_percent.toFixed(2)}%</span>
                    )}
                  </div>
                </div>

                {/* Confidence */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-16">Confidence</span>
                  <Progress value={sig.confidence} className="h-1.5 flex-1" />
                  <span className="text-[10px] font-medium w-8 text-right">{sig.confidence}%</span>
                </div>

                {/* Position Sizing */}
                {(sig.position_size_quote || sig.risk_amount) && (
                  <div className="rounded-md bg-muted/50 p-2 space-y-1">
                    <div className="flex items-center gap-1">
                      <Wallet className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-medium">Position Sizing</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      {sig.position_size_quote !== undefined && (
                        <div>
                          <div className="text-[10px] text-muted-foreground">Position Value</div>
                          <div className="text-xs font-semibold">${sig.position_size_quote.toFixed(2)}</div>
                        </div>
                      )}
                      {sig.risk_amount !== undefined && (
                        <div>
                          <div className="text-[10px] text-muted-foreground">At Risk</div>
                          <div className="text-xs font-semibold text-red-500">${sig.risk_amount.toFixed(2)}</div>
                        </div>
                      )}
                      {sig.position_size !== undefined && (
                        <div>
                          <div className="text-[10px] text-muted-foreground">Units</div>
                          <div className="text-xs font-semibold">{sig.position_size.toFixed(4)}</div>
                        </div>
                      )}
                      {sig.risk_percent !== undefined && (
                        <div>
                          <div className="text-[10px] text-muted-foreground">Risk %</div>
                          <div className="text-xs font-semibold">{sig.risk_percent.toFixed(2)}%</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Prices */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-background/50 p-1.5">
                    <div className="text-[10px] text-muted-foreground">Entry</div>
                    <div className="text-xs font-semibold">{sig.entry_price.toFixed(2)}</div>
                  </div>
                  {sig.take_profits.slice(0, 2).map((tp, i) => (
                    <div key={i} className="rounded-md bg-green-500/10 p-1.5">
                      <div className="text-[10px] text-green-600">{tp.label?.split(' ')[0] || `TP${i + 1}`}</div>
                      <div className="text-xs font-semibold text-green-600">{tp.price.toFixed(2)}</div>
                    </div>
                  ))}
                  {sig.take_profits.length < 2 && (
                    <div className="rounded-md bg-green-500/10 p-1.5">
                      <div className="text-[10px] text-green-600">TP</div>
                      <div className="text-xs font-semibold text-green-600">—</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-md bg-red-500/10 px-2 py-1">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-red-500" />
                    <span className="text-[10px] text-red-500">Stop Loss</span>
                  </div>
                  <span className="text-xs font-semibold text-red-500">{sig.stop_loss.toFixed(2)}</span>
                </div>

                {/* Indicators */}
                {sig.indicators.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sig.indicators.map((ind) => (
                      <Badge key={ind} variant="secondary" className="text-[9px] h-4 px-1">
                        {ind}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Market Read */}
                {sig.market_read && (
                  <div className="rounded-md bg-blue-500/5 border border-blue-500/10 px-2 py-1.5">
                    <div className="flex items-start gap-1.5">
                      <TrendingUp className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{sig.market_read}</p>
                    </div>
                    {onShowOnChart && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onShowOnChart(sig) }}
                        className="mt-1 flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 transition-colors"
                      >
                        <Eye className="h-3 w-3" /> Show me this on the chart
                      </button>
                    )}
                  </div>
                )}

                {/* Reasoning & Rationale */}
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{sig.reasoning}</p>
                  {sig.rationale && (
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-green-600/80 leading-relaxed">{sig.rationale}</p>
                    </div>
                  )}
                  {onShowOnChart && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onShowOnChart(sig) }}
                      className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 transition-colors mt-1"
                    >
                      <Eye className="h-3 w-3" /> Show me what this looks like on the chart
                    </button>
                  )}
                </div>

                {/* Warnings */}
                {sig.warnings && sig.warnings.length > 0 && (
                  <div className="rounded-md bg-yellow-500/5 border border-yellow-500/10 px-2 py-1.5 space-y-1">
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      <span className="text-[10px] font-medium text-yellow-600">Things to Watch Out For</span>
                    </div>
                    <ul className="space-y-0.5">
                      {sig.warnings.map((w, i) => (
                        <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                    {onShowOnChart && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onShowOnChart(sig) }}
                        className="flex items-center gap-1 text-[10px] text-yellow-600 hover:text-yellow-700 transition-colors mt-1"
                      >
                        <Eye className="h-3 w-3" /> Show me where to look on the chart
                      </button>
                    )}
                  </div>
                )}

                {/* Execute Trade */}
                <Button
                  size="sm"
                  className="w-full gap-1.5 text-xs h-8 mt-1"
                  variant={sig.direction === 'long' ? 'default' : 'destructive'}
                  onClick={(e) => { e.stopPropagation(); handleExecuteTrade(sig, idx) }}
                  disabled={executingIdx === idx}
                >
                  {executingIdx === idx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                  {executingIdx === idx ? 'Placing Order...' : sig.position_size_quote
                    ? `Execute $${sig.position_size_quote.toFixed(0)} ${sig.direction.toUpperCase()}`
                    : `Execute ${sig.direction.toUpperCase()} on Binance`}
                </Button>
              </div>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}
