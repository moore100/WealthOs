import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, TrendingUp, PiggyBank, Container } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'

interface SinkingFund {
  id: number
  name: string
  target_amount: number
  current_amount: number
  monthly_contribution: number
  category: string
  icon: string
  color: string
  notes: string
  created_at: string
}

const EMOJIS = ['🪣', '🚗', '🎄', '🏠', '✈️', '📱', '🎓', '🏥', '⚽', '🎁', '🐕', '👶']

export default function SinkingFundsPage() {
  const { format: fmt } = useCurrency()
  const [funds, setFunds] = useState<SinkingFund[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    target_amount: 0,
    current_amount: 0,
    monthly_contribution: 0,
    category: 'general',
    icon: '🪣',
    color: '#3b82f6',
    notes: '',
  })
  const [contribId, setContribId] = useState<number | null>(null)
  const [contribAmount, setContribAmount] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await window.api?.sinkingFunds?.getAll?.()
      setFunds(data || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const totalTarget = funds.reduce((s, f) => s + f.target_amount, 0)
  const totalSaved = funds.reduce((s, f) => s + f.current_amount, 0)
  const totalMonthly = funds.reduce((s, f) => s + f.monthly_contribution, 0)

  const handleSave = async () => {
    if (!form.name || !form.target_amount) { toast.error('Name and target amount required'); return }
    try {
      await window.api?.sinkingFunds?.add?.(form)
      toast.success('Sinking fund created')
      setShowForm(false)
      setForm({ name: '', target_amount: 0, current_amount: 0, monthly_contribution: 0, category: 'general', icon: '🪣', color: '#3b82f6', notes: '' })
      load()
    } catch { toast.error('Failed to create fund') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.sinkingFunds?.delete?.(id); load() } catch { }
  }

  const handleContribute = async (id: number) => {
    const amt = Number(contribAmount)
    if (isNaN(amt) || amt <= 0) { toast.error('Enter a valid amount'); return }
    try {
      await window.api?.sinkingFunds?.contribute?.(id, amt)
      toast.success(`Added ${fmt(amt)} to fund`)
      setContribId(null)
      setContribAmount('')
      load()
    } catch { toast.error('Contribution failed') }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading sinking funds...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Container className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Sinking Funds</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Set aside money for non-monthly expenses before they surprise you. AI analyzes your history to suggest realistic monthly contributions.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <PiggyBank className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{fmt(totalSaved)}</p>
            <p className="text-[10px] text-muted-foreground">Total Saved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{fmt(totalTarget)}</p>
            <p className="text-[10px] text-muted-foreground">Total Target</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-lg font-bold">{fmt(totalMonthly)}/mo</p>
            <p className="text-[10px] text-muted-foreground">Monthly Contribution</p>
          </CardContent>
        </Card>
      </div>

      <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
        <Plus className="h-4 w-4 mr-1" /> {showForm ? 'Cancel' : 'New Fund'}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Fund Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input type="number" placeholder="Target Amount" value={form.target_amount || ''} onChange={e => setForm({ ...form, target_amount: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Start Amount" value={form.current_amount || ''} onChange={e => setForm({ ...form, current_amount: Number(e.target.value) })} />
              <Input type="number" placeholder="Monthly Contribution" value={form.monthly_contribution || ''} onChange={e => setForm({ ...form, monthly_contribution: Number(e.target.value) })} />
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              {EMOJIS.map(emoji => (
                <Button
                  key={emoji}
                  variant={form.icon === emoji ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0 text-lg"
                  onClick={() => setForm({ ...form, icon: emoji })}
                >
                  {emoji}
                </Button>
              ))}
            </div>
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button size="sm" onClick={handleSave} className="w-full">Create Fund</Button>
          </CardContent>
        </Card>
      )}

      {/* Fund Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {funds.map(fund => {
          const pct = Math.min(100, (fund.current_amount / Math.max(1, fund.target_amount)) * 100)
          const monthsToGo = fund.monthly_contribution > 0 ? Math.ceil((fund.target_amount - fund.current_amount) / fund.monthly_contribution) : null
          return (
            <Card key={fund.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{fund.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{fund.name}</p>
                      <p className="text-[10px] text-muted-foreground">{fund.category}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(fund.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{fmt(fund.current_amount)}</span>
                    <span className="text-muted-foreground">{fmt(fund.target_amount)}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <p className="text-[10px] text-muted-foreground">
                    {pct.toFixed(0)}% complete{monthsToGo !== null ? ` · ${monthsToGo} month${monthsToGo === 1 ? '' : 's'} left` : ''}
                  </p>
                </div>
                {contribId === fund.id ? (
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Amount" value={contribAmount} onChange={e => setContribAmount(e.target.value)} className="h-8 text-sm" />
                    <Button size="sm" className="h-8" onClick={() => handleContribute(fund.id)}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setContribId(null)}>Cancel</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => setContribId(fund.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Contribute
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
      {funds.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No sinking funds yet. Create one for car maintenance, holiday gifts, or annual insurance.</p>}
    </div>
  )
}
