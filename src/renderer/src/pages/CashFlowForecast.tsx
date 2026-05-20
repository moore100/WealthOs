import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'

interface CashFlowEvent {
  id: number
  name: string
  type: 'income' | 'expense'
  amount: number
  frequency: string
  start_date: string
  end_date: string | null
  notes: string
  active: number
}

export default function CashFlowForecastPage() {
  const { format: fmt } = useCurrency()
  const [events, setEvents] = useState<CashFlowEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [daysAhead, setDaysAhead] = useState(90)
  const [form, setForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    amount: 0,
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const data = await window.api?.cashflow?.getAll?.()
      setEvents(data || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const forecast = useMemo(() => {
    const result: { date: string; net: number; income: number; expense: number; events: CashFlowEvent[] }[] = []
    const today = new Date()
    const end = new Date()
    end.setDate(today.getDate() + daysAhead)

    for (let d = new Date(today); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayEvents = events.filter(e => {
        if (!e.active) return false
        const start = new Date(e.start_date)
        const evEnd = e.end_date ? new Date(e.end_date) : null
        if (d < start) return false
        if (evEnd && d > evEnd) return false
        // Check frequency
        if (e.frequency === 'daily') return true
        if (e.frequency === 'weekly') return d.getDay() === start.getDay()
        if (e.frequency === 'biweekly') {
          const diffDays = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          return diffDays >= 0 && diffDays % 14 === 0
        }
        if (e.frequency === 'monthly') return d.getDate() === start.getDate()
        if (e.frequency === 'quarterly') {
          return d.getDate() === start.getDate() && (d.getMonth() - start.getMonth()) % 3 === 0
        }
        if (e.frequency === 'yearly') {
          return d.getDate() === start.getDate() && d.getMonth() === start.getMonth()
        }
        return false
      })
      const income = dayEvents.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
      const expense = dayEvents.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
      if (dayEvents.length > 0) {
        result.push({ date: dateStr, net: income - expense, income, expense, events: dayEvents })
      }
    }
    return result
  }, [events, daysAhead])

  const runningBalance = useMemo(() => {
    let bal = 0
    return forecast.map(f => {
      bal += f.net
      return { ...f, balance: bal }
    })
  }, [forecast])

  const dangerDays = runningBalance.filter(f => f.balance < 0)
  const totalIncome = forecast.reduce((s, f) => s + f.income, 0)
  const totalExpense = forecast.reduce((s, f) => s + f.expense, 0)

  const handleSave = async () => {
    if (!form.name || !form.amount) { toast.error('Name and amount required'); return }
    try {
      await window.api?.cashflow?.add?.(form)
      toast.success('Cash flow event added')
      setShowForm(false)
      setForm({ name: '', type: 'expense', amount: 0, frequency: 'monthly', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '' })
      load()
    } catch { toast.error('Failed to add event') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.cashflow?.delete?.(id); load() } catch { }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading cash flow...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarIcon className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Cash Flow Forecast</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        See every future income and expense event for the next {daysAhead} days. AI warns you before cash low days hit.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-sm font-bold">{fmt(totalIncome)}</p>
            <p className="text-[10px] text-muted-foreground">Incoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown className="h-4 w-4 mx-auto mb-1 text-rose-500" />
            <p className="text-sm font-bold">{fmt(totalExpense)}</p>
            <p className="text-[10px] text-muted-foreground">Outgoing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-sm font-bold">{fmt(totalIncome - totalExpense)}</p>
            <p className="text-[10px] text-muted-foreground">Net</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <AlertTriangle className={cn('h-4 w-4 mx-auto mb-1', dangerDays.length > 0 ? 'text-amber-500' : 'text-green-500')} />
            <p className="text-sm font-bold">{dangerDays.length}</p>
            <p className="text-[10px] text-muted-foreground">Danger Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Select value={String(daysAhead)} onValueChange={v => setDaysAhead(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="60">60 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
            <SelectItem value="180">6 months</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> {showForm ? 'Cancel' : 'Add Event'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Event Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input type="number" placeholder="Amount" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <Input placeholder="End Date (optional)" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button size="sm" onClick={handleSave} className="w-full">Save Event</Button>
          </CardContent>
        </Card>
      )}

      {/* Event List */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Active Events</h2>
        {events.map(e => (
          <Card key={e.id}>
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <Badge variant={e.type === 'income' ? 'default' : 'secondary'} className="text-[10px]">{e.type}</Badge>
                <span className="text-sm font-medium">{e.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">{fmt(e.amount)}</span>
                <Badge variant="outline" className="text-[10px]">{e.frequency}</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No events yet. Add income (salary, freelance) and expenses (rent, subscriptions, loans).</p>}
      </div>

      {/* Forecast Timeline */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Upcoming Events</h2>
        {runningBalance.slice(0, 30).map(f => (
          <Card key={f.date} className={f.balance < 0 ? 'border-amber-500/30' : f.net >= 0 ? 'border-green-500/20' : ''}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{f.date}</span>
                <span className={cn('text-sm font-bold', f.balance < 0 ? 'text-amber-600' : 'text-green-600')}>
                  Bal: {fmt(f.balance)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {f.events.map(e => (
                  <Badge key={e.id} variant={e.type === 'income' ? 'default' : 'secondary'} className="text-[10px]">
                    {e.name} {fmt(e.amount)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {runningBalance.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No upcoming events in this period.</p>}
      </div>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
