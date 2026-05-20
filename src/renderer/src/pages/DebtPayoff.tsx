import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useCurrency } from '@/hooks/useCurrency'
import type { Loan } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { Calculator, TrendingDown, Zap, Snowflake, ArrowRight, CheckCircle2 } from 'lucide-react'

interface PayoffScenario {
  name: string
  totalInterest: number
  monthsToPayoff: number
  payoffDate: string
  loans: { loan: Loan; months: number; interest: number; payments: { month: number; balance: number }[] }[]
}

function calculatePayoff(loans: Loan[], extraMonthly: number, strategy: 'avalanche' | 'snowball'): PayoffScenario {
  const sorted = [...loans]
    .filter(l => l.remaining_balance > 0 && l.interest_rate > 0)
    .sort((a, b) => {
      if (strategy === 'avalanche') return b.interest_rate - a.interest_rate
      return a.remaining_balance - b.remaining_balance
    })

  const balances = sorted.map(l => ({ ...l, currentBalance: l.remaining_balance }))
  let month = 0
  const maxMonths = 600
  const loanTracks = sorted.map(l => ({ loan: l, months: 0, interest: 0, payments: [] as { month: number; balance: number }[] }))
  const totalMonthlyMin = sorted.reduce((s, l) => s + (l.monthly_payment || 0), 0)

  while (balances.some(b => b.currentBalance > 0.01) && month < maxMonths) {
    month++
    let availableExtra = extraMonthly

    for (let i = 0; i < balances.length; i++) {
      const b = balances[i]
      if (b.currentBalance <= 0.01) continue

      const minPayment = b.monthly_payment || Math.max(10, b.remaining_balance * (b.interest_rate / 100 / 12))
      const interest = b.currentBalance * (b.interest_rate / 100 / 12)
      let payment = minPayment

      const isFocused = balances.slice(0, i).every(bb => bb.currentBalance <= 0.01)
      if (isFocused && availableExtra > 0) {
        payment += availableExtra
        availableExtra = 0
      }

      const principal = Math.min(payment - interest, b.currentBalance)
      b.currentBalance = Math.max(0, b.currentBalance - principal)
      const idx = loanTracks.findIndex(t => t.loan.id === b.id)
      if (idx >= 0) {
        loanTracks[idx].interest += interest
        loanTracks[idx].payments.push({ month, balance: b.currentBalance })
      }
    }
  }

  loanTracks.forEach(t => { t.months = t.payments.length })
  const totalInterest = loanTracks.reduce((s, t) => s + t.interest, 0)
  const monthsToPayoff = month
  const payoffDate = new Date()
  payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff)

  return {
    name: strategy === 'avalanche' ? 'Avalanche (Highest Rate First)' : 'Snowball (Lowest Balance First)',
    totalInterest,
    monthsToPayoff,
    payoffDate: payoffDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' }),
    loans: loanTracks,
  }
}

