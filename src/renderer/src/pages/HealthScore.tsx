import { useState, useEffect } from 'react'
import { Activity, RefreshCw, Save, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ScoreComponent { label: string; score: number; max: number; description: string; status: 'good' | 'ok' | 'poor' }

interface HealthData {
  overall: number
  components: ScoreComponent[]
  summary: string
  net_monthly: number
  savings_rate: number
  total_debt: number
  total_assets: number
}

const getColor = (score: number, max: number) => {
  const pct = (score / max) * 100
  if (pct >= 70) return 'text-green-500'
  if (pct >= 40) return 'text-yellow-500'
  return 'text-destructive'
}

const getProgressClass = (status: string) => {
  if (status === 'good') return ''
  if (status === 'ok') return '[&>div]:bg-yellow-500'
  return '[&>div]:bg-destructive'
}

const getGrade = (score: number) => {
  if (score >= 80) return { grade: 'A', label: 'Excellent', color: 'text-green-500' }
  if (score >= 65) return { grade: 'B', label: 'Good', color: 'text-emerald-500' }
  if (score >= 50) return { grade: 'C', label: 'Fair', color: 'text-yellow-500' }
  if (score >= 35) return { grade: 'D', label: 'Needs Work', color: 'text-orange-500' }
  return { grade: 'F', label: 'Critical', color: 'text-destructive' }
}

export default function HealthScorePage() {
  const { format, formatCompact } = useCurrency()
  const [data, setData] = useState<HealthData | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const month = new Date().toISOString().slice(0, 7)
      const result = await window.api?.dashboard?.getSummary?.(month)
      if (result) {
        const savingsRate = result.total_income > 0 ? ((result.total_income - result.total_expenses) / result.total_income) * 100 : 0
        const debtToIncome = result.total_income > 0 ? (result.total_debt_payments / result.total_income) * 100 : 100
        const emergencyFund = result.monthly_savings > 0 ? (result.emergency_fund_months || 0) : 0
        const goalProgress = result.total_goals > 0 ? (result.funded_goals / result.total_goals) * 100 : 0

        const components: ScoreComponent[] = [
          {
            label: 'Savings Rate',
            score: Math.min(Math.max(savingsRate, 0), 25) * (20 / 25),
            max: 20,
            description: `${savingsRate.toFixed(1)}% of income saved`,
            status: savingsRate >= 15 ? 'good' : savingsRate >= 5 ? 'ok' : 'poor'
          },
          {
            label: 'Debt-to-Income',
            score: Math.max(20 - (debtToIncome / 100) * 20, 0),
            max: 20,
            description: `${debtToIncome.toFixed(1)}% debt payments vs income`,
            status: debtToIncome <= 20 ? 'good' : debtToIncome <= 35 ? 'ok' : 'poor'
          },
          {
            label: 'Emergency Fund',
            score: Math.min(emergencyFund, 6) * (20 / 6),
            max: 20,
            description: `${emergencyFund.toFixed(1)} months of expenses covered`,
            status: emergencyFund >= 6 ? 'good' : emergencyFund >= 3 ? 'ok' : 'poor'
          },
          {
            label: 'Goal Progress',
            score: (goalProgress / 100) * 20,
            max: 20,
            description: `${goalProgress.toFixed(0)}% of savings goals funded`,
            status: goalProgress >= 60 ? 'good' : goalProgress >= 30 ? 'ok' : 'poor'
          },
          {
            label: 'Budget Adherence',
            score: result.budget_adherence ? (result.budget_adherence / 100) * 20 : 10,
            max: 20,
            description: result.budget_adherence ? `${result.budget_adherence}% under budget` : 'Track expenses to improve',
            status: (result.budget_adherence || 0) >= 70 ? 'good' : (result.budget_adherence || 0) >= 40 ? 'ok' : 'poor'
          },
        ]

        const overall = Math.round(components.reduce((s, c) => s + c.score, 0))
        setData({
          overall,
          components,
          summary: result.summary || '',
          net_monthly: result.total_income - result.total_expenses,
          savings_rate: savingsRate,
          total_debt: result.total_debt || 0,
          total_assets: result.total_assets || 0,
        })
      }
    } catch (e) { console.warn(e) }
    finally { setLoading(false) }
  }

  const loadHistory = async () => {
    try {
      const h = await window.api?.healthScore?.getHistory?.()
      setHistory(h || [])
    } catch { /* ignore */ }
  }

  const saveScore = async () => {
    if (!data) return
    try {
      const payload = {
        score: data.overall,
        savings_rate: data.savings_rate,
        debt_to_income: data.components.find(c => c.label === 'Debt-to-Income')?.score || 0,
        budget_adherence: data.components.find(c => c.label === 'Budget Adherence')?.score || 0,
        emergency_fund_months: data.components.find(c => c.label === 'Emergency Fund')?.score || 0,
        investment_ratio: data.components.find(c => c.label === 'Goal Progress')?.score || 0,
        breakdown: data.components,
      }
      await window.api?.healthScore?.save?.(payload)
      toast.success('Score saved to history')
      loadHistory()
    } catch { toast.error('Failed to save score') }
  }

  useEffect(() => { load(); loadHistory() }, [])

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
    </div>
  )

  if (!data) return null

  const { grade, label, color } = getGrade(data.overall)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Financial Health Score</h2>
          <p className="text-sm text-muted-foreground">Based on your financial data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={saveScore}><Save className="mr-2 h-4 w-4" /> Save Score</Button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className={`text-7xl font-black ${color}`}>{grade}</div>
              <div className={`text-sm font-semibold ${color}`}>{label}</div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Score</span>
                <span className={`text-2xl font-bold ${color}`}>{data.overall}<span className="text-base text-muted-foreground">/100</span></span>
              </div>
              <Progress value={data.overall} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Net Monthly', value: formatCompact(data.net_monthly), color: data.net_monthly >= 0 ? 'text-green-500' : 'text-destructive' },
          { label: 'Savings Rate', value: `${data.savings_rate.toFixed(1)}%`, color: data.savings_rate >= 15 ? 'text-green-500' : data.savings_rate >= 5 ? 'text-yellow-500' : 'text-destructive' },
          { label: 'Total Debt', value: formatCompact(data.total_debt), color: data.total_debt === 0 ? 'text-green-500' : 'text-destructive' },
          { label: 'Total Assets', value: formatCompact(data.total_assets), color: 'text-primary' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Score History</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={[...history].reverse().map(h => ({ date: h.recorded_at?.split('T')[0] || '', score: h.score }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${v}/100`} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data.components.map(c => (
          <Card key={c.label}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{c.label}</span>
                <span className={`text-sm font-bold ${getColor(c.score, c.max)}`}>
                  {Math.round(c.score)}/{c.max}
                </span>
              </div>
              <Progress value={(c.score / c.max) * 100} className={`h-2 ${getProgressClass(c.status)}`} />
              <p className="text-xs text-muted-foreground">{c.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
