import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, Receipt, Clock, CheckCircle2, XCircle, Trash2, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'
import type { SavingsGoal } from '@/types'

export default function SavingsGoalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { format } = useCurrency()
  const [goal, setGoal] = useState<SavingsGoal | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [actionOpen, setActionOpen] = useState(false)
  const [actionType, setActionType] = useState<'topup' | 'withdraw'>('topup')
  const [actionForm, setActionForm] = useState({ channelId: '', amount: '', phone_number: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [goalData, txData, chData] = await Promise.all([
        window.api?.goals?.getById?.(Number(id)),
        window.api?.paymentChannels?.getTransactions?.().catch(() => []),
        window.api?.paymentChannels?.getAll?.().catch(() => []),
      ])
      setGoal(goalData || null)
      // Filter transactions where external_reference contains this goal id
      const goalTx = (txData || []).filter((t: any) => t.external_reference?.includes(`GOAL_${id}`))
      setTransactions(goalTx)
      setChannels((chData || []).filter((c: any) => c.enabled === 1))
    } catch (e) { console.warn(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const openAction = (type: 'topup' | 'withdraw') => {
    setActionType(type)
    setActionForm({ channelId: channels[0]?.id ? String(channels[0].id) : '', amount: '', phone_number: '' })
    setActionOpen(true)
  }

  const handleAction = async () => {
    if (!goal) return
    if (!actionForm.channelId || !actionForm.amount || !actionForm.phone_number) return toast.error('Channel, amount, and phone number required')
    const amount = parseFloat(actionForm.amount)
    if (isNaN(amount) || amount <= 0) return toast.error('Invalid amount')

    try {
      const channelId = parseInt(actionForm.channelId)
      if (actionType === 'topup') {
        await window.api?.paymentChannels?.pay?.({
          channel_id: channelId,
          amount,
          phone_number: actionForm.phone_number,
          provider: 'm-pesa',
          external_reference: `GOAL_${goal.id}_${Date.now()}`,
        })
        await window.api?.paymentChannels?.addToGoal?.(goal.id, amount)
        toast.success('Top-up initiated and goal updated')
      } else {
        await window.api?.paymentChannels?.withdraw?.({
          channel_id: channelId,
          amount,
          phone_number: actionForm.phone_number,
          channel: 'mobile',
          external_reference: `GOAL_WD_${goal.id}_${Date.now()}`,
        })
        await window.api?.paymentChannels?.addToGoal?.(goal.id, -amount)
        toast.success('Withdrawal initiated and goal updated')
      }
      setActionOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Action failed')
    }
  }

  const handleDelete = async () => {
    if (!goal) return
    try { await window.api?.goals?.delete(goal.id); toast.success('Deleted'); navigate('/goals') }
    catch { toast.error('Failed to delete') }
  }

  if (loading) return <div className="text-sm text-muted-foreground p-6">Loading...</div>
  if (!goal) return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" onClick={() => navigate('/goals')}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
      <p className="text-muted-foreground">Goal not found.</p>
    </div>
  )

  const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0
  const remaining = goal.target_amount - goal.current_amount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/goals')}><ArrowLeft className="h-4 w-4" /></Button>
          <span className="text-2xl">{goal.icon || '🎯'}</span>
          <div>
            <h1 className="text-xl font-bold">{goal.name}</h1>
            {goal.completed_at && <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-2.5 w-2.5 mr-1" />Completed</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => openAction('topup')} className="bg-emerald-600 hover:bg-emerald-700">
            <ArrowUpCircle className="h-4 w-4 mr-1" /> Top Up
          </Button>
          <Button size="sm" variant="outline" onClick={() => openAction('withdraw')}>
            <ArrowDownCircle className="h-4 w-4 mr-1" /> Withdraw
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/goals?edit=${goal.id}`)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Current Savings</p>
            <p className="text-xl font-bold">{format(goal.current_amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="text-xl font-bold">{format(goal.target_amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-xl font-bold">{remaining > 0 ? format(remaining) : 'Done!'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>{pct.toFixed(0)}% saved</span>
            <span className="text-muted-foreground">{format(goal.current_amount)} / {format(goal.target_amount)}</span>
          </div>
          <Progress value={pct} className="h-3" />
        </CardContent>
      </Card>

      {goal.target_date && (
        <p className="text-sm text-muted-foreground">Deadline: {goal.target_date}</p>
      )}

      {/* Transaction History for this goal */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Transaction History</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions for this goal yet.</p>
          ) : (
            transactions.map((tx: any) => {
              const s = tx.status?.toLowerCase()
              const statusIcon = s === 'success' || s === 'queued'
                ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                : s === 'failed'
                  ? <XCircle className="h-3 w-3 text-rose-500" />
                  : <Clock className="h-3 w-3 text-amber-500" />
              return (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                  <div className="flex items-center gap-2">
                    {statusIcon}
                    <div>
                      <p className="font-medium">{tx.type === 'payment' ? 'Top Up' : 'Withdrawal'}</p>
                      <p className="text-xs text-muted-foreground">{tx.phone_number || '—'} · {tx.provider || '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{format(tx.amount)}</p>
                    <p className="text-xs text-muted-foreground">{tx.status} · {tx.reference || tx.external_reference || '—'}</p>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actionType === 'topup' ? 'Top Up Goal' : 'Withdraw from Goal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {channels.length === 0 ? (
              <p className="text-sm text-amber-500">No enabled payment channels. Enable one in Payment Channels settings first.</p>
            ) : (
              <>
                <div>
                  <Label>Payment Channel</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={actionForm.channelId}
                    onChange={e => setActionForm({ ...actionForm, channelId: e.target.value })}
                  >
                    {channels.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input type="number" placeholder="500" value={actionForm.amount} onChange={e => setActionForm({ ...actionForm, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input placeholder="0708344101" value={actionForm.phone_number} onChange={e => setActionForm({ ...actionForm, phone_number: e.target.value })} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setActionOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAction} disabled={channels.length === 0}>
              {actionType === 'topup' ? 'Top Up' : 'Withdraw'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
