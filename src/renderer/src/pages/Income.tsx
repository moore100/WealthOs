import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import type { IncomeSource } from '@/types'

const FREQUENCIES = ['monthly', 'weekly', 'biweekly', 'quarterly', 'yearly', 'daily']

const emptyForm = { name: '', amount: '', frequency: 'monthly', type: 'salary' }

export default function IncomePage() {
  const { format, formatCompact } = useCurrency()
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<IncomeSource | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const data = await window.api?.income?.getAll()
      setSources(data || [])
    } catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const monthlyTotal = sources.reduce((sum, s) => {
    const m = s.frequency === 'weekly' ? s.amount * 4.33
      : s.frequency === 'biweekly' ? s.amount * 2.17
      : s.frequency === 'quarterly' ? s.amount / 3
      : s.frequency === 'yearly' ? s.amount / 12
      : s.frequency === 'daily' ? s.amount * 30
      : s.amount
    return sum + m
  }, 0)

  const handleSubmit = async () => {
    if (!form.name || !form.amount) return toast.error('Name and amount are required')
    try {
      if (editing) {
        await window.api?.income?.update(editing.id, { ...form, amount: parseFloat(form.amount) })
        toast.success('Income source updated')
      } else {
        await window.api?.income?.add({ ...form, amount: parseFloat(form.amount) })
        toast.success('Income source added')
      }
      setOpen(false); setEditing(null); setForm(emptyForm); load()
    } catch { toast.error('Failed to save') }
  }

  const handleDelete = async (id: number) => {
    try {
      await window.api?.income?.delete(id)
      toast.success('Deleted'); load()
    } catch { toast.error('Failed to delete') }
  }

  const openEdit = (s: IncomeSource) => {
    setEditing(s)
    setForm({ name: s.name, amount: String(s.amount), frequency: s.frequency, type: s.type || 'salary' })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Income Sources</h2>
          <p className="text-sm text-muted-foreground">Monthly total: <span className="font-semibold text-primary">{formatCompact(monthlyTotal)}</span></p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Income
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No income sources yet</p>
            <p className="text-sm text-muted-foreground">Add your salary, freelance, or other income</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Monthly Equiv.</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map(s => {
                const monthly = s.frequency === 'weekly' ? s.amount * 4.33
                  : s.frequency === 'biweekly' ? s.amount * 2.17
                  : s.frequency === 'quarterly' ? s.amount / 3
                  : s.frequency === 'yearly' ? s.amount / 12
                  : s.frequency === 'daily' ? s.amount * 30
                  : s.amount
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{format(s.amount)}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{s.frequency}</Badge></TableCell>
                    <TableCell className="text-primary font-medium">{format(monthly)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
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
                              <AlertDialogTitle>Delete Income Source?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete "{s.name}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Income' : 'Add Income Source'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Salary, Freelance" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(freq => <SelectItem key={freq} value={freq} className="capitalize">{freq}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['salary', 'freelance', 'business', 'investment', 'rental', 'other'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
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
