import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ShoppingBag, AlertTriangle, CheckCircle, XCircle, Target, Clock } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface Goal {
  name: string
  targetDate: string
  targetAmount: number
  savedSoFar: number
  monthlyContribution: number
}

export default function PurchaseAdvisorPage() {
  const { format: fmt } = useCurrency()
  const [purchaseAmount, setPurchaseAmount] = useState(800)
  const [purchaseName, setPurchaseName] = useState('New Phone')

  // Mock goals — in real app these come from DB
  const goals: Goal[] = [
    { name: 'Emergency Fund', targetDate: '2026-12-31', targetAmount: 10000, savedSoFar: 3500, monthlyContribution: 500 },
    { name: 'Quit Job & Travel', targetDate: '2028-06-01', targetAmount: 30000, savedSoFar: 8000, monthlyContribution: 800 },
    { name: 'Car', targetDate: '2027-03-01', targetAmount: 15000, savedSoFar: 4200, monthlyContribution: 400 },
  ]

  const impact = useMemo(() => {
    const results = goals.map(g => {
      const monthsLeft = Math.max(1, Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)))
      const neededPerMonth = (g.targetAmount - g.savedSoFar) / monthsLeft
      const newSaved = Math.max(0, g.savedSoFar - purchaseAmount)
      const newNeededPerMonth = (g.targetAmount - newSaved) / monthsLeft
      const delayMonths = Math.ceil(purchaseAmount / g.monthlyContribution)

      return {
        ...g,
        neededPerMonth,
        newNeededPerMonth,
        delayMonths,
        canAfford: g.savedSoFar >= purchaseAmount,
      }
    })
    return results
  }, [purchaseAmount, goals])

  const overallVerdict = useMemo(() => {
    const affordable = impact.filter(i => i.canAfford).length
    const totalDelay = impact.reduce((s, i) => s + i.delayMonths, 0)
    return { affordable, totalDelay, anyBehind: impact.some(i => !i.canAfford && i.delayMonths > 3) }
  }, [impact])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Purchase Future-You</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Before you buy, see what Future You thinks. Based on your active savings goals.
      </p>

      {/* Purchase Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">What are you considering?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Item name" value={purchaseName} onChange={e => setPurchaseName(e.target.value)} />
            <Input type="number" placeholder="Amount" value={purchaseAmount} onChange={e => setPurchaseAmount(Number(e.target.value))} className="w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Verdict */}
      <Card className={overallVerdict.anyBehind ? 'border-amber-500/30' : 'border-green-500/30'}>
        <CardContent className="flex items-start gap-3 p-4">
          {overallVerdict.anyBehind ? (
            <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
          ) : (
            <CheckCircle className="h-6 w-6 text-green-500 shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium">
              {overallVerdict.anyBehind
                ? `Future You at 35 says: "This ${purchaseName} needs to be a $${Math.round(purchaseAmount * 0.5)} item to stay on track."`
                : `Future You says: "Go for it! This won't derail your goals."`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {overallVerdict.affordable} of {goals.length} goals can absorb this.
              {overallVerdict.totalDelay > 0 && ` Total delay across all goals: ${overallVerdict.totalDelay} months.`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Goal Impact Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Impact on Your Goals</h2>
        {impact.map(g => (
          <Card key={g.name}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{g.name}</p>
                  <p className="text-xs text-muted-foreground">Target: {fmt(g.targetAmount)} by {g.targetDate}</p>
                </div>
              </div>
              <div className="text-right">
                {g.canAfford ? (
                  <Badge variant="outline" className="text-green-600 border-green-600 text-[10px]">
                    <CheckCircle className="h-3 w-3 mr-1" /> Covered
                  </Badge>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      <Clock className="h-3 w-3 mr-1" /> +{g.delayMonths} months delay
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Need {fmt(g.newNeededPerMonth)}/mo vs {fmt(g.neededPerMonth)}/mo
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
