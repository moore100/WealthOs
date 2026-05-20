import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, TrendingDown, Filter, Sparkles, Camera, Wand2, Frown } from 'lucide-react'
import StatementImporter from '@/components/StatementImporter'
import ReceiptScanner from '@/components/ReceiptScanner'
import GoalImpactSimulator from '@/components/GoalImpactSimulator'
import { format as dateFormat } from 'date-fns'
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
import type { Expense, Category } from '@/types'

const emptyForm = { name: '', amount: '', category_id: '', date: new Date().toISOString().slice(0, 10), notes: '', merchant: '' }

export default function ExpensesPage() {
  const { format, formatCompact } = useCurrency()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))
  const [importerOpen, setImporterOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [autoSuggest, setAutoSuggest] = useState<{ category_id: string; merchant: string } | null>(null)

  const load = async () => {
    try {
      const [data, cats] = await Promise.all([
        window.api?.expenses?.getAll({ month: filterMonth }),
        window.api?.categories?.getAll().catch(() => []),
      ])
      setExpenses(data || [])
      setCategories((cats || []).filter((c: any) => c.type === 'expense'))
    } catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterMonth])

  // Auto-categorize based on merchant/description history
  const autoCategorize = (name: string) => {
    const lower = name.toLowerCase()
    const past = expenses.filter(e => e.name?.toLowerCase().includes(lower) || lower.includes(e.name?.toLowerCase()))
    if (past.length > 0) {
      const mostCommon = past.sort((a, b) => past.filter(x => x.category_id === a.category_id).length - past.filter(x => x.category_id === b.category_id).length)[0]
      if (mostCommon.category_id) {
        setAutoSuggest({ category_id: String(mostCommon.category_id), merchant: mostCommon.merchant || name })
        setForm(f => ({ ...f, category_id: String(mostCommon.category_id), merchant: mostCommon.merchant || name }))
      }
    }
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  const handleSubmit = async () => {
    if (!form.name || !form.amount) return toast.error('Description and amount are required')
    try {
      if (editing) {
        await window.api?.expenses?.update(editing.id, { ...form, amount: parseFloat(form.amount), category_id: parseInt(form.category_id) || null })
        toast.success('Expense updated')
      } else {
        await window.api?.expenses?.add({ ...form, amount: parseFloat(form.amount), category_id: parseInt(form.category_id) || null })
        toast.success('Expense added')
      }
      setOpen(false); setEditing(null); setForm(emptyForm); load()
    } catch { toast.error('Failed to save') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.expenses?.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete') }
  }

  const openEdit = (e: Expense) => {
    setEditing(e)
    setForm({ name: e.name, amount: String(e.amount), category_id: String(e.category_id || ''), date: e.date, notes: e.notes || '', merchant: e.merchant || '' })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <StatementImporter open={importerOpen} onClose={() => setImporterOpen(false)} onImported={() => load()} />
      <ReceiptScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onImported={() => load()} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Expenses</h2>
          <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-destructive">{formatCompact(total)}</span></p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-36" />
          <Button variant="outline" onClick={() => setScannerOpen(true)}>
            <Camera className="mr-2 h-4 w-4" /> Scan Receipt
          </Button>
          <Button variant="outline" onClick={() => setImporterOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" /> Import Statement
          </Button>
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Expense
          </Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <TrendingDown className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No expenses for {filterMonth}</p>
            <p className="text-sm text-muted-foreground">Track your spending to understand your habits</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground text-xs">{e.date}</TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>{e.category_name ? <Badge variant="outline">{e.category_name}</Badge> : '—'}</TableCell>
                  <TableCell className="font-medium text-destructive">{format(e.amount)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${(e as any).regret ? 'text-orange-500' : 'text-muted-foreground hover:text-orange-500'}`}
                        title={(e as any).regret ? 'Un-regret' : 'Regret this purchase'}
                        onClick={async () => {
                          await window.api?.regret?.toggle(e.id, (e as any).regret ? 0 : 1)
                          toast.success((e as any).regret ? 'Removed from regrets' : 'Tagged as regret')
                          load()
                        }}
                      >
                        <Frown className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
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
                            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                            <AlertDialogDescription>Delete "{e.name}"?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
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
          <DialogHeader><DialogTitle>{editing ? 'Edit Expense' : 'Add Expense'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="e.g. Groceries, Netflix"
                value={form.name}
                onChange={e => {
                  const val = e.target.value
                  setForm(f => ({ ...f, name: val }))
                  if (!editing && val.length > 2) autoCategorize(val)
                }}
              />
              {autoSuggest && !editing && (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Wand2 className="h-3 w-3" />
                  <span>Auto-categorized from history</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Merchant (optional)</Label>
              <Input placeholder="e.g. Starbucks, Amazon" value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input placeholder="Any extra notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {!editing && <GoalImpactSimulator expenseAmount={parseFloat(form.amount) || 0} />}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOpen(false); setAutoSuggest(null) }}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
