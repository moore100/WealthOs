import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Clock, ArrowLeftRight, TrendingUp, TrendingDown } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function aYearAgoStr() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

export default function TimeMachine() {
  const { format } = useCurrency()
  const [date1, setDate1] = useState<string>(aYearAgoStr())
  const [date2, setDate2] = useState<string>(todayStr())
  const [snap1, setSnap1] = useState<any>(null)
  const [snap2, setSnap2] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const [a, b] = await Promise.all([
      window.api?.timeMachine?.snapshot(date1),
      window.api?.timeMachine?.snapshot(date2),
    ])
    setSnap1(a)
    setSnap2(b)
    setLoading(false)
  }

  useEffect(() => { load() }, [date1, date2])

  const diff = (a: number, b: number) => b - a
  const pct = (a: number, b: number) => (a > 0 ? Math.round(((b - a) / a) * 100) : 0)

  const Delta = ({ a, b, invertColor = false }: { a: number; b: number; invertColor?: boolean }) => {
    const d = diff(a, b)
    const positive = d >= 0
    const colorGood = invertColor ? !positive : positive
    return (
      <div className={`flex items-center gap-1 text-xs font-medium ${colorGood ? 'text-emerald-500' : 'text-rose-500'}`}>
        {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {positive ? '+' : ''}{format(d)} ({pct(a, b) > 0 ? '+' : ''}{pct(a, b)}%)
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-cyan-500" /> Financial Time Machine
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Travel through time. Compare your finances at any two dates.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Past Snapshot</Label>
              <Input type="date" value={date1} onChange={e => setDate1(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Compare Against</Label>
              <Input type="date" value={date2} onChange={e => setDate2(e.target.value)} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-muted-foreground">Loading snapshots...</div>
      ) : snap1 && snap2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { snap: snap1, label: date1, side: 'left' },
            { snap: snap2, label: date2, side: 'right' },
          ].map(({ snap, label }, idx) => (
            <Card key={idx} className={idx === 1 ? 'border-cyan-500/40' : ''}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{idx === 0 ? 'Then' : 'Now'}</span>
                  <span className="text-xs text-muted-foreground font-normal">{label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Net Worth</p>
                  <p className={`text-2xl font-bold ${snap.netWorth >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {format(snap.netWorth)}
                  </p>
                  {idx === 1 && <Delta a={snap1.netWorth} b={snap.netWorth} />}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Income</p>
                    <p className="font-bold text-emerald-500">{format(snap.monthIncome)}</p>
                    {idx === 1 && <Delta a={snap1.monthIncome} b={snap.monthIncome} />}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Expenses</p>
                    <p className="font-bold text-rose-500">{format(snap.monthExpenses)}</p>
                    {idx === 1 && <Delta a={snap1.monthExpenses} b={snap.monthExpenses} invertColor />}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Savings</p>
                    <p className="font-bold">{format(snap.savings)}</p>
                    {idx === 1 && <Delta a={snap1.savings} b={snap.savings} />}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Save Rate</p>
                    <p className="font-bold">{snap.savingsRate}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-2">Top Categories</p>
                  <div className="space-y-1">
                    {(snap.topCategories || []).slice(0, 5).map((c: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{c.icon} {c.name || 'Uncategorized'}</span>
                        <span className="text-muted-foreground">{format(c.total)}</span>
                      </div>
                    ))}
                    {(!snap.topCategories || snap.topCategories.length === 0) && (
                      <p className="text-xs text-muted-foreground italic">No data for this period</p>
                    )}
                  </div>
                </div>
                {snap.regretCount > 0 && (
                  <div className="text-xs text-orange-400">
                    {snap.regretCount} regretted purchase{snap.regretCount === 1 ? '' : 's'} this month
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {snap1 && snap2 && (
        <Card className="border-cyan-500/30 bg-cyan-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" /> Verdict
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {snap2.netWorth > snap1.netWorth ? (
              <p>
                ✨ Your net worth grew by <span className="font-bold text-emerald-500">{format(snap2.netWorth - snap1.netWorth)}</span> over this period.
              </p>
            ) : snap2.netWorth < snap1.netWorth ? (
              <p>
                📉 Your net worth declined by <span className="font-bold text-rose-500">{format(snap1.netWorth - snap2.netWorth)}</span> over this period.
              </p>
            ) : (
              <p>Your net worth stayed the same.</p>
            )}
            {snap2.savingsRate > snap1.savingsRate && (
              <p>📈 Your savings rate improved from {snap1.savingsRate}% → {snap2.savingsRate}%.</p>
            )}
            {snap2.savingsRate < snap1.savingsRate && (
              <p>⚠️ Your savings rate dropped from {snap1.savingsRate}% → {snap2.savingsRate}%.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
