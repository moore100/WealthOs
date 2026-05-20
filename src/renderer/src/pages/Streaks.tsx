import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Flame, Trophy, Zap, Utensils, ShoppingBag, Coffee, Car, Home, Dumbbell, Bike } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/hooks/useCurrency'

interface Streak {
  id: string
  label: string
  icon: any
  currentStreak: number
  bestStreak: number
  targetStreak: number
  savedThisMonth: number
  color: string
}

export default function StreaksPage() {
  const { format: fmt } = useCurrency()
  const [streaks, setStreaks] = useState<Streak[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In a real app, this would come from analytics on expense patterns
    // Mock data for demo
    setStreaks([
      { id: 'cook', label: 'Home Cooking', icon: Utensils, currentStreak: 12, bestStreak: 15, targetStreak: 21, savedThisMonth: 340, color: 'text-amber-500' },
      { id: 'noshop', label: 'No Impulse Shopping', icon: ShoppingBag, currentStreak: 5, bestStreak: 8, targetStreak: 14, savedThisMonth: 220, color: 'text-green-500' },
      { id: 'coffee', label: 'Skip Coffee Shop', icon: Coffee, currentStreak: 3, bestStreak: 9, targetStreak: 7, savedThisMonth: 85, color: 'text-rose-500' },
      { id: 'commute', label: 'Bike to Work', icon: Bike, currentStreak: 8, bestStreak: 12, targetStreak: 20, savedThisMonth: 120, color: 'text-sky-500' },
      { id: 'gym', label: 'Gym Visits', icon: Dumbbell, currentStreak: 6, bestStreak: 10, targetStreak: 15, savedThisMonth: 0, color: 'text-violet-500' },
      { id: 'nights', label: 'No Late Purchases', icon: Home, currentStreak: 9, bestStreak: 11, targetStreak: 14, savedThisMonth: 180, color: 'text-emerald-500' },
    ])
    setLoading(false)
  }, [])

  const totalSaved = useMemo(() => streaks.reduce((s, st) => s + st.savedThisMonth, 0), [streaks])
  const activeStreaks = useMemo(() => streaks.filter(s => s.currentStreak >= 3).length, [streaks])
  const bestRecord = useMemo(() => Math.max(...streaks.map(s => s.bestStreak), 0), [streaks])

  if (loading) return <div className="text-sm text-muted-foreground">Loading streaks...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Flame className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Financial Streaks</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Turn discipline into a game. Build streaks, beat your records, watch your savings grow.
      </p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold">{activeStreaks}</p>
            <p className="text-[10px] text-muted-foreground">Active Streaks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-lg font-bold">{bestRecord}</p>
            <p className="text-[10px] text-muted-foreground">Best Record (days)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-5 w-5 mx-auto mb-1 text-rose-500" />
            <p className="text-lg font-bold">{fmt(totalSaved)}</p>
            <p className="text-[10px] text-muted-foreground">Saved This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Streak Cards */}
      <div className="space-y-3">
        {streaks.map(streak => {
          const Icon = streak.icon
          const pct = Math.min(100, (streak.currentStreak / streak.targetStreak) * 100)
          const onFire = streak.currentStreak >= streak.bestStreak
          return (
            <Card key={streak.id} className={cn(onFire && 'border-amber-500/30')}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center bg-muted', streak.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{streak.label}</p>
                    <div className="flex items-center gap-2">
                      {streak.savedThisMonth > 0 && (
                        <Badge variant="secondary" className="text-[10px]">+{fmt(streak.savedThisMonth)} saved</Badge>
                      )}
                      <Badge variant={onFire ? 'default' : 'outline'} className="text-[10px]">
                        <Flame className={cn('h-3 w-3 mr-1', onFire && 'text-amber-300')} />
                        {streak.currentStreak} day{streak.currentStreak !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">Target: {streak.targetStreak} days</span>
                    <span className="text-[10px] text-muted-foreground">Best: {streak.bestStreak}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
