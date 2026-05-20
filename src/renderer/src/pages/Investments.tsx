import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import type { Investment } from '@/types'

const emptyForm = { name: '', type: 'stock', amount_invested: '', current_value: '', ticker_symbol: '', purchase_date: '', platform: '', notes: '' }

export default function InvestmentsPage() {
  const { format, formatCompact } = useCurrency()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const data = await window.api?.investments?.getAll(); setInvestments(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const totalInvested = investments.reduce((s, i) => s + i.amount_invested, 0)
  const totalValue = investments.reduce((s, i) => s + (i.current_value || i.amount_invested), 0)
  const gain = totalValue - totalInvested
  const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0

  const handleSubmit = async () => {
    if (!form.name || !form.amount_invested) return toast.error('Name and amount required')
    const payload = { ...form, amount_invested: parseFloat(form.amount_invested), current_value: parseFloat(form.current_value) || parseFloat(form.amount_invested) }
    try {
      if (editing) { await window.api?.investments?.update(editing.id, payload); toast.success('Updated') }
      else { await window.api?.investments?.add(payload); toast.success('Added') }
      setOpen(false); setEditing(null); setForm(emptyForm); load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.investments?.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const openEdit = (inv: Investment) => {
    setEditing(inv)
    setForm({ name: inv.name, type: inv.type, amount_invested: String(inv.amount_invested), current_value: String(inv.current_value || ''), ticker_symbol: inv.ticker_symbol || '', purchase_date: inv.purchase_date || '', platform: inv.platform || '', notes: inv.notes || '' })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Investments</h2>
          <p className="text-sm text-muted-foreground">
            Value: <span className="font-semibold text-primary">{formatCompact(totalValue)}</span>
            {' · '}Gain: <span className={`font-semibold ${gain >= 0 ? 'text-green-500' : 'text-destructive'}`}>{gain >= 0 ? '+' : ''}{formatCompact(gain)} ({gainPct.toFixed(1)}%)</span>
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Investment
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Invested', value: formatCompact(totalInvested), color: 'text-foreground' },
          { label: 'Current Value', value: formatCompact(totalValue), color: 'text-primary' },
          { label: `${gain >= 0 ? 'Gain' : 'Loss'}`, value: `${gain >= 0 ? '+' : ''}${formatCompact(gain)}`, color: gain >= 0 ? 'text-green-500' : 'text-destructive' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : investments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No investments yet</p>
            <p className="text-sm text-muted-foreground">Track stocks, crypto, real estate and more</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {investments.map(inv => {
            const cv = inv.current_value || inv.amount_invested
            const pct = inv.amount_invested > 0 ? ((cv - inv.amount_invested) / inv.amount_invested) * 100 : 0
            const isUp = pct >= 0
            return (
              <Card key={inv.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm">{inv.name}</CardTitle>
                      {inv.ticker_symbol && <p className="text-xs text-muted-foreground mt-0.5">{inv.ticker_symbol}</p>}
                      <Badge variant="secondary" className="mt-1 capitalize text-xs">{inv.type}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(inv)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>Delete "{inv.name}"?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(inv.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Value</p>
                      <p className="text-lg font-bold">{format(cv)}</p>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${isUp ? 'text-green-500' : 'text-destructive'}`}>
                      {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {isUp ? '+' : ''}{pct.toFixed(1)}%
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Invested: {format(inv.amount_invested)}</p>
                  {inv.platform && <p className="text-xs text-muted-foreground">Platform: {inv.platform}</p>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Investment' : 'Add Investment'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="e.g. Apple Stock" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['stock', 'crypto', 'real-estate', 'bond', 'etf', 'mutual-fund', 'other'].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount Invested</Label>
                <Input type="number" placeholder="0.00" value={form.amount_invested} onChange={e => setForm(f => ({ ...f, amount_invested: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Current Value</Label>
                <Input type="number" placeholder="0.00" value={form.current_value} onChange={e => setForm(f => ({ ...f, current_value: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Symbol (optional)</Label>
                <Input placeholder="e.g. AAPL" value={form.ticker_symbol} onChange={e => setForm(f => ({ ...f, ticker_symbol: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Platform (optional)</Label>
                <Input placeholder="e.g. Robinhood" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
