import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Banknote, CheckCircle, Target, PiggyBank, Shield, Sparkles } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'

interface GoalBucket {
  name: string
  icon: any
  color: string
  allocation: number // percentage
  description: string
}

export default function WindfallPage() {
  const { format: fmt } = useCurrency()
  const [amount, setAmount] = useState(1200)
  const [source, setSource] = useState('Tax Refund')
  const [buckets, setBuckets] = useState<GoalBucket[]>([
    { name: 'Emergency Fund', icon: Shield, color: 'bg-amber-500', allocation: 35, description: 'Safety net' },
    { name: 'Car Goal', icon: Target, color: 'bg-blue-500', allocation: 25, description: 'Down payment' },
    { name: 'Travel Fund', icon: Sparkles, color: 'bg-purple-500', allocation: 20, description: 'Next adventure' },
    { name: 'Fun Money', icon: Banknote, color: 'bg-green-500', allocation: 15, description: 'Guilt-free spending' },
    { name: 'Extra Debt Payoff', icon: PiggyBank, color: 'bg-rose-500', allocation: 5, description: 'Accelerate freedom' },
  ])

  const totalAllocation = useMemo(() => buckets.reduce((s, b) => s + b.allocation, 0), [buckets])
  const isBalanced = totalAllocation === 100

  const handleExecute = () => {
    if (!isBalanced) {
      toast.error('Allocations must total 100%')
      return
    }
    const summary = buckets.map(b => `${b.name}: ${fmt((amount * b.allocation) / 100)}`).join(', ')
    toast.success(`Windfall deployed: ${summary}`)
  }

  const updateAllocation = (index: number, value: number) => {
    const next = [...buckets]
    next[index].allocation = Math.max(0, Math.min(100, value))
    setBuckets(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Banknote className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Windfall Auto-Pilot</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Money just landed. No decision fatigue — here's the optimal split based on your goals.
      </p>

      {/* Input */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">What arrived?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Source (Tax refund, bonus, etc.)" value={source} onChange={e => setSource(e.target.value)} />
            <Input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Optimal Split */}
      <Card className={isBalanced ? 'border-green-500/30' : 'border-amber-500/30'}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Optimal Split
          </CardTitle>
          <CardDescription>
            {isBalanced
              ? `Every dollar allocated. Total: ${fmt(amount)}.`
              : `Adjust sliders to total 100% (currently ${totalAllocation}%)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {buckets.map((bucket, i) => {
            const Icon = bucket.icon
            const allocated = (amount * bucket.allocation) / 100
            return (
              <div key={bucket.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', bucket.color.replace('bg-', 'text-'))} />
                    <span className="text-sm font-medium">{bucket.name}</span>
                    <span className="text-[10px] text-muted-foreground">{bucket.description}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold">{fmt(allocated)}</span>
                    <span className="text-xs text-muted-foreground ml-1">({bucket.allocation}%)</span>
                  </div>
                </div>
                <Slider
                  value={[bucket.allocation]}
                  onValueChange={v => updateAllocation(i, v[0])}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            )
          })}
          <Button className="w-full" onClick={handleExecute} disabled={!isBalanced}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Execute Split — Deploy {fmt(amount)}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
