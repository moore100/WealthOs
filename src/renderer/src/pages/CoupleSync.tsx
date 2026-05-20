import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Heart, Plus, Check, Trash2, Users } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export default function CoupleSync() {
  const { format } = useCurrency()
  const [partner, setPartner] = useState<any>(null)
  const [shared, setShared] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [editPartner, setEditPartner] = useState(false)
  const [pName, setPName] = useState('')
  const [pIncome, setPIncome] = useState('')
  const [pNetWorth, setPNetWorth] = useState('')

  const [addShared, setAddShared] = useState(false)
  const [sName, setSName] = useState('')
  const [sAmount, setSAmount] = useState('')
  const [sDate, setSDate] = useState(new Date().toISOString().slice(0, 10))
  const [sPaidBy, setSPaidBy] = useState<'me' | 'partner'>('me')
  const [sSplit, setSSplit] = useState('0.5')

  const load = async () => {
    setLoading(true)
    const [p, s, sum] = await Promise.all([
      window.api?.couple?.getPartner(),
      window.api?.couple?.listShared(),
      window.api?.couple?.summary(),
    ])
    setPartner(p)
    setShared(s || [])
    setSummary(sum)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSavePartner = async () => {
    if (!pName.trim()) { toast.error('Partner name required'); return }
    await window.api?.couple?.setPartner({
      name: pName.trim(),
      monthly_income: parseFloat(pIncome) || 0,
      net_worth: parseFloat(pNetWorth) || 0,
    })
    toast.success('Partner saved')
    setEditPartner(false)
    load()
  }

  const handleRemovePartner = async () => {
    if (!confirm('Remove partner and disconnect Couple Sync?')) return
    await window.api?.couple?.removePartner()
    toast.success('Partner removed')
    load()
  }

  const handleAddShared = async () => {
    if (!sName.trim() || !sAmount) { toast.error('Name and amount required'); return }
    await window.api?.couple?.addShared({
      name: sName.trim(),
      amount: parseFloat(sAmount),
      date: sDate,
      paid_by: sPaidBy,
      split_ratio: parseFloat(sSplit) || 0.5,
    })
    toast.success('Shared expense added')
    setAddShared(false)
    setSName(''); setSAmount('')
    load()
  }

  const handleSettle = async (id: number) => {
    await window.api?.couple?.settleShared(id)
    toast.success('Settled')
    load()
  }

  const handleDelete = async (id: number) => {
    await window.api?.couple?.deleteShared(id)
    load()
  }

  const startEditPartner = () => {
    setPName(partner?.name || '')
    setPIncome(String(partner?.monthly_income || ''))
    setPNetWorth(String(partner?.net_worth || ''))
    setEditPartner(true)
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>

  if (!partner) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-rose-500/30">
          <CardContent className="pt-8 text-center space-y-4">
            <Heart className="h-12 w-12 mx-auto text-rose-500" />
            <h2 className="text-xl font-bold">Couple Sync Mode</h2>
            <p className="text-sm text-muted-foreground">
              Track your finances together. See merged net worth, split shared expenses, and settle balances —
              while keeping your private spending private.
            </p>
            <Button onClick={startEditPartner} className="bg-rose-500 hover:bg-rose-600">
              <Plus className="h-4 w-4 mr-1" /> Add Your Partner
            </Button>
          </CardContent>
        </Card>

        <Dialog open={editPartner} onOpenChange={setEditPartner}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Partner</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={pName} onChange={e => setPName(e.target.value)} /></div>
              <div><Label>Monthly Income</Label><Input type="number" value={pIncome} onChange={e => setPIncome(e.target.value)} /></div>
              <div><Label>Net Worth</Label><Input type="number" value={pNetWorth} onChange={e => setPNetWorth(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditPartner(false)}>Cancel</Button>
              <Button onClick={handleSavePartner}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" /> Couple Sync
          </h1>
          <p className="text-muted-foreground text-sm mt-1">You & {partner.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={startEditPartner}>Edit Partner</Button>
          <Button variant="ghost" size="sm" onClick={handleRemovePartner}>Disconnect</Button>
        </div>
      </div>

      {/* Combined Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase">Combined Income</p>
              <p className="text-2xl font-bold text-emerald-500">{format(summary.combinedIncome)}</p>
              <p className="text-xs text-muted-foreground">monthly</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase">Shared Spending</p>
              <p className="text-2xl font-bold">{format(summary.sharedTotal)}</p>
              <p className="text-xs text-muted-foreground">this month</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase">{partner.name} Owes You</p>
              <p className="text-2xl font-bold text-emerald-500">{format(summary.owedToMe)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground uppercase">You Owe {partner.name}</p>
              <p className="text-2xl font-bold text-rose-500">{format(summary.owedToPartner)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Net Balance */}
      {summary && (
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground uppercase">Net Balance</p>
            {summary.balance > 0 ? (
              <p className="text-3xl font-bold text-emerald-500 mt-2">
                {partner.name} owes you {format(summary.balance)}
              </p>
            ) : summary.balance < 0 ? (
              <p className="text-3xl font-bold text-rose-500 mt-2">
                You owe {partner.name} {format(Math.abs(summary.balance))}
              </p>
            ) : (
              <p className="text-3xl font-bold mt-2">All settled ✨</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Shared Expenses */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Shared Expenses
          </CardTitle>
          <Button size="sm" onClick={() => setAddShared(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {shared.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No shared expenses yet. Add rent, groceries, dates, etc.
            </p>
          ) : (
            <div className="space-y-2">
              {shared.map(s => (
                <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${s.settled ? 'opacity-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.date} · Paid by {s.paid_by === 'me' ? 'you' : partner.name} · Split {Math.round(s.split_ratio * 100)}/{Math.round((1 - s.split_ratio) * 100)}
                      {s.settled && ' · Settled'}
                    </p>
                  </div>
                  <div className="text-right ml-3 flex items-center gap-2">
                    <p className="font-bold">{format(s.amount)}</p>
                    {!s.settled && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSettle(s.id)}>
                        <Check className="h-4 w-4 text-emerald-500" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Partner Dialog */}
      <Dialog open={editPartner} onOpenChange={setEditPartner}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Partner</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={pName} onChange={e => setPName(e.target.value)} /></div>
            <div><Label>Monthly Income</Label><Input type="number" value={pIncome} onChange={e => setPIncome(e.target.value)} /></div>
            <div><Label>Net Worth</Label><Input type="number" value={pNetWorth} onChange={e => setPNetWorth(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPartner(false)}>Cancel</Button>
            <Button onClick={handleSavePartner}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Shared Dialog */}
      <Dialog open={addShared} onOpenChange={setAddShared}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Shared Expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Description</Label><Input value={sName} onChange={e => setSName(e.target.value)} placeholder="Rent, groceries, dinner..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount</Label><Input type="number" value={sAmount} onChange={e => setSAmount(e.target.value)} /></div>
              <div><Label>Date</Label><Input type="date" value={sDate} onChange={e => setSDate(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Paid By</Label>
                <select value={sPaidBy} onChange={e => setSPaidBy(e.target.value as any)} className="w-full h-9 rounded-md border bg-background px-3 text-sm">
                  <option value="me">You</option>
                  <option value="partner">{partner.name}</option>
                </select>
              </div>
              <div>
                <Label>Your Share</Label>
                <select value={sSplit} onChange={e => setSSplit(e.target.value)} className="w-full h-9 rounded-md border bg-background px-3 text-sm">
                  <option value="0.5">50/50</option>
                  <option value="0.6">60/40</option>
                  <option value="0.7">70/30</option>
                  <option value="0.4">40/60</option>
                  <option value="0.3">30/70</option>
                  <option value="1">100% you</option>
                  <option value="0">0% you</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddShared(false)}>Cancel</Button>
            <Button onClick={handleAddShared}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
