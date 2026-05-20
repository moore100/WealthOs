import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CalendarDays, CreditCard, Wallet, AlertCircle, User } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday, parseISO, isSameDay } from 'date-fns'

interface CalendarEvent {
  id: string
  title: string
  amount: number
  date: Date
  type: 'subscription' | 'loan' | 'reminder' | 'payment'
}

export default function BillCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [subs, loans, reminders, people] = await Promise.all([
          window.api?.subscriptions?.getAll?.().catch(() => []) || [],
          window.api?.loans?.getAll?.().catch(() => []) || [],
          window.api?.reminders?.getAll?.().catch(() => []) || [],
          window.api?.people?.getPayments?.().catch(() => []) || [],
        ])

        const allEvents: CalendarEvent[] = []

        subs?.forEach((s: any) => {
          if (s.next_billing_date) {
            allEvents.push({
              id: `sub-${s.id}`,
              title: s.name,
              amount: s.amount,
              date: parseISO(s.next_billing_date),
              type: 'subscription',
            })
          }
        })

        loans?.forEach((l: any) => {
          if (l.monthly_payment && l.end_date) {
            const end = parseISO(l.end_date)
            let d = new Date()
            while (d <= end) {
              allEvents.push({
                id: `loan-${l.id}-${format(d, 'yyyy-MM')}`,
                title: `${l.name} Payment`,
                amount: l.monthly_payment,
                date: new Date(d.getFullYear(), d.getMonth(), 1),
                type: 'loan',
              })
              d.setMonth(d.getMonth() + 1)
            }
          }
        })

        reminders?.forEach((r: any) => {
          if (r.scheduled_at) {
            allEvents.push({
              id: `rem-${r.id}`,
              title: r.title,
              amount: 0,
              date: parseISO(r.scheduled_at),
              type: 'reminder',
            })
          }
        })

        people?.forEach((p: any) => {
          if (p.next_payment_date) {
            allEvents.push({
              id: `pay-${p.id}`,
              title: `Pay ${p.person_name}`,
              amount: p.amount,
              date: parseISO(p.next_payment_date),
              type: 'payment',
            })
          }
        })

        setEvents(allEvents)
      } catch (e) {
        console.warn('BillCalendar load failed', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentMonth])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startWeekday = getDay(monthStart)

  const monthEvents = useMemo(() =>
    events.filter(e => isSameMonth(e.date, currentMonth)),
  [events, currentMonth])

  const totalDue = useMemo(() =>
    monthEvents.filter(e => e.type !== 'reminder').reduce((s, e) => s + e.amount, 0),
  [monthEvents])

  const upcoming = useMemo(() =>
    monthEvents
      .filter(e => e.date >= new Date())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10),
  [monthEvents])

  const getEventsForDay = (day: Date) =>
    monthEvents.filter(e => isSameDay(e.date, day))

  const typeIcon = (type: string) => {
    switch (type) {
      case 'subscription': return <CreditCard className="h-3 w-3" />
      case 'loan': return <Wallet className="h-3 w-3" />
      case 'reminder': return <AlertCircle className="h-3 w-3" />
      case 'payment': return <User className="h-3 w-3" />
      default: return null
    }
  }

  const typeColor = (type: string) => {
    switch (type) {
      case 'subscription': return 'bg-blue-500/10 text-blue-600'
      case 'loan': return 'bg-amber-500/10 text-amber-600'
      case 'reminder': return 'bg-purple-500/10 text-purple-600'
      case 'payment': return 'bg-emerald-500/10 text-emerald-600'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Bill Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
              ))}
              {Array.from({ length: startWeekday }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map(day => {
                const dayEvents = getEventsForDay(day)
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[70px] rounded-md border p-1 text-xs transition-colors ${
                      isToday(day) ? 'bg-primary/5 border-primary/30' : 'bg-card hover:bg-accent'
                    }`}
                  >
                    <span className={`font-medium ${isToday(day) ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {dayEvents.slice(0, 2).map(e => (
                        <div key={e.id} className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] ${typeColor(e.type)}`}>
                          {typeIcon(e.type)}
                          <span className="truncate">{e.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 2}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">This Month</CardTitle>
              <CardDescription>Total due: <strong>${totalDue.toFixed(2)}</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 ? (
                <p className="text-xs text-muted-foreground">No upcoming bills</p>
              ) : (
                upcoming.map(e => (
                  <div key={e.id} className="flex items-center justify-between rounded-md border p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {typeIcon(e.type)}
                      <span className="text-xs truncate">{e.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {e.amount > 0 && <Badge variant="secondary" className="text-[10px]">${e.amount.toFixed(2)}</Badge>}
                      <span className="text-[10px] text-muted-foreground">{format(e.date, 'MMM d')}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
