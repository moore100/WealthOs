import { useState, useEffect } from 'react'
import { Bell, Plus, Trash2, Play, Clock, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { format, isPast, parseISO } from 'date-fns'

interface Reminder {
  id: number
  title: string
  body: string
  scheduled_at: string
  repeat: string
  category: string
  triggered: number
  active: number
}

const CATEGORIES = [
  { value: 'custom', label: 'Custom', icon: '🔔' },
  { value: 'budget', label: 'Budget', icon: '💰' },
  { value: 'savings', label: 'Savings', icon: '🏦' },
  { value: 'investment', label: 'Investment', icon: '📈' },
  { value: 'payment', label: 'Payment', icon: '💳' },
  { value: 'ai', label: 'AI Suggestion', icon: '✨' },
]

const REPEATS = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const categoryInfo = (val: string) => CATEGORIES.find(c => c.value === val) ?? CATEGORIES[0]
const repeatLabel = (val: string) => REPEATS.find(r => r.value === val)?.label ?? val

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [repeat, setRepeat] = useState('none')
  const [category, setCategory] = useState('custom')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const data = await window.api?.reminders?.getAll().catch(() => []) ?? []
    setReminders(data)
  }

  useEffect(() => { load() }, [])

  const defaultDateTime = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 30)
    return d.toISOString().slice(0, 16)
  }

  const openForm = () => {
    setTitle(''); setBody(''); setScheduledAt(defaultDateTime())
    setRepeat('none'); setCategory('custom')
    setShowForm(true)
  }

  const handleAdd = async () => {
    if (!title.trim()) { toast.error('Title is required'); return }
    if (!scheduledAt) { toast.error('Date and time is required'); return }
    setSaving(true)
    try {
      await window.api.reminders.add({
        title: title.trim(),
        body: body.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        repeat,
        category,
      })
      toast.success('Reminder set!')
      setShowForm(false)
      load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save reminder')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    await window.api.reminders.delete(id)
    toast.success('Reminder removed')
    load()
  }

  const handleFireNow = async (id: number) => {
    await window.api.reminders.fireNow(id)
    toast.success('Test notification sent!')
  }

  const handleToggle = async (r: Reminder) => {
    await window.api.reminders.update(r.id, { active: r.active ? 0 : 1 })
    load()
  }

  const upcoming = reminders.filter(r => r.active && !r.triggered)
  const done = reminders.filter(r => r.triggered || !r.active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Reminders</h2>
          <p className="text-sm text-muted-foreground">
            Native desktop notifications — fire even when the app window is closed
          </p>
        </div>
        <Button onClick={openForm} className="gap-2">
          <Plus size={15} /> New Reminder
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm">New Reminder</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. Move savings to goal account" value={title}
                onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Message <span className="text-muted-foreground">(optional)</span></Label>
              <Input placeholder="Additional details..." value={body}
                onChange={e => setBody(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Repeat</Label>
              <select value={repeat} onChange={e => setRepeat(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                {REPEATS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Set Reminder'}</Button>
          </div>
        </div>
      )}

      {/* Upcoming */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Bell size={12} /> Upcoming ({upcoming.length})
        </h3>
        {upcoming.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No active reminders. Click "New Reminder" to create one.
          </div>
        )}
        {upcoming.map(r => {
          const cat = categoryInfo(r.category)
          const overdue = isPast(parseISO(r.scheduled_at))
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <span className="text-xl shrink-0">{cat.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                {r.body && <p className="text-xs text-muted-foreground truncate">{r.body}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={11} className={overdue ? 'text-destructive' : 'text-muted-foreground'} />
                  <span className={`text-xs ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {format(parseISO(r.scheduled_at), 'MMM d, yyyy · h:mm a')}
                    {overdue && ' — overdue'}
                  </span>
                  {r.repeat !== 'none' && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-1">
                      <RefreshCw size={9} /> {repeatLabel(r.repeat)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  title="Test notification now" onClick={() => handleFireNow(r.id)}>
                  <Play size={13} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(r.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Done/inactive */}
      {done.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CheckCircle2 size={12} /> Completed / Inactive ({done.length})
          </h3>
          {done.map(r => {
            const cat = categoryInfo(r.category)
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 opacity-60">
                <span className="text-xl shrink-0">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate line-through">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(r.scheduled_at), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDelete(r.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Auto-notifications info */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Bell size={12} /> Automatic Notifications
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>⚡ Budget overspend alerts — 9am daily</span>
          <span>💳 Loan payments due — 3 days before</span>
          <span>🔄 Subscription renewals — 1 & 3 days before</span>
          <span>🎉 Savings goal completions</span>
          <span>📊 Daily financial summary — 8am</span>
        </div>
      </div>
    </div>
  )
}
