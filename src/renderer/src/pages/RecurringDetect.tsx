import { useState, useEffect } from 'react'
import { Repeat, CheckCircle, XCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'

interface RecurringPattern {
  name: string
  merchant: string
  amount: number
  frequency: string
  count: number
  category_id: number | null
  dates: string[]
}

export default function RecurringDetectPage() {
  const { format } = useCurrency()
  const [patterns, setPatterns] = useState<RecurringPattern[]>([])
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState<Record<string, boolean>>({})

  const detect = async () => {
    setLoading(true)
    try {
      const expenses = await window.api?.expenses?.getAll({}) || []
      const grouped: Record<string, any[]> = {}
      expenses.forEach((e: any) => {
        const key = (e.merchant || e.name).toLowerCase().trim()
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(e)
      })

      const found: RecurringPattern[] = []
      Object.entries(grouped).forEach(([key, items]) => {
        if (items.length >= 2) {
          const amounts = items.map((i: any) => i.amount)
          const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
          const variance = amounts.map((a: number) => Math.abs(a - avg)).reduce((a, b) => a + b, 0) / amounts.length
          if (variance / avg < 0.15) {
            const dates = items.map((i: any) => i.date).sort()
            const diffs: number[] = []
            for (let i = 1; i < dates.length; i++) {
              const d1 = new Date(dates[i - 1])
              const d2 = new Date(dates[i])
              diffs.push((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
            }
            const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length
            let freq = 'irregular'
            if (avgDiff >= 25 && avgDiff <= 35) freq = 'monthly'
            else if (avgDiff >= 6 && avgDiff <= 9) freq = 'weekly'
            else if (avgDiff >= 13 && avgDiff <= 16) freq = 'biweekly'
            else if (avgDiff >= 85 && avgDiff <= 95) freq = 'quarterly'
            else if (avgDiff >= 360 && avgDiff <= 370) freq = 'yearly'

            if (freq !== 'irregular' || items.length >= 3) {
              found.push({
                name: items[0].name,
                merchant: items[0].merchant || key,
                amount: avg,
                frequency: freq,
                count: items.length,
                category_id: items[0].category_id,
                dates,
              })
            }
          }
        }
      })
      setPatterns(found.sort((a, b) => b.count - a.count))
    } catch { toast.error('Failed to analyze') }
    setLoading(false)
  }

  const convertToSubscription = async (p: RecurringPattern) => {
    const key = p.name + p.merchant
    setConverting(prev => ({ ...prev, [key]: true }))
    try {
      await window.api?.subscriptions?.add?.({
        name: p.name,
        amount: p.amount,
        frequency: p.frequency,
        category_id: p.category_id,
        merchant: p.merchant,
        next_billing_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10),
      })
      toast.success(`Converted "${p.name}" to subscription`)
    } catch {
      toast.error('Failed to convert')
    }
    setConverting(prev => ({ ...prev, [key]: false }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            Recurring Transaction Auto-Detect
          </h2>
          <p className="text-sm text-muted-foreground">Find hidden subscriptions and recurring expenses</p>
        </div>
        <Button onClick={detect} disabled={loading}>
          <Sparkles className="mr-2 h-4 w-4" />
          {loading ? 'Scanning...' : 'Scan for Patterns'}
        </Button>
      </div>

      {patterns.length === 0 && !loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <Repeat className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No recurring patterns detected yet</p>
            <p className="text-sm text-muted-foreground">Click Scan to analyze your expense history</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {patterns.map((p, idx) => {
          const key = p.name + p.merchant
          return (
            <Card key={idx}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{p.name}</span>
                    <Badge variant="outline">{p.frequency}</Badge>
                    <Badge variant="secondary">{p.count} occurrences</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.merchant} · Avg {format(p.amount)}</p>
                </div>
                <Button size="sm" onClick={() => convertToSubscription(p)} disabled={converting[key]}>
                  <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                  {converting[key] ? 'Converting...' : 'Make Subscription'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
