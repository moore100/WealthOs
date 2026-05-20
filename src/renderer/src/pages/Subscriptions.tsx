import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Repeat, Zap } from 'lucide-react'
import SubscriptionKiller from '@/components/SubscriptionKiller'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import type { Subscription } from '@/types'

const emptyForm = { name: '', amount: '', frequency: 'monthly', category: '', next_billing_date: '', notes: '' }

export default function SubscriptionsPage() {
  const { format, formatCompact } = useCurrency()
  const [subs, setSubs] = useState<Subscription[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [killerOpen, setKillerOpen] = useState(false)

  const load = async () => {
    try { const data = await window.api?.subscriptions?.getAll(); setSubs(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const monthlyTotal = subs.filter(s => s.active).reduce((sum, s) => {
    const m = s.frequency === 'yearly' ? s.amount / 12
      : s.frequency === 'weekly' ? s.amount * 4.33
      : s.amount
    return sum + m
  }, 0)

  const handleSubmit = async () => {
    if (!form.name || !form.amount) return toast.error('Name and amount required')
    const payload = { ...form, amount: parseFloat(form.amount) }
    try {
      if (editing) { await window.api?.subscriptions?.update(editing.id, payload); toast.success('Updated') }
      else { await window.api?.subscriptions?.add(payload); toast.success('Added') }
      setOpen(false); setEditing(null); setForm(emptyForm); load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.subscriptions?.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const openEdit = (s: Subscription) => {
    setEditing(s)
    setForm({ name: s.name, amount: String(s.amount), frequency: s.frequency, category: s.category || '', next_billing_date: s.next_billing_date || '', notes: s.notes || '' })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Subscriptions</h2>
          <p className="text-sm text-muted-foreground">Monthly cost: <span className="font-semibold text-destructive">{formatCompact(monthlyTotal)}</span> · {subs.filter(s => s.active).length} active</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setKillerOpen(true)}>
            <Zap className="mr-2 h-4 w-4" /> Subscription Killer
          </Button>
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Subscription
          </Button>
        </div>
      </div>

      <SubscriptionKiller open={killerOpen} onClose={() => setKillerOpen(false)} onChanged={() => load()} />

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : subs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Repeat className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No subscriptions tracked</p>
            <p className="text-sm text-muted-foreground">Netflix, Spotify, gym — track everything recurring</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map(s => {
                const monthly = s.frequency === 'yearly' ? s.amount / 12
                  : s.frequency === 'weekly' ? s.amount * 4.33
                  : s.amount
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{format(s.amount)}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{s.frequency}</Badge></TableCell>
                    <TableCell className="text-destructive font-medium">{format(monthly)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.next_billing_date || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={s.active ? 'default' : 'secondary'}>{s.active ? 'Active' : 'Paused'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>Delete "{s.name}"?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Subscription' : 'Add Subscription'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="e.g. Netflix" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Billing Cycle</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['weekly', 'monthly', 'quarterly', 'annual'].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Next Due Date</Label>
                <Input type="date" value={form.next_billing_date} onChange={e => setForm(f => ({ ...f, next_billing_date: e.target.value }))} />
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
