import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react'

interface Anomaly {
  id: string
  type: 'spike' | 'drop' | 'frequency'
  severity: 'low' | 'medium' | 'high'
  category: string
  message: string
  amount?: number
  avgAmount?: number
}

export default function AnomaliesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await window.api?.expenses?.getAll?.({}).catch(() => [])
        setExpenses(data || [])
      } catch (e) {
        console.warn('Anomalies load failed', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const anomalies = useMemo(() => {
    const findings: Anomaly[] = []

    const categoryTotals: Record<string, { total: number; count: number; amounts: number[] }> = {}
    expenses.forEach((e: any) => {
      const cat = e.category_name || e.category || 'Uncategorized'
      if (!categoryTotals[cat]) categoryTotals[cat] = { total: 0, count: 0, amounts: [] }
      categoryTotals[cat].total += e.amount
      categoryTotals[cat].count += 1
      categoryTotals[cat].amounts.push(e.amount)
    })

    // Spike detection: category > 2.5x average
    Object.entries(categoryTotals).forEach(([cat, data]) => {
      const avg = data.total / data.count
      const max = Math.max(...data.amounts)
      if (max > avg * 2.5 && data.count >= 3) {
        findings.push({
          id: `spike-${cat}`,
          type: 'spike',
          severity: max > avg * 5 ? 'high' : 'medium',
          category: cat,
          message: `${cat} spending spiked to $${max.toFixed(2)} (avg $${avg.toFixed(2)})`,
          amount: max,
          avgAmount: avg,
        })
      }
    })

    // Drop detection: unusually low recent activity
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const recentExpenses = expenses.filter((e: any) => new Date(e.date) >= thirtyDaysAgo)
    Object.entries(categoryTotals).forEach(([cat, data]) => {
      const recent = recentExpenses.filter((e: any) => (e.category_name || e.category || 'Uncategorized') === cat)
      const recentTotal = recent.reduce((s, e) => s + e.amount, 0)
      const historicalAvg = data.total / Math.max(data.count, 1)
      if (recentTotal < historicalAvg * 0.3 && data.count >= 5) {
        findings.push({
          id: `drop-${cat}`,
          type: 'drop',
          severity: 'low',
          category: cat,
          message: `${cat} spending unusually low this month ($${recentTotal.toFixed(2)} vs avg $${historicalAvg.toFixed(2)})`,
        })
      }
    })

    // Frequency changes: merchant visited 3+ times
    const merchantCounts: Record<string, number> = {}
    expenses.forEach((e: any) => {
      if (e.merchant) {
        merchantCounts[e.merchant] = (merchantCounts[e.merchant] || 0) + 1
      }
    })
    Object.entries(merchantCounts).forEach(([merchant, count]) => {
      if (count >= 3) {
        findings.push({
          id: `freq-${merchant}`,
          type: 'frequency',
          severity: count >= 6 ? 'medium' : 'low',
          category: merchant,
          message: `Visited ${merchant} ${count} times — possible subscription or habit`,
        })
      }
    })

    return findings
  }, [expenses])

  const severityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return <Badge variant="destructive" className="text-[10px]">High</Badge>
      case 'medium': return <Badge className="bg-amber-500/10 text-amber-600 text-[10px] border-0">Medium</Badge>
      case 'low': return <Badge variant="secondary" className="text-[10px]">Low</Badge>
      default: return null
    }
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case 'spike': return <TrendingUp className="h-4 w-4 text-destructive" />
      case 'drop': return <TrendingDown className="h-4 w-4 text-blue-500" />
      case 'frequency': return <Activity className="h-4 w-4 text-amber-500" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Spending Anomalies</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        AI-detected unusual spending patterns, spikes, drops, and frequency changes in your expense data.
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground">Analyzing expenses...</div>
      ) : anomalies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Activity className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No anomalies detected. Your spending looks consistent!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {anomalies.map(a => (
            <Card key={a.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="mt-0.5 shrink-0">{typeIcon(a.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{a.message}</span>
                    {severityBadge(a.severity)}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{a.type} anomaly &middot; {a.category}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
