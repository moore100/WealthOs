import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  GraduationCap, ChevronRight, ChevronLeft, X, Lightbulb,
  TrendingUp, Eye, BookOpen, Sparkles
} from 'lucide-react'
import { chatComplete } from '@/lib/ai'
import type { OHLCVCandle } from '@/hooks/useOHLCV'

export type HighlightTarget =
  | { type: 'candle'; index: number; label?: string }
  | { type: 'price-level'; price: number; label?: string }
  | { type: 'region'; x1: number; y1: number; x2: number; y2: number; label?: string }
  | { type: 'indicator'; name: string; label?: string }
  | { type: 'live-price'; label?: string }
  | { type: 'pattern'; pattern: string; startIndex: number; endIndex: number; label?: string }
  | { type: 'trade-example'; entryPrice: number; stopLoss: number; takeProfit: number; direction: 'long' | 'short'; label?: string }

export interface TutorialStep {
  id: string
  title: string
  content: string
  tip?: string
  highlight?: HighlightTarget
}

export interface TutorialData {
  title: string
  description: string
  steps: TutorialStep[]
}

interface ChartTutorialProps {
  assetName: string
  assetType: 'crypto' | 'forex'
  currentPrice: number
  candles: OHLCVCandle[]
  isOpen: boolean
  onClose: () => void
  onStepChange?: (step: TutorialStep | null) => void
}