export default function DebtPayoffPage() {
  const { format: fmt } = useCurrency()
  const [loans, setLoans] = useState<Loan[]>([])
  const [extra, setExtra] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { const data = await window.api?.loans?.getAll(); setLoans(data || []) }
    catch (e) { console.warn(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const activeLoans = useMemo(() => loans.filter(l => l.remaining_balance > 0), [loans])
  const totalDebt = activeLoans.reduce((s, l) => s + l.remaining_balance, 0)
  const totalMinMonthly = activeLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0)
  const avgRate = activeLoans.length > 0
    ? activeLoans.reduce((s, l) => s + l.interest_rate, 0) / activeLoans.length
    : 0

  const avalanche = useMemo(() => calculatePayoff(activeLoans, extra, 'avalanche'), [activeLoans, extra])
  const snowball = useMemo(() => calculatePayoff(activeLoans, extra, 'snowball'), [activeLoans, extra])

  const chartData = useMemo(() => {
    const maxMonths = Math.max(avalanche.monthsToPayoff, snowball.monthsToPayoff, 12)
    const data = []
    for (let m = 1; m <= maxMonths; m += Math.ceil(maxMonths / 24)) {
      data.push({
        month: m,
        avalanche: avalanche.loans.reduce((s, t) => {
          const p = t.payments.find(p => p.month === m)
          return s + (p ? p.balance : (t.months >= m ? t.loan.remaining_balance : 0))
        }, 0),
        snowball: snowball.loans.reduce((s, t) => {
          const p = t.payments.find(p => p.month === m)
          return s + (p ? p.balance : (t.months >= m ? t.loan.remaining_balance : 0))
        }, 0),
      })
    }
    return data
  }, [avalanche, snowball])

  const interestSaved = snowball.totalInterest - avalanche.totalInterest
  const monthsSaved = snowball.monthsToPayoff - avalanche.monthsToPayoff

  if (loading) return <div className="text-sm text-muted-foreground">Loading debt data...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Debt Payoff Calculator</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Compare Avalanche (highest rate first) vs Snowball (lowest balance first). See which saves more and gets you debt-free faster.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-4 w-4 mx-auto mb-1 text-rose-500" />
            <p className="text-sm font-bold">{fmt(totalDebt)}</p>
            <p className="text-[10px] text-muted-foreground">Total Debt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-sm font-bold">{fmt(totalMinMonthly)}/mo</p>
            <p className="text-[10px] text-muted-foreground">Min Payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-sm font-bold">{avgRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Avg Interest Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Extra Payment Slider */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Extra Monthly Payment</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Additional $/mo toward debt</span>
            <Badge variant="outline">{fmt(extra)}</Badge>
          </div>
          <Slider value={[extra]} onValueChange={v => setExtra(v[0])} max={Math.max(5000, totalDebt * 0.1)} step={50} />
          <div className="flex gap-2">
            {[0, 100, 250, 500, 1000].map(v => (
              <Button key={v} variant={extra === v ? 'default' : 'outline'} size="sm" onClick={() => setExtra(v)} className="text-xs flex-1">
                {v === 0 ? 'None' : `+${fmt(v)}`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategy Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className={interestSaved > 0 ? 'border-green-500/30' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm">Avalanche Strategy</CardTitle>
              {interestSaved > 0 && <Badge variant="default" className="text-[10px] ml-auto">Best</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Debt-free by</span><span className="font-semibold">{avalanche.payoffDate}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Months to payoff</span><span className="font-semibold">{avalanche.monthsToPayoff}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total interest</span><span className="font-semibold">{fmt(avalanche.totalInterest)}</span></div>
            {monthsSaved > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Saves {monthsSaved} months</span>
                <span>Saves {fmt(interestSaved)} interest</span>
              </div>
            )}
            <div className="pt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Payoff order</p>
              {avalanche.loans.map((t, i) => (
                <div key={t.loan.id} className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                  <span className="flex-1 truncate">{t.loan.name}</span>
                  <span className="text-muted-foreground">{t.loan.interest_rate}%</span>
                  <span>{t.months} mo</span>
                  {t.months === 0 && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Snowflake className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm">Snowball Strategy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Debt-free by</span><span className="font-semibold">{snowball.payoffDate}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Months to payoff</span><span className="font-semibold">{snowball.monthsToPayoff}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total interest</span><span className="font-semibold">{fmt(snowball.totalInterest)}</span></div>
            {monthsSaved < 0 && (
              <div className="flex justify-between text-sm text-amber-600">
                <span>Saves {-monthsSaved} months</span>
                <span>Saves {fmt(-interestSaved)} interest</span>
              </div>
            )}
            <div className="pt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Payoff order</p>
              {snowball.loans.map((t, i) => (
                <div key={t.loan.id} className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                  <span className="flex-1 truncate">{t.loan.name}</span>
                  <span className="text-muted-foreground">{fmt(t.loan.remaining_balance)}</span>
                  <span>{t.months} mo</span>
                  {t.months === 0 && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {activeLoans.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Balance Over Time</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={v => `M${v}`} />
                  <YAxis tickFormatter={v => fmt(v).replace(/\$|€|£|KSh|₦|R|GH₵|₹/g, '')} />
                  <Tooltip formatter={(v: any) => fmt(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="avalanche" name="Avalanche" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="snowball" name="Snowball" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Loan Breakdown */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Individual Loans</h2>
        {activeLoans.map(loan => {
          const progress = ((loan.principal_amount - loan.remaining_balance) / loan.principal_amount) * 100
          return (
            <Card key={loan.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{loan.name}</p>
                    <p className="text-xs text-muted-foreground">{loan.lender || loan.type}</p>
                  </div>
                  <Badge variant="outline">{loan.interest_rate}% APR</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{fmt(loan.remaining_balance)} remaining</span>
                    <span className="text-muted-foreground">{fmt(loan.principal_amount)} original</span>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-2" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fmt(loan.monthly_payment)}/mo min payment</span>
                  <span>{progress.toFixed(0)}% paid off</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {activeLoans.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No active debt — you're debt free!</p>
          </div>
        )}
      </div>
    </div>
  )
}
