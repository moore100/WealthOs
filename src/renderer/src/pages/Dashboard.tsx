import { useEffect, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  TrendingUp, TrendingDown, Wallet, Target, ArrowUpRight, ArrowDownRight,
  CalendarDays, ChevronDown, Zap, HeartPulse, PiggyBank, Receipt
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent
} from '@/components/ui/chart'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Cell, LabelList
} from 'recharts'
import { useCurrency } from '@/hooks/useCurrency'
import type { DashboardSummary } from '@/types'

/* ─── Date range presets ─────────────────────────────────────────────────── */
type RangeKey = '7d' | '30d' | '90d' | '6m' | '1y' | 'all'
const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '3 Months' },
  { key: '6m', label: '6 Months' },
  { key: '1y', label: '1 Year' },
  { key: 'all', label: 'All Time' },
]

/* ─── Chart configs ──────────────────────────────────────────────────────── */
const areaConfig = {
  income: { label: 'Income', color: 'hsl(var(--primary))' },
  expenses: { label: 'Expenses', color: 'hsl(var(--destructive))' },
}

const barConfig = {
  savings: { label: 'Savings', color: 'hsl(142 71% 45%)' },
}

const donutConfig = {
  housing:   { label: 'Housing', color: 'hsl(var(--primary))' },
  food:      { label: 'Food', color: 'hsl(35 92% 33%)' },
  transport: { label: 'Transport', color: 'hsl(270 60% 52%)' },
  entertainment: { label: 'Fun', color: 'hsl(199 89% 48%)' },
  other:     { label: 'Other', color: 'hsl(0 72% 51%)' },
}

const radialConfig = {
  savings: { label: 'Savings', color: 'hsl(142 71% 45%)' },
}

