import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Skull } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import type { BadHabit } from '@/types'

const emptyForm = { name: '', avg_weekly_spend: '', times_per_week: '1', category: '', notes: '' }

export default function BadHabitsPage() {
  const { format, formatCompact } = useCurrency()
  const [habits, setHabits] = useState<BadHabit[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BadHabit | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const data = await window.api?.habits?.getAll(); setHabits(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const getMonthly = (h: BadHabit) => {
    const occ = h.times_per_week
    return h.avg_weekly_spend
  }

  const totalMonthly = habits.reduce((s, h) => s + getMonthly(h), 0)
  const totalYearly = totalMonthly * 12

  const handleSubmit = async () => {
    if (!form.name || !form.avg_weekly_spend) return toast.error('Name and cost required')
    const payload = { ...form, avg_weekly_spend: parseFloat(form.avg_weekly_spend), times_per_week: parseInt(form.times_per_week) || 1 }
    try {
      if (editing) { await window.api?.habits?.update(editing.id, payload); toast.success('Updated') }
      else { await window.api?.habits?.add(payload); toast.success('Added') }
      setOpen(false); setEditing(null); setForm(emptyForm); load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.habits?.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const openEdit = (h: BadHabit) => {
    setEditing(h)
    setForm({ name: h.name, avg_weekly_spend: String(h.avg_weekly_spend), times_per_week: String(h.times_per_week), category: h.category || '', notes: h.notes || '' })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Bad Habits</h2>
          <p className="text-sm text-muted-foreground">
            Monthly cost: <span className="font-semibold text-destructive">{formatCompact(totalMonthly)}</span>
            {' · '}Yearly: <span className="font-semibold text-destructive">{formatCompact(totalYearly)}</span>
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Habit
        </Button>
      </div>

      {habits.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium">💡 If you quit all these habits, you'd save <span className="text-green-500 font-bold">{format(totalYearly)}</span> per year.</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : habits.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Skull className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No bad habits tracked</p>
            <p className="text-sm text-muted-foreground">Track spending on habits you want to reduce</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map(h => (
            <Card key={h.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{h.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(h)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>Delete "{h.name}"?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(h.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">{h.times_per_week}x / wk</p>
                    <p className="font-medium">{format(h.avg_weekly_spend)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly Cost</p>
                    <p className="font-medium text-destructive">{format(getMonthly(h))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Yearly Cost</p>
                    <p className="font-medium text-destructive">{format(getMonthly(h) * 12)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Habit' : 'Track Bad Habit'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Habit Name</Label>
                <Input placeholder="e.g. Cigarettes" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Weekly Spend</Label>
                <Input type="number" placeholder="0.00" value={form.avg_weekly_spend} onChange={e => setForm(f => ({ ...f, avg_weekly_spend: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Times / week</Label>
              <Input type="number" placeholder="1" value={form.times_per_week} onChange={e => setForm(f => ({ ...f, times_per_week: e.target.value }))} />
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
