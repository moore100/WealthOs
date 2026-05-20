import { useState, useEffect } from 'react'
import { Plus, Sparkles, Target, CheckCircle2, Circle, Pause, Play, Trash2, Calendar, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'

interface Checkpoint {
  id: number
  intention_id: number
  scheduled_at: string
  prompt: string
  amount: number | null
  completed: number
  created_at: string
}

interface Intention {
  id: number
  description: string
  period_type: string
  start_date: string
  end_date: string | null
  target_amount: number | null
  status: string
  ai_plan: string
  plan_name: string | null
  created_at: string
  checkpoints?: Checkpoint[]
}

export default function SavingsIntentionsPage() {
  const { format } = useCurrency()
  const [intentions, setIntentions] = useState<Intention[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Intention | null>(null)
  const [generating, setGenerating] = useState(false)

  const [form, setForm] = useState({
    description: '',
    period_type: 'month',
    target_amount: '',
    end_date: '',
    income: '',
    expenses: '',
  })

  const load = async () => {
    try {
      const data = await window.api?.intentions?.getAll()
      setIntentions(data || [])
    } catch (e) { console.warn(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.description.trim()) return toast.error('Describe your intention')
    try {
      const intention = await window.api?.intentions?.add({
        description: form.description,
        period_type: form.period_type,
        target_amount: form.target_amount ? parseFloat(form.target_amount) : null,
        end_date: form.end_date || null,
      })
      toast.success('Intention created!')
      setOpen(false)
      setForm({ description: '', period_type: 'month', target_amount: '', end_date: '', income: '', expenses: '' })

      // Auto-generate plan with AI
      if (intention) {
        await generatePlan(intention.id)
      }
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create intention')
    }
  }

  const generatePlan = async (intentionId: number) => {
    setGenerating(true)
    try {
      const intention = intentions.find(i => i.id === intentionId) || await window.api?.intentions?.getById(intentionId)
      await window.api?.intentions?.generatePlan({
        intention_id: intentionId,
        description: intention?.description,
        period_type: intention?.period_type || 'month',
        target_amount: intention?.target_amount,
        income: form.income ? parseFloat(form.income) : undefined,
        expenses: form.expenses ? parseFloat(form.expenses) : undefined,
      })
      toast.success('AI plan generated!')
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate plan')
    } finally {
      setGenerating(false)
    }
  }

  const toggleStatus = async (id: number) => {
    try {
      await window.api?.intentions?.toggleStatus(id)
      load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.intentions?.delete(id); load(); toast.success('Deleted') }
    catch { toast.error('Failed to delete') }
  }

  const completeCheckpoint = async (cp: Checkpoint) => {
    try {
      await window.api?.intentions?.completeCheckpoint(cp.id)
      toast.success('Checkpoint completed! Keep it up!')
      if (selected) {
        const updated = await window.api?.intentions?.getById(selected.id)
        setSelected(updated)
      }
      load()
    } catch { toast.error('Failed') }
  }

  const openDetail = async (intention: Intention) => {
    try {
      const full = await window.api?.intentions?.getById(intention.id)
      setSelected(full)
      setDetailOpen(true)
    } catch { toast.error('Failed to load details') }
  }

  const parsePlan = (aiPlan: string) => {
    try { return JSON.parse(aiPlan) } catch { return null }
  }

  const activeCount = intentions.filter(i => i.status === 'active').length
  const completedCheckpoints = intentions.reduce((sum, i) => {
    const plan = parsePlan(i.ai_plan)
    return sum + (plan?.checkpoints?.length || 0)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Savings Intentions</h2>
          <p className="text-sm text-muted-foreground">{activeCount} active · Tell the AI what you want to save for</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Intention
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{intentions.length}</div>
            <div className="text-xs text-muted-foreground">Total Intentions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{activeCount}</div>
            <div className="text-xs text-muted-foreground">Active Plans</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {intentions.filter(i => i.status === 'active').reduce((sum, i) => sum + (i.target_amount || 0), 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total Target</div>
          </CardContent>
        </Card>
      </div>

      {/* Intentions List */}
      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : intentions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No intentions yet</p>
            <p className="text-sm text-muted-foreground mb-4">Tell the AI what you want to achieve and it will craft a plan</p>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create First Intention</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {intentions.map(intention => {
            const plan = parsePlan(intention.ai_plan)
            const totalCp = plan?.checkpoints?.length || 0
            const doneCp = intention.checkpoints?.filter((c: Checkpoint) => c.completed).length || 0
            return (
              <Card key={intention.id} className={`${intention.status !== 'active' ? 'opacity-60' : ''} cursor-pointer hover:shadow-md transition-shadow`} onClick={() => openDetail(intention)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{intention.plan_name || intention.description}</h3>
                        <Badge variant={intention.status === 'active' ? 'default' : 'secondary'} className="text-xs shrink-0">
                          {intention.status === 'active' ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{intention.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{intention.period_type}</span>
                        {intention.target_amount ? <span>Target: {format(intention.target_amount)}</span> : null}
                        {totalCp > 0 && <span>{doneCp}/{totalCp} checkpoints</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(intention.id)}>
                          {intention.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Intention?</AlertDialogTitle><AlertDialogDescription>This will delete the plan and all checkpoints.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(intention.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      {totalCp > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {Math.round((doneCp / totalCp) * 100)}% done
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Savings Intention</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>What do you want to achieve?</Label>
              <Textarea
                placeholder="e.g. I want to save as much money as possible this month to pay off my debt faster"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Period</Label>
                <Select value={form.period_type} onValueChange={v => setForm(f => ({ ...f, period_type: v }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input type="date" className="mt-1.5" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Target Amount (optional)</Label>
              <Input type="number" placeholder="0.00" className="mt-1.5" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monthly Income (for AI planning)</Label>
                <Input type="number" placeholder="0.00" className="mt-1.5" value={form.income} onChange={e => setForm(f => ({ ...f, income: e.target.value }))} />
              </div>
              <div>
                <Label>Monthly Expenses (for AI planning)</Label>
                <Input type="number" placeholder="0.00" className="mt-1.5" value={form.expenses} onChange={e => setForm(f => ({ ...f, expenses: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={generating}>
              {generating ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Create & Generate Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.plan_name || selected.description}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={selected.status === 'active' ? 'default' : 'secondary'}>
                    {selected.status === 'active' ? 'Active' : 'Paused'}
                  </Badge>
                  {selected.target_amount && <Badge variant="outline">Target: {format(selected.target_amount)}</Badge>}
                  <Badge variant="outline" className="flex items-center gap-1"><Calendar className="h-3 w-3" />{selected.period_type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{selected.description}</p>

                {selected.checkpoints && selected.checkpoints.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Your Plan Checkpoints</h4>
                    <div className="space-y-2">
                      {selected.checkpoints.map((cp: Checkpoint) => {
                        const isDue = new Date(cp.scheduled_at) <= new Date()
                        return (
                          <div key={cp.id} className={`flex items-start gap-3 p-3 rounded-lg border ${cp.completed ? 'bg-green-50/50 border-green-200' : isDue ? 'bg-amber-50/50 border-amber-200' : ''}`}>
                            <div className="mt-0.5">
                              {cp.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className={`h-5 w-5 ${isDue ? 'text-amber-500' : 'text-muted-foreground'}`} />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">{cp.prompt}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{new Date(cp.scheduled_at).toLocaleDateString()}</span>
                                {cp.amount ? <span>· Save {format(cp.amount)}</span> : null}
                              </div>
                            </div>
                            {!cp.completed && (
                              <Button size="sm" variant="outline" onClick={() => completeCheckpoint(cp)}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Done
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {(!selected.checkpoints || selected.checkpoints.length === 0) && (
                  <div className="text-center py-8">
                    <Sparkles className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground mb-3">No plan generated yet</p>
                    <Button onClick={() => generatePlan(selected.id)} disabled={generating}>
                      <Sparkles className="mr-2 h-4 w-4" /> Generate AI Plan
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
