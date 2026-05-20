import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'

const emptyForm = { date: '', name: '', total_budget: '', spent: '', venue: '', notes: '' }

interface DateBudget { id: number; date: string; name: string; total_budget: number; spent: number; venue?: string; notes?: string }

export default function DateBudgetsPage() {
  const { format, formatCompact } = useCurrency()
  const [dates, setDates] = useState<DateBudget[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DateBudget | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const data = await window.api?.dateBudgets?.getAll(); setDates(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const totalBudget = dates.reduce((s, d) => s + d.total_budget, 0)
  const totalSpent = dates.reduce((s, d) => s + d.spent, 0)

  const handleSubmit = async () => {
    if (!form.date || !form.total_budget) return toast.error('Date and budget required')
    const payload = { ...form, total_budget: parseFloat(form.total_budget), spent: parseFloat(form.spent) || 0, venue: form.venue || null, rating: 0 }
    try {
      if (editing) { await window.api?.dateBudgets?.update(editing.id, payload); toast.success('Updated') }
      else { await window.api?.dateBudgets?.add(payload); toast.success('Added') }
      setOpen(false); setEditing(null); setForm(emptyForm); load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.dateBudgets?.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const openEdit = (d: DateBudget) => {
    setEditing(d)
    setForm({ date: d.date, name: d.name, total_budget: String(d.total_budget), spent: String(d.spent), venue: d.venue || '', notes: d.notes || '' })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Date Budgets</h2>
          <p className="text-sm text-muted-foreground">
            Total spent: <span className="font-semibold">{formatCompact(totalSpent)}</span> of {formatCompact(totalBudget)}
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Plan Date
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : dates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No date budgets</p>
            <p className="text-sm text-muted-foreground">Plan and track your date spending</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dates.map(d => {
                const pct = d.total_budget > 0 ? Math.min((d.spent / d.total_budget) * 100, 100) : 0
                const over = d.spent > d.total_budget
                return (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs text-muted-foreground">{d.date}</TableCell>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-sm">{d.venue || '—'}</TableCell>
                    <TableCell>{format(d.total_budget)}</TableCell>
                    <TableCell className={over ? 'text-destructive font-medium' : ''}>{format(d.spent)}</TableCell>
                    <TableCell>
                      <div className="w-20">
                        <Progress value={pct} className={`h-1.5 ${over ? '[&>div]:bg-destructive' : ''}`} />
                        <p className="text-xs text-muted-foreground mt-0.5">{pct.toFixed(0)}%</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>Delete this date budget?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(d.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
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
          <DialogHeader><DialogTitle>{editing ? 'Edit Date Budget' : 'Plan a Date'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Venue (optional)</Label>
                <Input placeholder="Where are you going?" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Dinner at Nobu, Movie night" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Budget</Label>
                <Input type="number" placeholder="0.00" value={form.total_budget} onChange={e => setForm(f => ({ ...f, total_budget: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Actual Spent</Label>
                <Input type="number" placeholder="0.00" value={form.spent} onChange={e => setForm(f => ({ ...f, spent: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Update' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
