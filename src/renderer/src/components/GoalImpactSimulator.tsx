import { useState, useEffect } from 'react'
import { Target, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useCurrency } from '@/hooks/useCurrency'

interface Props {
  expenseAmount: number
}

export default function GoalImpactSimulator({ expenseAmount }: Props) {
  const { format } = useCurrency()
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (expenseAmount <= 0) { setGoals([]); return }
    setLoading(true)
    window.api?.goals?.getAll?.()
      .then((g: any[]) => setGoals(g.filter(x => x.current_amount < x.target_amount).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [expenseAmount])

  if (expenseAmount <= 0 || goals.length === 0) return null

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
          <Target className="h-4 w-4" />
          Goal Impact Simulator
        </div>
        <p className="text-xs text-muted-foreground">This purchase could delay your goals by:</p>
        <div className="space-y-1.5">
          {goals.map(g => {
            const remaining = g.target_amount - g.current_amount
            const monthly = g.monthly_contribution || 1
            const delayMonths = Math.ceil(expenseAmount / monthly)
            return (
              <div key={g.id} className="flex items-center justify-between text-xs rounded-md bg-white/60 px-2 py-1.5">
                <span className="font-medium">{g.name}</span>
                <span className="text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  +{delayMonths} month{delayMonths > 1 ? 's' : ''}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
