import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, CreditCard, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import type { Loan } from '@/types'

const emptyForm = { name: '', lender: '', principal_amount: '', remaining_balance: '', interest_rate: '', monthly_payment: '', end_date: '', type: 'personal', notes: '' }

export default function LoansPage() {
  const { format } = useCurrency()
  const [loans, setLoans] = useState<Loan[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Loan | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const data = await window.api?.loans?.getAll(); setLoans(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const totalDebt = loans.reduce((sum, l) => sum + l.remaining_balance, 0)
  const totalMonthly = loans.reduce((sum, l) => sum + (l.monthly_payment || 0), 0)

  const handleSubmit = async () => {
    if (!form.name || !form.remaining_balance) return toast.error('Name and balance are required')
    const payload = {
      ...form,
      principal_amount: parseFloat(form.principal_amount) || 0,
      remaining_balance: parseFloat(form.remaining_balance),
      interest_rate: parseFloat(form.interest_rate) || 0,
      monthly_payment: parseFloat(form.monthly_payment) || 0,
      lender: form.lender || null,
      start_date: null,
      end_date: form.end_date || null,
      payment_day: null,
    }
    try {
      if (editing) { await window.api?.loans?.update(editing.id, payload); toast.success('Loan updated') }
      else { await window.api?.loans?.add(payload); toast.success('Loan added') }
      setOpen(false); setEditing(null); setForm(emptyForm); load()
    } catch { toast.error('Failed to save') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.loans?.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete') }
  }

  const openEdit = (l: Loan) => {
    setEditing(l)
    setForm({ name: l.name, lender: l.lender || '', principal_amount: String(l.principal_amount), remaining_balance: String(l.remaining_balance), interest_rate: String(l.interest_rate || ''), monthly_payment: String(l.monthly_payment || ''), end_date: l.end_date || '', type: l.type || 'personal', notes: l.notes || '' })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Loans & Debt</h2>
          <p className="text-sm text-muted-foreground">
            Total debt: <span className="font-semibold text-destructive">{format(totalDebt)}</span>
            {' · '}Monthly: <span className="font-semibold">{format(totalMonthly)}</span>
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Loan
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : loans.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No loans tracked</p>
            <p className="text-sm text-muted-foreground">Track mortgages, car loans, credit cards and more</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loans.map(l => {
            const paid = l.principal_amount > 0 ? ((l.principal_amount - l.remaining_balance) / l.principal_amount) * 100 : 0
            return (
              <Card key={l.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm">{l.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1 capitalize text-xs">{l.type}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Loan?</AlertDialogTitle>
                            <AlertDialogDescription>Delete "{l.name}"?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(l.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Balance</span><span>{paid.toFixed(0)}% paid</span>
                    </div>
                    <p className="text-xl font-bold text-destructive">{format(l.remaining_balance)}</p>
                    {l.principal_amount > 0 && <Progress value={paid} className="mt-1.5 h-1.5" />}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Monthly</p>
                      <p className="font-medium">{l.monthly_payment ? format(l.monthly_payment) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rate</p>
                      <p className="font-medium">{l.interest_rate ? `${l.interest_rate}%` : '—'}</p>
                    </div>
                  </div>
                  {l.end_date && <p className="text-xs text-muted-foreground">Due: {l.end_date}</p>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Loan' : 'Add Loan'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="e.g. Car Loan" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Lender (optional)</Label>
                <Input placeholder="e.g. Bank" value={form.lender} onChange={e => setForm(f => ({ ...f, lender: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['personal', 'mortgage', 'car', 'student', 'credit-card', 'business', 'other'].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Original Principal</Label>
                <Input type="number" placeholder="0.00" value={form.principal_amount} onChange={e => setForm(f => ({ ...f, principal_amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Current Balance</Label>
                <Input type="number" placeholder="0.00" value={form.remaining_balance} onChange={e => setForm(f => ({ ...f, remaining_balance: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monthly Payment</Label>
                <Input type="number" placeholder="0.00" value={form.monthly_payment} onChange={e => setForm(f => ({ ...f, monthly_payment: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Interest Rate (%)</Label>
                <Input type="number" placeholder="e.g. 5.5" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>End Date (optional)</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
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
