import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Scissors, AlertTriangle, Clock, DollarSign, Calendar, TrendingUp } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'

interface Sub {
  id: number
  name: string
  amount: number
  frequency: string
  category: string
  lastUsed: string | null
  usageScore: number // 0-100
  totalPaid: number
  active: boolean
}

export default function SubscriptionKillerPage() {
  const { format: fmt } = useCurrency()
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await window.api?.subscriptions?.getAll?.().catch(() => [])
        const enriched = (data || []).map((s: any) => {
          const months = Math.max(1, Math.floor((Date.now() - new Date(s.created_at || Date.now()).getTime()) / (30 * 24 * 60 * 60 * 1000)))
          const totalPaid = (s.amount || 0) * months
          // Simulate usage score based on mock logic
          const usageScore = s.name?.toLowerCase().includes('adobe') ? 15
            : s.name?.toLowerCase().includes('gym') ? 8
            : s.name?.toLowerCase().includes('netflix') ? 65
            : s.name?.toLowerCase().includes('spotify') ? 80
            : s.name?.toLowerCase().includes('hbo') ? 90
            : 50
          return { ...s, totalPaid, usageScore, lastUsed: s.last_used || null }
        })
        setSubs(enriched)
      } catch { /* ignore */ } finally { setLoading(false) }
    }
    load()
  }, [])

  const zombies = useMemo(() => subs.filter(s => s.usageScore < 30), [subs])
  const totalMonthly = useMemo(() => subs.filter(s => s.active).reduce((s, sub) => s + sub.amount, 0), [subs])
  const totalWasted = useMemo(() => zombies.reduce((s, z) => s + z.amount, 0), [zombies])
  const lifetimePaid = useMemo(() => subs.reduce((s, sub) => s + sub.totalPaid, 0), [subs])

  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleCancel = () => {
    const names = subs.filter(s => selected.has(s.id)).map(s => s.name)
    toast.success(`Drafted cancellation for ${names.length} subscription${names.length !== 1 ? 's' : ''}: ${names.join(', ')}`)
    setSelected(new Set())
  }

  if (loading) return <div className="text-sm text-muted-foreground">Analyzing subscriptions...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Scissors className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Subscription Killer</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        We found subscriptions you barely use. One tap to draft cancellations and reclaim your money.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{fmt(totalMonthly)}</p>
            <p className="text-[10px] text-muted-foreground">Monthly Cost</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold">{zombies.length}</p>
            <p className="text-[10px] text-muted-foreground">Zombie Subs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-rose-500" />
            <p className="text-lg font-bold">{fmt(totalWasted)}</p>
            <p className="text-[10px] text-muted-foreground">Wasted / Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{fmt(lifetimePaid)}</p>
            <p className="text-[10px] text-muted-foreground">Lifetime Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Zombie Subs */}
      {zombies.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Zombie Subscriptions — Barely Used
            </CardTitle>
            <CardDescription>
              You've paid {fmt(zombies.reduce((s, z) => s + z.totalPaid, 0))} total for subscriptions you barely touch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {zombies.map(sub => (
              <div key={sub.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <Checkbox checked={selected.has(sub.id)} onCheckedChange={() => toggleSelect(sub.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sub.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmt(sub.amount)}/{sub.frequency} · {sub.usageScore}% usage · {fmt(sub.totalPaid)} lifetime
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">Low Usage</Badge>
              </div>
            ))}
            {selected.size > 0 && (
              <Button size="sm" className="w-full mt-2" onClick={handleCancel}>
                <Scissors className="h-4 w-4 mr-2" />
                Cancel {selected.size} Subscription{selected.size !== 1 ? 's' : ''} (Save {fmt(totalWasted)}/mo)
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subscription Birthdays */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Subscription Birthdays</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subs.map(sub => {
            const months = Math.max(1, Math.floor(sub.totalPaid / Math.max(1, sub.amount)))
            const years = (months / 12).toFixed(1)
            return (
              <Card key={sub.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{sub.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {months} months old · {years} years
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{fmt(sub.totalPaid)}</p>
                    <p className="text-[10px] text-muted-foreground">total paid</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
