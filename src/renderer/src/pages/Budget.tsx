import { useState, useEffect } from 'react'
import { PiggyBank, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'

const emptyForm = { category: '', budgeted: '', spent: '', month: new Date().toISOString().slice(0, 7) }

interface BudgetRow { id: number; category: string; budgeted: number; spent: number; month: string }

export default function BudgetPage() {
  const { format } = useCurrency()
  const [rows, setRows] = useState<BudgetRow[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const data = await window.api?.budget?.getByMonth(month); setRows(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month])

  const totalBudgeted = rows.reduce((s, r) => s + r.budgeted, 0)
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
  const remaining = totalBudgeted - totalSpent

  const handleSubmit = async () => {
    if (!form.category || !form.budgeted) return toast.error('Category and budget required')
    const payload = { ...form, budgeted: parseFloat(form.budgeted), spent: parseFloat(form.spent) || 0 }
    try {
      if (editing) { await window.api?.budget?.update(editing.id, payload); toast.success('Updated') }
      else { await window.api?.budget?.add(payload); toast.success('Added') }
      setOpen(false); setEditing(null); setForm(emptyForm); load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.budget?.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const openEdit = (r: BudgetRow) => {
    setEditing(r); setForm({ category: r.category, budgeted: String(r.budgeted), spent: String(r.spent), month: r.month }); setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Budget Planner</h2>
          <p className="text-sm text-muted-foreground">
            Remaining: <span className={`font-semibold ${remaining >= 0 ? 'text-green-500' : 'text-destructive'}`}>{format(remaining)}</span>
            {' · '}Spent: {format(totalSpent)} / {format(totalBudgeted)}
          </p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-36" />
          <Button onClick={() => { setEditing(null); setForm({ ...emptyForm, month }); setOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </div>
      </div>

      {totalBudgeted > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Overall Budget</span>
              <span>{((totalSpent / totalBudgeted) * 100).toFixed(0)}% used</span>
            </div>
            <Progress value={Math.min((totalSpent / totalBudgeted) * 100, 100)} className="h-2" />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <PiggyBank className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No budget categories</p>
            <p className="text-sm text-muted-foreground">Set spending limits for each category</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(r => {
            const pct = r.budgeted > 0 ? Math.min((r.spent / r.budgeted) * 100, 100) : 0
            const over = r.spent > r.budgeted
            return (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{r.category}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>Delete budget for "{r.category}"?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{format(r.spent)} spent</span>
                    <span className={over ? 'text-destructive font-medium' : ''}>{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} className={`h-2 ${over ? '[&>div]:bg-destructive' : ''}`} />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Budget: {format(r.budgeted)}</span>
                    <span className={over ? 'text-destructive' : 'text-green-500'}>
                      {over ? `-${format(r.spent - r.budgeted)} over` : `${format(r.budgeted - r.spent)} left`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Budget' : 'Add Budget Category'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Category Name</Label>
              <Input placeholder="e.g. Food & Dining" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Budget Amount</Label>
                <Input type="number" placeholder="0.00" value={form.budgeted} onChange={e => setForm(f => ({ ...f, budgeted: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount Spent</Label>
                <Input type="number" placeholder="0.00" value={form.spent} onChange={e => setForm(f => ({ ...f, spent: e.target.value }))} />
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