export default function ChartTutorial({
  assetName,
  assetType,
  currentPrice,
  candles,
  isOpen,
  onClose,
  onStepChange,
}: ChartTutorialProps) {
  const [tutorial, setTutorial] = useState<TutorialData | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)

  const generateTutorial = useCallback(async () => {
    if (candles.length < 10) return
    setLoading(true)
    setStarted(true)
    try {
      const recentCandles = candles.slice(-20)
      const priceContext = {
        asset: assetName,
        type: assetType,
        currentPrice: currentPrice.toFixed(assetType === 'forex' ? 5 : 2),
        highest: Math.max(...recentCandles.map(c => c.high)).toFixed(assetType === 'forex' ? 5 : 2),
        lowest: Math.min(...recentCandles.map(c => c.low)).toFixed(assetType === 'forex' ? 5 : 2),
        recentClose: recentCandles[recentCandles.length - 1].close.toFixed(assetType === 'forex' ? 5 : 2),
        previousClose: recentCandles[recentCandles.length - 2].close.toFixed(assetType === 'forex' ? 5 : 2),
        candleCount: candles.length,
        sampleCandles: recentCandles.slice(-5).map((c, i) => ({
          index: candles.length - 5 + i,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
      }

      const systemPrompt = `You are an expert trading educator. Create a step-by-step interactive trading tutorial for a complete beginner analyzing live chart data.

The tutorial must be engaging, story-like, and practical. Each step should teach ONE concept at a time and include a highlight target so the app can visually circle or point to the relevant part of the chart.

Respond ONLY with valid JSON in this exact format:
{
  "title": "Catchy tutorial title",
  "description": "1 sentence inviting the user to learn",
  "steps": [
    {
      "id": "step-1",
      "title": "Step title (e.g., 'Understanding Candlesticks')",
      "content": "2-3 sentences explaining the concept in beginner-friendly language. Use the actual price data provided.",
      "tip": "A pro tip or quick mnemonic (optional)",
      "highlight": {
        "type": "candle | price-level | pattern | live-price | trade-example",
        "index": number (for candle type, which candle to highlight),
        "price": number (for price-level type),
        "pattern": string (for pattern type, e.g. 'bullish-engulfing'),
        "startIndex": number (for pattern type),
        "endIndex": number (for pattern type),
        "entryPrice": number (for trade-example type),
        "stopLoss": number (for trade-example type),
        "takeProfit": number (for trade-example type),
        "direction": "long | short" (for trade-example type),
        "label": "label text to show near highlight"
      }
    }
  ]
}

Rules:
- Create 9-12 steps covering: candlestick basics, reading price action, support/resistance, trend direction, volume/activity, entry points, stop losses, risk management, and at least ONE example trade setup
- Use the actual price data in explanations (reference real prices)
- Make it conversational and encouraging
- highlight.type must be one of: 'candle', 'price-level', 'pattern', 'live-price', 'indicator', 'trade-example'
- For candle highlights, use indexes 0 to (candleCount - 1), where 0 is the oldest and (candleCount-1) is the newest
- For live-price highlight, no extra fields needed
- For trade-example highlight, provide entryPrice, stopLoss, takeProfit, and direction. Make them realistic based on current support/resistance and price action. Explain WHY this is a good trade setup.
- Each step should build on the previous one
- Include at least one pattern recognition step`

      const userPrompt = `Generate a beginner trading tutorial for ${assetName} (${assetType.toUpperCase()}).

Current data context:
- Current price: ${priceContext.currentPrice}
- Recent high: ${priceContext.highest}
- Recent low: ${priceContext.lowest}
- Latest candle close: ${priceContext.recentClose}
- Previous candle close: ${priceContext.previousClose}
- Total candles on chart: ${priceContext.candleCount}

Recent candles (oldest to newest):
${JSON.stringify(priceContext.sampleCandles, null, 2)}

Create an engaging, step-by-step tutorial that walks a complete beginner through understanding this chart and what a professional trader would look for.`

      const response = await chatComplete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        jsonResponse: true,
        maxTokens: 3000,
      })

      const parsed = JSON.parse(response)
      setTutorial(parsed)
      setCurrentStep(0)
      if (onStepChange && parsed.steps?.[0]) {
        onStepChange(parsed.steps[0])
      }
    } catch (err) {
      // Fallback tutorial on AI failure
      setTutorial({
        title: `Learn to Trade ${assetName}`,
        description: 'A beginner-friendly guide to reading this chart like a pro.',
        steps: [
          {
            id: 'step-1',
            title: 'What is a Candlestick?',
            content: `Each candlestick on this chart represents price movement over a time period. The body shows the open and close prices, while the thin lines (wicks) show the highest and lowest prices reached.`,
            tip: 'Green = price went UP. Red = price went DOWN.',
            highlight: { type: 'candle', index: candles.length - 1, label: 'Latest candle' },
          },
          {
            id: 'step-2',
            title: 'Reading the Current Price',
            content: `The current price of ${assetName} is ${currentPrice.toFixed(assetType === 'forex' ? 5 : 2)}. This is the market price right now. Professional traders always know exactly where price is before making any decisions.`,
            tip: 'Price is always moving. The key is to find where it might go next.',
            highlight: { type: 'live-price', label: 'Current price' },
          },
          {
            id: 'step-3',
            title: 'Support & Resistance',
            content: `Support is a price level where buying pressure is strong enough to stop the price from falling further. Resistance is where selling pressure stops price from rising. These are the most important levels on any chart.`,
            tip: 'When price breaks through resistance, it often becomes new support.',
            highlight: { type: 'price-level', price: Math.min(...candles.slice(-20).map(c => c.low)), label: 'Support zone' },
          },
          {
            id: 'step-4',
            title: 'Trend Direction',
            content: `Is the market going up, down, or sideways? Look at the overall direction of the candles. A series of higher highs and higher lows means an UPTREND. Lower highs and lower lows mean a DOWNTREND.`,
            tip: 'Trade WITH the trend, not against it.',
            highlight: { type: 'candle', index: Math.floor(candles.length / 2), label: 'Trend area' },
          },
          {
            id: 'step-5',
            title: 'Entry Points',
            content: `A professional trader waits for the perfect moment to enter. Common entry signals include: price bouncing off support, breaking through resistance, or forming bullish reversal patterns.`,
            tip: 'Patience is key. Missing a trade is better than losing money on a bad one.',
            highlight: { type: 'price-level', price: currentPrice * 0.99, label: 'Potential entry' },
          },
          {
            id: 'step-6',
            title: 'Protecting Your Trade',
            content: `Always use a stop loss! This is the price level where you admit the trade was wrong and exit. A good stop loss is placed just below support for long trades, or just above resistance for short trades.`,
            tip: 'Never risk more than 1-2% of your account on a single trade.',
            highlight: { type: 'price-level', price: currentPrice * 0.97, label: 'Stop loss zone' },
          },
          {
            id: 'step-7',
            title: 'Taking Profits',
            content: `Know your target BEFORE you enter. A common rule is to have a reward-to-risk ratio of at least 2:1. If you risk $10, aim to make $20. This way, you only need to be right 40% of the time to be profitable.`,
            tip: 'Scale out profits — take some at target 1, more at target 2.',
            highlight: { type: 'price-level', price: currentPrice * 1.03, label: 'Profit target' },
          },
          {
            id: 'step-8',
            title: 'Example Trade Setup',
            content: `Here is a real example trade based on current price action. Imagine entering at ${(currentPrice * 0.995).toFixed(assetType === 'forex' ? 5 : 2)} with a stop loss at ${(currentPrice * 0.97).toFixed(assetType === 'forex' ? 5 : 2)} and a target at ${(currentPrice * 1.04).toFixed(assetType === 'forex' ? 5 : 2)}. This gives a reward-to-risk ratio of about 1.6:1. Notice how the entry is near support, the stop is below the recent low, and the target aligns with the next resistance zone.`,
            tip: 'Always plan your trade before you take it. Write it down.',
            highlight: {
              type: 'trade-example',
              entryPrice: currentPrice * 0.995,
              stopLoss: currentPrice * 0.97,
              takeProfit: currentPrice * 1.04,
              direction: 'long',
              label: 'Example long setup',
            },
          },
          {
            id: 'step-9',
            title: 'You Are Ready!',
            content: `You now understand the basics of reading a chart: candlesticks, price levels, trends, entries, stops, and targets. Practice on historical data before trading with real money. Good luck!`,
            tip: 'The best traders are patient, disciplined, and always learning.',
          },
        ],
      })
      setCurrentStep(0)
      if (onStepChange) onStepChange(null)
    } finally {
      setLoading(false)
    }
  }, [assetName, assetType, currentPrice, candles, onStepChange])

  const goToStep = (idx: number) => {
    if (!tutorial) return
    const newIdx = Math.max(0, Math.min(tutorial.steps.length - 1, idx))
    setCurrentStep(newIdx)
    if (onStepChange) {
      onStepChange(tutorial.steps[newIdx] || null)
    }
  }

  const nextStep = () => goToStep(currentStep + 1)
  const prevStep = () => goToStep(currentStep - 1)

  const handleClose = () => {
    setStarted(false)
    setTutorial(null)
    setCurrentStep(0)
    if (onStepChange) onStepChange(null)
    onClose()
  }

  if (!isOpen) return null

  const step = tutorial?.steps[currentStep]
  const progress = tutorial ? ((currentStep + 1) / tutorial.steps.length) * 100 : 0

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center pointer-events-none">
      <div className="pointer-events-auto bg-background/95 border border-border rounded-t-xl shadow-lg w-full max-w-xl mx-2 flex flex-col overflow-hidden backdrop-blur-sm">
        {/* Inline tooltip header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <GraduationCap className="h-3 w-3 text-white" />
            </div>
            <span className="text-[11px] font-semibold truncate max-w-[200px]">
              {tutorial ? tutorial.title : 'Learn Trading'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {started && !loading && tutorial && (
              <span className="text-[10px] text-muted-foreground">
                {currentStep + 1}/{tutorial.steps.length}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClose}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0">
          {!started ? (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">Learn to Trade Like a Pro</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  AI analyzes live chart data to teach you step-by-step.
                </p>
              </div>
              <Button
                className="h-7 text-[11px] gap-1 px-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shrink-0"
                onClick={generateTutorial}
                disabled={loading || candles.length < 10}
              >
                {loading ? (
                  <Sparkles className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Start
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-spin" />
              <p className="text-[11px] text-muted-foreground animate-pulse">
                AI is building your personalized lesson...
              </p>
            </div>
          ) : step ? (
            <div className="px-3 py-2 space-y-2">
              {/* Title row */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  Step {currentStep + 1}
                </Badge>
                <h4 className="text-xs font-semibold leading-tight">{step.title}</h4>
              </div>

              {/* Compact content */}
              <p className="text-[11px] text-foreground leading-relaxed">{step.content}</p>

              {/* Tip */}
              {step.tip && (
                <div className="rounded-md bg-amber-500/5 border border-amber-500/15 p-1.5 flex gap-1.5">
                  <Lightbulb className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground">{step.tip}</p>
                </div>
              )}

              {/* Progress & nav */}
              <div className="flex items-center gap-2 pt-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-0.5 px-1.5"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="h-3 w-3" /> Prev
                </Button>

                <div className="flex-1">
                  <Progress value={progress} className="h-1" />
                </div>

                <div className="flex gap-0.5">
                  {tutorial?.steps.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToStep(i)}
                      className={`w-1 h-1 rounded-full transition-all ${
                        i === currentStep ? 'bg-amber-500 w-3' : i < currentStep ? 'bg-amber-500/40' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  variant={currentStep === (tutorial?.steps.length ?? 1) - 1 ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-6 text-[10px] gap-0.5 px-1.5 ${
                    currentStep === (tutorial?.steps.length ?? 1) - 1
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                      : ''
                  }`}
                  onClick={nextStep}
                >
                  {currentStep === (tutorial?.steps.length ?? 1) - 1 ? 'Done' : (
                    <>Next <ChevronRight className="h-3 w-3" /></>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export { type TutorialStep, type TutorialData, type HighlightTarget }
