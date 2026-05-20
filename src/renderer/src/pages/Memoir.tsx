import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BookOpen, TrendingDown, TrendingUp, Award, ShieldCheck, Flame, Star, DollarSign } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface MemoirStat {
  label: string
  value: string
  icon: any
  color: string
}

export default function MemoirPage() {
  const { format: fmt } = useCurrency()
  const [year] = useState(new Date().getFullYear())
  const [stats, setStats] = useState<MemoirStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In real app, these would be calculated from actual transaction data
    // Mock data for the memoir experience
    setStats([
      { label: 'Impulse Purchases Resisted', value: '14', icon: ShieldCheck, color: 'text-green-500' },
      { label: 'Total Saved', value: '$3,600', icon: TrendingUp, color: 'text-emerald-500' },
      { label: 'Debt Paid Off', value: '$4,200', icon: TrendingDown, color: 'text-blue-500' },
      { label: 'Cooking Streak Record', value: '23 nights', icon: Flame, color: 'text-amber-500' },
      { label: 'Subscriptions Cancelled', value: '3', icon: Star, color: 'text-rose-500' },
      { label: 'Highest Savings Month', value: 'March', icon: DollarSign, color: 'text-violet-500' },
    ])
    setLoading(false)
  }, [])

  const narrativeParagraphs = [
    `In ${year}, you took control of your financial story. You started the year with $4,200 in debt — and by December, it was gone.`,
    `Your biggest win was March. You cooked dinner 23 nights in a row, skipped the $12 lunch habit, and put $800 into your emergency fund in a single month.`,
    `You resisted 14 impulse purchases. That's 14 moments where you paused, thought about Future You, and walked away. Those moments saved you an estimated $1,400.`,
    `You cancelled 3 subscriptions you weren't using. Over the next year, that decision alone will save you $540.`,
    `Your emergency fund grew from $1,200 to $4,800. You're now 3 months ahead of where you started — and sleeping better because of it.`,
  ]

  const highlights = [
    { label: 'Net Worth Growth', value: '+$7,800', pct: 65 },
    { label: 'Debt Reduction', value: '-$4,200', pct: 100 },
    { label: 'Savings Rate', value: '18%', pct: 72 },
    { label: 'Emergency Fund', value: '4.8 months', pct: 60 },
  ]

  if (loading) return <div className="text-sm text-muted-foreground">Crafting your financial memoir...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Your {year} Financial Memoir</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        A year in review — narrated by your financial journey. This is your story of discipline, wins, and growth.
      </p>

      {/* Narrative */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="space-y-4 p-6">
          {narrativeParagraphs.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed">
              {para}
            </p>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t border-primary/10">
            <Award className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-primary">
              WealthOS AI · {year} Year in Review
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <Icon className={cn('h-5 w-5 mx-auto mb-2', stat.color)} />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Highlights */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Progress Highlights</h2>
        {highlights.map(h => (
          <Card key={h.label}>
            <CardContent className="flex items-center gap-4 p-3">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{h.label}</span>
                  <span className="text-sm font-bold">{h.value}</span>
                </div>
                <Progress value={h.pct} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
