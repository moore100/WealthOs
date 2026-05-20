import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Target, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import type { SavingsGoal } from '@/types'

const emptyForm = { name: '', target_amount: '', current_amount: '', target_date: '', notes: '', icon: '🎯' }

const EMOJIS = ['🎯', '🏠', '✈️', '🚗', '💍', '📚', '💻', '🏖️', '💰', '🎓', '👶', '🌍']

export default function GoalsPage() {
  const navigate = useNavigate()
  const { format } = useCurrency()
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const data = await window.api?.goals?.getAll(); setGoals(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async () => {
    if (!form.name || !form.target_amount) return toast.error('Name and target are required')
    const payload = { ...form, target_amount: parseFloat(form.target_amount), current_amount: parseFloat(form.current_amount) || 0, target_date: form.target_date || null }
    try {
      if (editing) { await window.api?.goals?.update(editing.id, payload); toast.success('Goal updated') }
      else { await window.api?.goals?.add(payload); toast.success('Goal created') }
      setOpen(false); setEditing(null); setForm(emptyForm); load()
    } catch { toast.error('Failed to save') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.goals?.delete(id); load(); toast.success('Deleted') }
    catch { toast.error('Failed to delete') }
  }

  const openEdit = (g: SavingsGoal) => { setEditing(g); setForm({ name: g.name, target_amount: String(g.target_amount), current_amount: String(g.current_amount), target_date: g.target_date || '', notes: g.notes || '', icon: g.icon || '🎯' }); setOpen(true) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Savings</h2>
          <p className="text-sm text-muted-foreground">{goals.filter(g => !g.completed_at).length} active · {goals.filter(g => g.completed_at).length} completed · {format(goals.reduce((sum, g) => sum + (g.current_amount || 0), 0))} total saved</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Goal
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No goals yet</p>
            <p className="text-sm text-muted-foreground">Set savings targets and track your progress</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map(g => {
            const pct = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0
            const remaining = g.target_amount - g.current_amount
            return (
              <Card key={g.id} className={`${g.completed_at ? 'opacity-70' : ''} cursor-pointer hover:shadow-md transition-shadow`} onClick={() => navigate(`/savings/${g.id}`)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{g.icon || '🎯'}</span>
                      <div>
                        <CardTitle className="text-sm">{g.name}</CardTitle>
                        {g.completed_at && <Badge variant="secondary" className="mt-0.5 text-xs gap-1"><Check className="h-2.5 w-2.5" />Done</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete Goal?</AlertDialogTitle><AlertDialogDescription>Delete "{g.name}"?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(g.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{format(g.current_amount)}</span>
                      <span>{format(g.target_amount)}</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex justify-between text-xs mt-1">
                      <span>{pct.toFixed(0)}%</span>
                      <span className="text-muted-foreground">{remaining > 0 ? format(remaining) + ' left' : 'Goal reached!'}</span>
                    </div>
                  </div>
                  {g.target_date && <p className="text-xs text-muted-foreground">Deadline: {g.target_date}</p>}
                  <div className="flex items-center justify-end text-xs text-primary gap-1">
                    View details <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Goal' : 'New Savings Goal'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-2 block">Icon</Label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm(f => ({ ...f, icon: e }))}
                    className={`text-xl rounded p-1.5 transition-all ${form.icon === e ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-muted'}`}
                  >{e}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Goal Name</Label>
              <Input placeholder="e.g. Emergency Fund, Vacation" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Target Amount</Label>
                <Input type="number" placeholder="0.00" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Current Savings</Label>
                <Input type="number" placeholder="0.00" value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Deadline (optional)</Label>
              <Input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Update' : 'Create Goal'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
