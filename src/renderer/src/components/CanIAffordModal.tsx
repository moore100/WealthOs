import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useCurrency } from '@/hooks/useCurrency'
import { Wallet, AlertTriangle, CheckCircle } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CanIAffordModal({ open, onClose }: Props) {
  const { format } = useCurrency()
  const [item, setItem] = useState('')
  const [cost, setCost] = useState('')
  const [summary, setSummary] = useState<any>(null)
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setItem(''); setCost(''); setSummary(null); setGoals([]); setLoading(false)
    }
  }, [open])

  const analyze = async () => {
    const amount = parseFloat(cost)
    if (!amount || amount <= 0) return
    setLoading(true)
    try {
      const month = new Date().toISOString().slice(0, 7)
      const [sumData, goalsData] = await Promise.all([
        window.api?.dashboard?.getSummary(month),
        window.api?.goals?.getAll?.().catch(() => []),
      ])
      setSummary(sumData)
      setGoals(goalsData || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  const income = summary?.income ?? 0
  const expenses = summary?.expenses ?? 0
  const savings = income - expenses
  const costNum = parseFloat(cost) || 0
  const remaining = savings - costNum
  const canAfford = remaining > 0
  const daysDelay = goals.filter((g: any) => g.monthly_contribution > 0).map((g: any) => ({
    name: g.name,
    delay: costNum > 0 ? Math.ceil(costNum / g.monthly_contribution) : 0,
  }))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Can I Afford This?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>What do you want to buy?</Label>
            <Input placeholder="e.g. New Laptop, Vacation, Shoes" value={item} onChange={e => setItem(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>How much does it cost?</Label>
            <Input type="number" placeholder="0.00" value={cost} onChange={e => { setCost(e.target.value); setSummary(null) }} />
          </div>
          <Button onClick={analyze} disabled={!cost || loading} className="w-full">
            {loading ? 'Analyzing...' : 'Analyze'}
          </Button>

          {summary && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {canAfford ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                <span className={`font-semibold ${canAfford ? 'text-emerald-500' : 'text-destructive'}`}>
                  {canAfford ? 'Yes, you can afford this' : 'Caution — tight budget'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Monthly income: <b>{format(income)}</b></p>
                <p>Monthly expenses: <b>{format(expenses)}</b></p>
                <p>Current savings: <b>{format(savings)}</b></p>
                <p>After purchase: <b className={remaining >= 0 ? 'text-emerald-500' : 'text-destructive'}>{format(remaining)}</b></p>
              </div>
              {daysDelay.length > 0 && costNum > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Goal impact:</p>
                  {daysDelay.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">{d.name}</Badge>
                      <span>+{d.delay} months</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
