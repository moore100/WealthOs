import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { useCurrency } from '@/hooks/useCurrency'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine,
} from 'recharts'
import { Shield, AlertTriangle, CheckCircle2, PiggyBank, TrendingUp } from 'lucide-react'

export default function EmergencyFundPage() {
  const { format: fmt } = useCurrency()
  const [expenses, setExpenses] = useState<any[]>([])
  const [income, setIncome] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [netWorth, setNetWorth] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [targetMonths, setTargetMonths] = useState(6)
  const [manualFund, setManualFund] = useState<string>('')

  const load = async () => {
    setLoading(true)
    try {
      const [expData, incData, subData, loanData, nwData] = await Promise.all([
        window.api?.expenses?.getAll?.(),
        window.api?.income?.getAll?.(),
        window.api?.subscriptions?.getAll?.(),
        window.api?.loans?.getAll?.(),
        window.api?.networth?.getLatest?.(),
      ])
      setExpenses(expData || [])
      setIncome(incData || [])
      setSubscriptions(subData || [])
      setLoans(loanData || [])
      setNetWorth(nwData?.total || 0)
    } catch (e) { console.warn(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Calculate average monthly expenses over last 6 months
  const monthlyBurn = useMemo(() => {
    const now = new Date()
    const months: number[] = []
    for (let i = 0; i < 6; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = m.toISOString().slice(0, 7)
      const monthlyExp = expenses
        .filter((e: any) => e.date?.startsWith?.(monthStr))
        .reduce((s: number, e: any) => s + (e.amount || 0), 0)
      months.push(monthlyExp)
    }
    const avgExp = months.length > 0 ? months.reduce((s, v) => s + v, 0) / months.length : 0

    const avgSub = subscriptions
      .filter((s: any) => s.active !== false)
      .reduce((sum: number, s: any) => {
        const amount = s.amount || 0
        const freq = s.frequency || 'monthly'
        if (freq === 'weekly') return sum + amount * 4.33
        if (freq === 'biweekly') return sum + amount * 2.17
        if (freq === 'monthly') return sum + amount
        if (freq === 'quarterly') return sum + amount / 3
        if (freq === 'yearly') return sum + amount / 12
        return sum + amount
      }, 0)

    const avgLoan = loans
      .filter((l: any) => l.remaining_balance > 0)
      .reduce((s: number, l: any) => s + (l.monthly_payment || 0), 0)

    return avgExp + avgSub + avgLoan
  }, [expenses, subscriptions, loans])

  const currentFund = manualFund ? parseFloat(manualFund) : netWorth
  const monthsCovered = monthlyBurn > 0 ? currentFund / monthlyBurn : 0
  const targetAmount = monthlyBurn * targetMonths
  const progress = Math.min((currentFund / targetAmount) * 100, 100)

  const status = monthsCovered >= targetMonths ? 'secure'
    : monthsCovered >= targetMonths * 0.5 ? 'caution'
    : 'danger'

  const chartData = [
    { name: 'Current', amount: currentFund },
    { name: '3 months', amount: monthlyBurn * 3 },
    { name: '6 months', amount: monthlyBurn * 6 },
    { name: '12 months', amount: monthlyBurn * 12 },
  ]

  if (loading) return <div className="text-sm text-muted-foreground">Loading emergency fund data...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Emergency Fund Tracker</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Know how many months you can survive without income. Your safety net at a glance.
      </p>

      {/* Status Banner */}
      <Card className={status === 'secure' ? 'border-green-500/30 bg-green-500/5' : status === 'caution' ? 'border-amber-500/30 bg-amber-500/5' : 'border-rose-500/30 bg-rose-500/5'}>
        <CardContent className="p-4 flex items-center gap-4">
          {status === 'secure' ? <CheckCircle2 className="h-8 w-8 text-green-500" /> : status === 'caution' ? <AlertTriangle className="h-8 w-8 text-amber-500" /> : <AlertTriangle className="h-8 w-8 text-rose-500" />}
          <div>
            <p className="font-semibold">
              {status === 'secure' ? 'You\'re covered!' : status === 'caution' ? 'Getting there...' : 'Fund too low'}
            </p>
            <p className="text-sm text-muted-foreground">
              {monthsCovered.toFixed(1)} months of expenses covered. Target: {targetMonths} months.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <PiggyBank className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-sm font-bold">{fmt(currentFund)}</p>
            <p className="text-[10px] text-muted-foreground">Available Fund</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-rose-500" />
            <p className="text-sm font-bold">{fmt(monthlyBurn)}/mo</p>
            <p className="text-[10px] text-muted-foreground">Monthly Burn</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Shield className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-sm font-bold">{monthsCovered.toFixed(1)} months</p>
            <p className="text-[10px] text-muted-foreground">Covered</p>
          </CardContent>
        </Card>
      </div>

      {/* Target Config */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Target Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target months of expenses</span>
              <Badge variant="outline">{targetMonths} months</Badge>
            </div>
            <Slider value={[targetMonths]} onValueChange={v => setTargetMonths(v[0])} min={1} max={24} step={1} />
            <div className="flex gap-2">
              {[3, 6, 9, 12].map(m => (
                <Button key={m} variant={targetMonths === m ? 'default' : 'outline'} size="sm" onClick={() => setTargetMonths(m)} className="text-xs flex-1">{m} mo</Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Target amount: </span>
              <span className="font-semibold">{fmt(targetAmount)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Remaining: </span>
              <span className="font-semibold">{fmt(Math.max(0, targetAmount - currentFund))}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress to target</span>
              <span className="font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Override fund amount:</span>
            <Input type="number" placeholder={fmt(netWorth)} value={manualFund} onChange={e => setManualFund(e.target.value)} className="text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Fund vs Milestones</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => fmt(v).replace(/\$|€|£|KSh|₦|R|GH₵|₹/g, '')} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <ReferenceLine y={currentFund} label="Current" stroke="#22c55e" strokeDasharray="3 3" />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={index === 0 ? '#22c55e' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Burn Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg. monthly expenses (6 mo)</span>
            <span>{fmt(monthlyBurn)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subscriptions</span>
            <span>{fmt(subscriptions.filter((s: any) => s.active !== false).reduce((s: number, sub: any) => s + (sub.amount || 0), 0))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Loan min. payments</span>
            <span>{fmt(loans.filter((l: any) => l.remaining_balance > 0).reduce((s: number, l: any) => s + (l.monthly_payment || 0), 0))}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total burn</span>
            <span>{fmt(monthlyBurn)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
