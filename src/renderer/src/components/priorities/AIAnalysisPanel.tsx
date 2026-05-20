import { useState } from 'react'
import { BrainCircuit, Loader2, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { chatComplete, isLLMConfigured } from '@/lib/ai'
import type { OHLCVCandle } from '@/hooks/useOHLCV'

interface AIAnalysisPanelProps {
  assetName: string
  assetType: 'crypto' | 'forex'
  currentPrice: number
  priceChangePercent: number
  candles: OHLCVCandle[]
}

interface AnalysisResult {
  text: string
  generatedAt: string
}

export default function AIAnalysisPanel({
  assetName,
  assetType,
  currentPrice,
  priceChangePercent,
  candles,
}: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!(await isLLMConfigured())) {
      // Use window.toast or sonner
      const { toast } = await import('sonner')
      toast.error('No AI provider configured. Go to Settings → AI Provider.')
      return
    }
    setLoading(true)
    try {
      const lastCandles = candles.slice(-20)
      const candleSummary = lastCandles
        .map(
          (c) =>
            `O:${c.open.toFixed(4)} H:${c.high.toFixed(4)} L:${c.low.toFixed(4)} C:${c.close.toFixed(4)}`
        )
        .join('\n')

      const systemPrompt = `You are a professional financial analyst assistant. The user is viewing a live market chart for ${assetName} (${assetType.toUpperCase()}).
Analyze the provided price data and give a clear, actionable recommendation.
Structure your response as:
1. Market Summary (2-3 sentences on what the price is doing)
2. Trend Analysis (is it bullish, bearish, or consolidating — and why)
3. Key Levels (support and resistance if identifiable from the data)
4. Recommendation (Buy / Sell / Hold / Wait — with brief reasoning)
5. Risk Note (one sentence on what to watch out for)
Keep the tone professional but accessible. Do not use excessive jargon.`

      const userContent = `Current price: $${currentPrice.toFixed(assetType === 'forex' ? 5 : 2)}
24h change: ${priceChangePercent.toFixed(2)}%

Last 20 candles OHLC:
${candleSummary}`

      const text = await chatComplete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        maxTokens: 600,
        jsonResponse: false,
      })

      setAnalysis({
        text,
        generatedAt: new Date().toLocaleTimeString(),
      })
    } catch (e: any) {
      const { toast } = await import('sonner')
      toast.error(e?.message || 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const formatAnalysis = (text: string) => {
    const sections = text.split(/\n?\d+\.\s+/).filter(Boolean)
    const titles = ['Market Summary', 'Trend Analysis', 'Key Levels', 'Recommendation', 'Risk Note']
    return sections.map((section, i) => ({
      title: titles[i] || `Section ${i + 1}`,
      content: section.trim(),
    }))
  }

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 text-xs h-8"
        onClick={handleAnalyze}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : analysis ? (
          <RefreshCw className="h-3.5 w-3.5" />
        ) : (
          <BrainCircuit className="h-3.5 w-3.5" />
        )}
        {loading ? 'Analyzing...' : analysis ? 'Re-analyze' : 'Analyze with AI'}
      </Button>

      {analysis && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            Analysis generated at {analysis.generatedAt}
          </div>
          {formatAnalysis(analysis.text).map((section, i) => (
            <div key={i}>
              <p className="text-[11px] font-semibold text-foreground mb-0.5">{section.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
