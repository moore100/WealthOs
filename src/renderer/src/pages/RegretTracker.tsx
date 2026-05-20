import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Frown, TrendingDown, AlertTriangle, Heart } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function RegretTracker() {
  const { format } = useCurrency()
  const [stats, setStats] = useState<any>(null)
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [s, l] = await Promise.all([
      window.api?.regret?.stats(),
      window.api?.regret?.list(),
    ])
    setStats(s)
    setList(l || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleUnregret = async (id: number) => {
    await window.api?.regret?.toggle(id, 0)
    toast.success('Removed from regrets')
    load()
  }

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading regrets...</div>
  }

  const topInsight = stats?.byCategory?.[0]
  const topDay = stats?.byDayOfWeek?.[0]

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Frown className="h-6 w-6 text-orange-500" /> Regret Tracker
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tag purchases you regret. Patterns emerge. Decisions improve.
        </p>
      </div>

      {/* Headline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Regretted</p>
            <p className="text-2xl font-bold text-orange-500">{format(stats?.totalRegretAmount || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats?.totalRegretCount || 0} purchases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Regret Rate</p>
            <p className="text-2xl font-bold">{stats?.regretRate || 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">of all purchases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">$ Wasted Rate</p>
            <p className="text-2xl font-bold">{stats?.regretAmountRate || 0}%</p>
            <p className="text-xs text-muted-foreground mt-1">of all spending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Regret</p>
            <p className="text-2xl font-bold">
              {format(stats?.totalRegretCount > 0 ? stats.totalRegretAmount / stats.totalRegretCount : 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">per purchase</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {(topInsight || topDay) && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" /> Pattern Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {topInsight && (
              <p>
                You regret <span className="font-bold">{topInsight.regret_count}</span> out of{' '}
                <span className="font-bold">{topInsight.total_count}</span> purchases in{' '}
                <span className="font-bold">{topInsight.icon} {topInsight.name}</span> — that's{' '}
                <span className="font-bold text-orange-500">
                  {Math.round((topInsight.regret_count / topInsight.total_count) * 100)}%
                </span>.
              </p>
            )}
            {topDay && (
              <p>
                Most regretted purchases happen on{' '}
                <span className="font-bold">{DAY_NAMES[parseInt(topDay.dow)]}s</span> ({topDay.count} times).
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* By Category */}
      {stats?.byCategory?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Regrets by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.byCategory.map((cat: any) => {
              const rate = cat.total_count > 0 ? (cat.regret_count / cat.total_count) * 100 : 0
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{cat.icon} {cat.name}</span>
                    <span className="text-orange-500 font-medium">{format(cat.regret_total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${rate}%`, backgroundColor: cat.color || '#f97316' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {cat.regret_count} of {cat.total_count} ({Math.round(rate)}%) regretted
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" /> Regretted Purchases
          </CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No regrets yet. Tag purchases as "regret" from the Expenses page to see patterns here.
            </p>
          ) : (
            <div className="space-y-2">
              {list.map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{exp.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {exp.category_icon} {exp.category_name || 'Uncategorized'} · {exp.date}
                    </p>
                    {exp.regret_note && (
                      <p className="text-xs italic text-orange-400 mt-1">"{exp.regret_note}"</p>
                    )}
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-orange-500">{format(exp.amount)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs mt-1"
                      onClick={() => handleUnregret(exp.id)}
                    >
                      Un-regret
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
