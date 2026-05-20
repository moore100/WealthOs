import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, HandCoins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'

const emptyForm = { person_name: '', phone: '', amount: '', payment_method: 'cash', frequency: 'monthly', next_payment_date: '', notes: '' }

interface PayingPerson { id: number; person_name: string; phone?: string; amount: number; payment_method?: string; frequency: string; next_payment_date?: string; notes?: string; active: boolean }

export default function PayingPeoplePage() {
  const { format, formatCompact } = useCurrency()
  const [payments, setPayments] = useState<PayingPerson[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PayingPerson | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const data = await window.api?.payingPeople?.getAll(); setPayments(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const getMonthly = (p: PayingPerson) => {
    if (p.frequency === 'weekly') return p.amount * 4.33
    if (p.frequency === 'yearly') return p.amount / 12
    return p.amount
  }

  const totalMonthly = payments.filter(p => p.active).reduce((s, p) => s + getMonthly(p), 0)

  const handleSubmit = async () => {
    if (!form.person_name || !form.amount) return toast.error('Name and amount required')
    const payload = { ...form, amount: parseFloat(form.amount), phone: form.phone || null, payment_method: form.payment_method || 'cash' }
    try {
      if (editing) { await window.api?.payingPeople?.update(editing.id, payload); toast.success('Updated') }
      else { await window.api?.payingPeople?.add(payload); toast.success('Added') }
      setOpen(false); setEditing(null); setForm(emptyForm); load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.payingPeople?.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const openEdit = (p: PayingPerson) => {
    setEditing(p)
    setForm({ person_name: p.person_name, phone: p.phone || '', amount: String(p.amount), payment_method: p.payment_method || 'cash', frequency: p.frequency, next_payment_date: p.next_payment_date || '', notes: p.notes || '' })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Paying People</h2>
          <p className="text-sm text-muted-foreground">Monthly total: <span className="font-semibold text-destructive">{formatCompact(totalMonthly)}</span></p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Payment
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <HandCoins className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No regular payments</p>
            <p className="text-sm text-muted-foreground">Track people you pay regularly (housemate, cleaner, etc.)</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.person_name}</TableCell>
                  <TableCell>{format(p.amount)}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{p.frequency}</Badge></TableCell>
                  <TableCell className="text-destructive font-medium">{format(getMonthly(p))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.next_payment_date ? `Next: ${p.next_payment_date}` : '—'}</TableCell>
                  <TableCell><Badge variant={p.active ? 'default' : 'secondary'}>{p.active ? 'Active' : 'Stopped'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>Delete payment for "{p.person_name}"?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Payment' : 'Add Regular Payment'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="e.g. John" value={form.person_name} onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input type="tel" placeholder="e.g. 123-456-7890" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['cash', 'bank transfer', 'credit card'].map(pm => (
                      <SelectItem key={pm} value={pm} className="capitalize">{pm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'one-time'].map(fr => (
                      <SelectItem key={fr} value={fr} className="capitalize">{fr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Next Due Date</Label>
                <Input type="date" value={form.next_payment_date} onChange={e => setForm(f => ({ ...f, next_payment_date: e.target.value }))} />
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
