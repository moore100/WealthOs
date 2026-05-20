import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Lightbulb, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { AIInsight } from '@/types'

const ICON_MAP: Record<string, typeof Lightbulb> = {
  tip: Lightbulb,
  warning: AlertTriangle,
  positive: TrendingUp,
  negative: TrendingDown,
}

const BADGE_MAP: Record<string, string> = {
  tip: 'bg-blue-500/10 text-blue-500',
  warning: 'bg-yellow-500/10 text-yellow-500',
  positive: 'bg-green-500/10 text-green-500',
  negative: 'bg-destructive/10 text-destructive',
}

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)

  const load = async () => {
    try { const data = await window.api?.insights?.getAll(); setInsights(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const settings = await window.api?.settings?.get() as any
        const provider = settings?.llm_provider || 'openai'
        setHasKey(provider === 'ollama' ? true : !!settings?.openai_key)
        if (settings?.last_insights_date) setLastGenerated(settings.last_insights_date)
      } catch { /* ignore */ }
      load()
    }
    init()
  }, [])

  const handleGenerate = async () => {
    if (!hasKey) { toast.error('Configure your AI provider in Settings → AI Provider'); return }
    setGenerating(true)
    try {
      const data = await window.api?.ai?.generateInsights()
      setInsights(data || [])
      setLastGenerated(new Date().toISOString().slice(0, 10))
      toast.success('Insights generated!')
    } catch { toast.error('Failed to generate insights') }
    finally { setGenerating(false) }
  }

  const categorized = {
    positive: insights.filter(i => i.type === 'positive'),
    tip: insights.filter(i => i.type === 'tip'),
    warning: insights.filter(i => i.type === 'warning'),
    negative: insights.filter(i => i.type === 'negative'),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">AI Insights</h2>
          <p className="text-sm text-muted-foreground">
            {lastGenerated ? `Last generated: ${lastGenerated}` : 'AI-powered financial insights'}
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating || !hasKey}>
          {generating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {generating ? 'Generating...' : 'Generate Insights'}
        </Button>
      </div>

      {!hasKey && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <p className="text-sm">Configure your AI provider in <strong>Settings → AI Provider</strong> to generate AI insights.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : insights.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No insights yet</p>
            <p className="text-sm text-muted-foreground">Click "Generate Insights" to get AI-powered analysis</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(Object.entries(categorized) as [string, AIInsight[]][]).map(([type, items]) => {
            if (items.length === 0) return null
            const Icon = ICON_MAP[type] || Lightbulb
            const labels: Record<string, string> = { positive: 'What\'s Going Well', tip: 'Tips & Recommendations', warning: 'Things to Watch', negative: 'Areas to Improve' }
            return (
              <div key={type}>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-sm">
                  <Icon className="h-4 w-4" />
                  {labels[type]}
                </h3>
                <div className="space-y-3">
                  {items.map(insight => (
                    <Card key={insight.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${BADGE_MAP[type]}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{insight.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                            {insight.action && (
                              <p className="mt-2 text-xs font-medium text-primary">→ {insight.action}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
