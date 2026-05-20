import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Dot } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'
import { Timer, Target, Home, Plane, Car, GraduationCap, HeartPulse, PiggyBank, TrendingUp } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface Milestone {
  age: number
  label: string
  icon: any
  color: string
  targetNetWorth: number
}

const DEFAULT_MILESTONES: Milestone[] = [
  { age: 30, label: 'Buy a House', icon: Home, color: 'hsl(var(--primary))', targetNetWorth: 50000 },
  { age: 35, label: 'Debt Free', icon: HeartPulse, color: 'hsl(142 71% 45%)', targetNetWorth: 100000 },
  { age: 40, label: 'Travel Fund', icon: Plane, color: 'hsl(35 92% 33%)', targetNetWorth: 250000 },
  { age: 45, label: 'New Car', icon: Car, color: 'hsl(270 60% 52%)', targetNetWorth: 400000 },
  { age: 55, label: 'Education', icon: GraduationCap, color: 'hsl(199 89% 48%)', targetNetWorth: 800000 },
  { age: 65, label: 'Retirement', icon: PiggyBank, color: 'hsl(0 72% 51%)', targetNetWorth: 2000000 },
]

function calculateAge(birthYear: number) {
  return new Date().getFullYear() - birthYear
}

export default function TimelinePage() {
  const { format: fmt } = useCurrency()
  const [birthYear, setBirthYear] = useState(1995)
  const [currentNetWorth, setCurrentNetWorth] = useState(15000)
  const [monthlySavings, setMonthlySavings] = useState(800)
  const [monthlyIncome, setMonthlyIncome] = useState(5000)
  const [annualReturn, setAnnualReturn] = useState(7)
  const [milestones, setMilestones] = useState<Milestone[]>(DEFAULT_MILESTONES)

  const currentAge = calculateAge(birthYear)
  const retirementAge = 65

  const data = useMemo(() => {
    const points = []
    let accumulated = currentNetWorth
    const monthlyRate = annualReturn / 100 / 12

    for (let age = currentAge; age <= retirementAge; age++) {
      const yearsFromNow = age - currentAge
      // Compound interest with monthly contributions
      if (monthlyRate > 0) {
        accumulated = currentNetWorth * Math.pow(1 + monthlyRate, yearsFromNow * 12) +
          monthlySavings * ((Math.pow(1 + monthlyRate, yearsFromNow * 12) - 1) / monthlyRate)
      } else {
        accumulated = currentNetWorth + monthlySavings * yearsFromNow * 12
      }

      const milestone = milestones.find(m => m.age === age)
      points.push({
        age,
        netWorth: Math.round(accumulated),
        milestone: milestone || null,
      })
    }
    return points
  }, [currentAge, currentNetWorth, monthlySavings, annualReturn, milestones])

  const alternateReality = useMemo(() => {
    // What if they started 2 years ago with same savings rate
    const startAge = currentAge - 2
    let alt = currentNetWorth
    const monthlyRate = annualReturn / 100 / 12
    const yearsSaved = 2
    if (monthlyRate > 0) {
      alt = currentNetWorth * Math.pow(1 + monthlyRate, -yearsSaved * 12) // Reverse compound
    } else {
      alt = currentNetWorth - monthlySavings * yearsSaved * 12
    }
    return Math.max(0, Math.round(alt))
  }, [currentNetWorth, monthlySavings, annualReturn])

  const yearsToRetirement = retirementAge - currentAge
  const projectedAtRetirement = data[data.length - 1]?.netWorth || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Timer className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Life Timeline</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        See your financial future. Drag the sliders to model different scenarios.
      </p>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Birth Year</CardTitle></CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{birthYear} <span className="text-xs text-muted-foreground">(Age {currentAge})</span></div>
            <Slider value={[birthYear]} onValueChange={v => setBirthYear(v[0])} min={1960} max={2010} step={1} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Current Net Worth</CardTitle></CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{fmt(currentNetWorth)}</div>
            <Slider value={[currentNetWorth]} onValueChange={v => setCurrentNetWorth(v[0])} min={0} max={200000} step={1000} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Monthly Savings</CardTitle></CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{fmt(monthlySavings)}</div>
            <Slider value={[monthlySavings]} onValueChange={v => setMonthlySavings(v[0])} min={0} max={5000} step={50} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Annual Return %</CardTitle></CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{annualReturn}%</div>
            <Slider value={[annualReturn]} onValueChange={v => setAnnualReturn(v[0])} min={0} max={15} step={0.5} />
          </CardContent>
        </Card>
      </div>

      {/* Alternate Reality */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-center gap-3 p-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Alternate Reality</p>
            <p className="text-xs text-muted-foreground">
              If you started saving {fmt(monthlySavings)}/month 2 years ago at {annualReturn}% return,
              you'd have <strong>{fmt(alternateReality)}</strong> today instead of {fmt(currentNetWorth)}.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Net Worth Projection</CardTitle>
          <CardDescription>
            At retirement ({retirementAge}): <strong>{fmt(projectedAtRetirement)}</strong>
            {' '}· Savings rate: {((monthlySavings / monthlyIncome) * 100).toFixed(0)}% of income
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ netWorth: { label: 'Net Worth', color: 'hsl(var(--primary))' } }} className="h-[350px] w-full">
            <AreaChart data={data} margin={{ left: 0, right: 0, top: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="age" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} label={{ value: 'Age', position: 'insideBottom', offset: -5, fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(l: any) => `Age ${l}`} />
              <Area type="monotone" dataKey="netWorth" stroke="var(--color-netWorth)" fill="var(--color-netWorth)" fillOpacity={0.15} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              {milestones.map(m => (
                <ReferenceLine key={m.age} x={m.age} stroke={m.color} strokeDasharray="4 4" strokeWidth={1.5} />
              ))}
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Milestones */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {milestones.map(m => {
          const dataPoint = data.find(d => d.age === m.age)
          const onTrack = dataPoint && dataPoint.netWorth >= m.targetNetWorth
          const Icon = m.icon
          return (
            <Card key={m.age} className={onTrack ? 'border-green-500/30' : ''}>
              <CardContent className="p-3 text-center">
                <Icon className="h-5 w-5 mx-auto mb-1" style={{ color: m.color }} />
                <p className="text-xs font-medium">{m.label}</p>
                <p className="text-[10px] text-muted-foreground">Age {m.age}</p>
                <Badge variant={onTrack ? 'default' : 'secondary'} className="text-[9px] mt-1">
                  {onTrack ? 'On Track' : 'Behind'}
                </Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