/* ─── Dynamic chart colors for real categories ───────────────────────────── */
const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(35 92% 33%)',
  'hsl(270 60% 52%)',
  'hsl(199 89% 48%)',
  'hsl(0 72% 51%)',
  'hsl(142 71% 45%)',
  'hsl(300 60% 52%)',
  'hsl(45 90% 50%)',
]

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { format: fmt, formatCompact } = useCurrency()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<RangeKey>('6m')
  const [areaData, setAreaData] = useState<any[]>([])
  const [donutData, setDonutData] = useState<any[]>([])
  const [barData, setBarData] = useState<any[]>([])
  const [recentExpenses, setRecentExpenses] = useState<any[]>([])
  const [cashFlowEvents, setCashFlowEvents] = useState<any[]>([])
  const [sinkingFunds, setSinkingFunds] = useState<any[]>([])
  const [healthScore, setHealthScore] = useState<any>(null)
  const month = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [sumData, trendsData, cfData, sfData, hsData, expData] = await Promise.all([
          window.api?.dashboard?.getSummary(month),
          window.api?.dashboard?.getTrends(range === '1y' ? '1y' : range === 'all' ? 'all' : '6m'),
          window.api?.cashflow?.getAll?.().catch(() => []),
          window.api?.sinkingFunds?.getAll?.().catch(() => []),
          window.api?.healthScore?.getHistory?.().catch(() => []),
          window.api?.expenses?.getAll?.({ month }).catch(() => []),
        ])
        setSummary(sumData)
        if (trendsData) {
          setAreaData(trendsData.areaData || [])
          setDonutData(trendsData.donutData || [])
          setBarData(trendsData.barData || [])
        }
        setCashFlowEvents((cfData || []).slice(0, 3))
        setSinkingFunds((sfData || []).slice(0, 3))
        setHealthScore((hsData || []).slice(-1)[0] || null)
        setRecentExpenses((expData || []).slice(0, 5))
      } catch (e) {
        console.warn('Dashboard load failed', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [month, range])

  const income = summary?.income ?? 0
  const expenses = summary?.expenses ?? 0
  const savings = income - expenses
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0

  const radialData = [{ name: 'savings', value: savingsRate, fill: 'var(--color-savings)' }]

  const statCards = [
    {
      title: 'Monthly Income',
      value: formatCompact(income),
      icon: Wallet,
      trend: income > 0 ? fmt(income) : '—',
      up: true,
      sub: 'vs last month',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Monthly Expenses',
      value: formatCompact(expenses),
      icon: TrendingDown,
      trend: expenses > 0 ? fmt(expenses) : '—',
      up: false,
      sub: 'vs last month',
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      title: 'Net Savings',
      value: formatCompact(savings),
      icon: TrendingUp,
      trend: `${savingsRate}% rate`,
      up: true,
      sub: 'this month',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Total Savings',
      value: fmt(summary?.goalsSaved ?? 0),
      icon: Target,
      trend: `${summary?.goalsCount ?? 0} goals`,
      up: true,
      sub: 'saved so far',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ]

  return (
    <div className="space-y-6">

      {/* ── Date Range Filter Bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <CalendarDays size={14} className="ml-2 text-muted-foreground" />
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                range === r.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <ChevronDown size={12} />
          <span>Auto-updates on selection</span>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                    {loading ? (
                      <Skeleton className="mt-1.5 h-7 w-24" />
                    ) : (
                      <p className="mt-1 text-2xl font-bold tracking-tight">{stat.value}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-1 text-xs">
                      {stat.up ? (
                        <ArrowUpRight className={`h-3 w-3 shrink-0 ${stat.color}`} />
                      ) : (
                        <ArrowDownRight className={`h-3 w-3 shrink-0 ${stat.color}`} />
                      )}
                      <span className={`${stat.color} font-medium`}>{stat.trend}</span>
                      <span className="text-muted-foreground truncate">{stat.sub}</span>
                    </div>
                  </div>
                  <div className={`ml-3 shrink-0 rounded-xl p-2.5 ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Charts Row 1: Area + Radial ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Income vs Expenses — Gradient Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Income vs Expenses</CardTitle>
            <CardDescription>Last 6 months trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={areaConfig} className="h-[260px] w-full">
              <AreaChart data={areaData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-income)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-income)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} dy={8} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="var(--color-income)"
                  strokeWidth={2.5}
                  fill="url(#gradIncome)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--color-income)', strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="var(--color-expenses)"
                  strokeWidth={2.5}
                  fill="url(#gradExpenses)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--color-expenses)', strokeWidth: 0 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Savings Rate — Radial Gauge */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Savings Rate</CardTitle>
            <CardDescription>Income kept this month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={radialConfig} className="h-[260px] w-full">
              <RadialBarChart
                data={radialData}
                startAngle={-90}
                endAngle={270}
                innerRadius="60%"
                outerRadius="90%"
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={8}
                  background={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  fill="var(--color-savings)"
                />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground">
                  <tspan className="text-3xl font-bold">{savingsRate}%</tspan>
                </text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground">
                  <tspan className="text-xs">of income saved</tspan>
                </text>
              </RadialBarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: Donut + Bar ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Spending by Category — Donut with Legend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Spending by Category</CardTitle>
            <CardDescription>This month breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={donutConfig} className="h-[260px] w-full">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {donutData.map((entry: any, idx: number) => (
                    <Cell key={entry.key} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="outside"
                    formatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                    style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                </Pie>
                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Savings — Rounded Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Savings</CardTitle>
            <CardDescription>Income minus expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-[260px] w-full">
              <BarChart data={barData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} dy={8} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="savings" fill="var(--color-savings)" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  <LabelList
                    dataKey="savings"
                    position="top"
                    formatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                    style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Smart Widgets Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Upcoming Cash Flow */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" /> Upcoming Events
            </CardTitle>
            <CardDescription>Next 3 cash flow events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : cashFlowEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            ) : (
              cashFlowEvents.map((ev: any) => (
                <div key={ev.id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div>
                    <p className="text-sm font-medium">{ev.name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(ev.start_date), 'MMM d')} · {ev.frequency}</p>
                  </div>
                  <span className={`text-sm font-semibold ${ev.type === 'income' ? 'text-primary' : 'text-destructive'}`}>
                    {ev.type === 'income' ? '+' : '-'}{fmt(ev.amount)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Health Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-rose-500" /> Financial Health
            </CardTitle>
            <CardDescription>Latest health score snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : !healthScore ? (
              <p className="text-sm text-muted-foreground">No health score yet</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-bold ${healthScore.score >= 70 ? 'text-emerald-500' : healthScore.score >= 50 ? 'text-amber-500' : 'text-destructive'}`}>
                    {healthScore.score}
                  </div>
                  <div className="text-xs text-muted-foreground">/ 100</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-muted-foreground">Savings rate: <b className="text-foreground">{healthScore.savings_rate}%</b></span>
                  <span className="text-muted-foreground">Debt/Income: <b className="text-foreground">{healthScore.debt_to_income}%</b></span>
                  <span className="text-muted-foreground">Budget: <b className="text-foreground">{healthScore.budget_adherence}%</b></span>
                  <span className="text-muted-foreground">Emergency: <b className="text-foreground">{healthScore.emergency_fund_months}mo</b></span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> Recent Expenses
            </CardTitle>
            <CardDescription>Latest 5 transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : recentExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent expenses</p>
            ) : (
              recentExpenses.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div>
                    <p className="text-sm font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.date}</p>
                  </div>
                  <span className="text-sm font-semibold text-destructive">{fmt(e.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Sinking Funds */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-emerald-500" /> Sinking Funds
            </CardTitle>
            <CardDescription>Active fund progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : sinkingFunds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sinking funds yet</p>
            ) : (
              sinkingFunds.map((f: any) => {
                const pct = Math.min(100, Math.round((f.current_amount / f.target_amount) * 100))
                return (
                  <div key={f.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{f.name}</span>
                      <span className="text-muted-foreground text-xs">{pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground">{fmt(f.current_amount)} / {fmt(f.target_amount)}</div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Summary Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Active Loans', value: summary?.activeLoans ?? 0, emoji: '💳' },
          { label: 'Subscriptions', value: summary?.subscriptionsCount ?? 0, emoji: '🔄' },
          { label: 'People Owed', value: summary?.peopleOwed ?? 0, emoji: '👥' },
          { label: 'Bad Habits Cost', value: fmt(summary?.habitsMonthly ?? 0), emoji: '🚬' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xl">{item.emoji}</p>
              <p className="mt-1 text-lg font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
