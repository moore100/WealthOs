import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'
import { Calculator } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

export default function WhatIfPage() {
  const { format: fmt } = useCurrency()
  const [monthlyIncome, setMonthlyIncome] = useState(5000)
  const [monthlyExpenses, setMonthlyExpenses] = useState(3500)
  const [savingsRate, setSavingsRate] = useState(20)
  const [goalAmount, setGoalAmount] = useState(20000)

  const effectiveSavings = useMemo(() => {
    const rate = savingsRate / 100
    return Math.round(monthlyIncome * rate)
  }, [monthlyIncome, savingsRate])

  const monthsToGoal = useMemo(() => {
    if (effectiveSavings <= 0) return null
    return Math.ceil(goalAmount / effectiveSavings)
  }, [goalAmount, effectiveSavings])

  const yearsToGoal = useMemo(() => {
    if (!monthsToGoal) return null
    return (monthsToGoal / 12).toFixed(1)
  }, [monthsToGoal])

  const chartData = useMemo(() => {
    const data = []
    let accumulated = 0
    const months = monthsToGoal ? Math.min(monthsToGoal + 6, 60) : 60
    for (let i = 0; i <= months; i++) {
      accumulated += effectiveSavings
      data.push({
        month: `M${i}`,
        saved: accumulated,
        target: goalAmount,
      })
    }
    return data
  }, [effectiveSavings, goalAmount, monthsToGoal])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">What-If Simulator</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Model different savings scenarios and see how long it will take to reach your goal.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Monthly Income</CardTitle>
            <CardDescription>{fmt(monthlyIncome)} / month</CardDescription>
          </CardHeader>
          <CardContent>
            <Slider
              value={[monthlyIncome]}
              onValueChange={v => setMonthlyIncome(v[0])}
              min={1000}
              max={20000}
              step={100}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Monthly Expenses</CardTitle>
            <CardDescription>{fmt(monthlyExpenses)} / month</CardDescription>
          </CardHeader>
          <CardContent>
            <Slider
              value={[monthlyExpenses]}
              onValueChange={v => setMonthlyExpenses(v[0])}
              min={500}
              max={15000}
              step={100}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Savings Rate</CardTitle>
            <CardDescription>{savingsRate}% of income</CardDescription>
          </CardHeader>
          <CardContent>
            <Slider
              value={[savingsRate]}
              onValueChange={v => setSavingsRate(v[0])}
              min={5}
              max={80}
              step={1}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Goal Amount</CardTitle>
            <CardDescription>{fmt(goalAmount)}</CardDescription>
          </CardHeader>
          <CardContent>
            <Slider
              value={[goalAmount]}
              onValueChange={v => setGoalAmount(v[0])}
              min={1000}
              max={100000}
              step={1000}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Projection</CardTitle>
          <CardDescription>
            Saving {fmt(effectiveSavings)} / month
            {monthsToGoal ? (
              <> &middot; Reach goal in <strong>{monthsToGoal} months</strong> ({yearsToGoal} years)</>
            ) : (
              <> &middot; Increase savings rate to see timeline</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ saved: { label: 'Accumulated', color: 'hsl(var(--primary))' }, target: { label: 'Goal', color: 'hsl(var(--destructive))' } }} className="h-[300px] w-full">
            <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={Math.floor(chartData.length / 8)} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Area type="monotone" dataKey="saved" stroke="var(--color-saved)" fill="var(--color-saved)" fillOpacity={0.2} strokeWidth={2} dot={false} />
              <ReferenceLine y={goalAmount} stroke="var(--color-target)" strokeDasharray="6 4" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
