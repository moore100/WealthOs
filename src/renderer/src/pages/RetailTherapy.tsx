import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { ShieldAlert, Brain, ShoppingBag, Heart, Coffee, Bed, Sparkles, Activity } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface Trigger {
  id: string
  label: string
  icon: any
  color: string
  detected: boolean
  count: number
  avgAmount: number
}

export default function RetailTherapyPage() {
  const { format: fmt } = useCurrency()
  const [enabled, setEnabled] = useState(true)
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock pattern detection — in real app this analyzes expense timestamps + amounts
    setTriggers([
      { id: 'stress', label: 'Stress Shopping', icon: Brain, color: 'text-rose-500', detected: true, count: 4, avgAmount: 85 },
      { id: 'late', label: 'Late Night Buys', icon: Bed, color: 'text-violet-500', detected: true, count: 6, avgAmount: 45 },
      { id: 'boredom', label: 'Boredom Spending', icon: Coffee, color: 'text-amber-500', detected: true, count: 3, avgAmount: 32 },
      { id: 'social', label: 'Social Pressure', icon: ShoppingBag, color: 'text-blue-500', detected: false, count: 0, avgAmount: 0 },
      { id: 'sad', label: 'Sad Spending', icon: Heart, color: 'text-pink-500', detected: true, count: 2, avgAmount: 120 },
    ])
    setLoading(false)
  }, [])

  const totalDetected = triggers.filter(t => t.detected).length
  const totalWaste = triggers.filter(t => t.detected).reduce((s, t) => s + t.count * t.avgAmount, 0)

  const interventions = [
    { trigger: 'stress', action: 'Replace Amazon bookmark with 10-min breathing exercise', icon: Sparkles },
    { trigger: 'late', action: 'Block purchases after 10 PM with a 12-hour cooldown', icon: Bed },
    { trigger: 'boredom', action: 'Suggest a walk, call a friend, or open a book instead', icon: Coffee },
    { trigger: 'sad', action: 'Offer to log a mood journal entry before any purchase', icon: Heart },
  ]

  if (loading) return <div className="text-sm text-muted-foreground">Analyzing spending patterns...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Anti-Retail Therapy</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        We detect emotional spending patterns before they drain your wallet. Then we gently redirect you.
      </p>

      {/* Toggle */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Pattern Detection Active</p>
              <p className="text-xs text-muted-foreground">
                {totalDetected} emotional triggers detected · Est. {fmt(totalWaste)} could be saved
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </CardContent>
      </Card>

      {/* Trigger Cards */}
      <div className="space-y-3">
        {triggers.map(t => {
          const Icon = t.icon
          const intervention = interventions.find(i => i.trigger === t.id)
          const IntIcon = intervention?.icon || Sparkles
          return (
            <Card key={t.id} className={t.detected ? 'border-rose-500/20' : ''}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center bg-muted', t.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{t.label}</p>
                    {t.detected ? (
                      <Badge variant="secondary" className="text-[10px] text-rose-600">
                        {t.count} detections
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Not detected</Badge>
                    )}
                  </div>
                  {t.detected && (
                    <>
                      <p className="text-xs text-muted-foreground mb-1">
                        Avg {fmt(t.avgAmount)} per incident · Total impact: {fmt(t.count * t.avgAmount)}
                      </p>
                      <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5">
                        <IntIcon className="h-3 w-3 text-primary shrink-0" />
                        <p className="text-xs">
                          <strong>Intervention:</strong> {intervention?.action}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm font-medium">Pattern Insight</p>
          <p className="text-xs text-muted-foreground mt-1">
            You've made {triggers.filter(t => t.detected).reduce((s, t) => s + t.count, 0)} emotional purchases this month.
            If you paused for just 24 hours before each, you could save an estimated {fmt(totalWaste * 0.6)}.
          </p>
          <div className="mt-2">
            <Progress value={60} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1">60% of detected emotional purchases are returned or regretted</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
