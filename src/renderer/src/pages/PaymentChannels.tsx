import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'
import {
  MoneySend, Trash, Add, Edit2, ArrowCircleDown, ArrowCircleUp,
  Card as CardIcon, Receipt, TickCircle, CloseCircle, Clock
} from 'iconsax-react'

interface PaymentChannel {
  id: number
  name: string
  provider: string
  enabled: number
  config: string
  created_at: string
}

interface PaymentTransaction {
  id: number
  channel_id: number
  type: string
  amount: number
  status: string
  reference: string | null
  external_reference: string | null
  phone_number: string | null
  provider: string | null
  response: string | null
  error: string | null
  created_at: string
}

const defaultConfig = {
  api_key: '',
  account_id: '',
  channel_id: '',
  withdrawal_channel_id: '',
  network_code: '63902',
  callback_url: '',
}

export default function PaymentChannelsPage() {
  const { format: fmt } = useCurrency()
  const [channels, setChannels] = useState<PaymentChannel[]>([])
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PaymentChannel | null>(null)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [activeChannel, setActiveChannel] = useState<PaymentChannel | null>(null)

  const [form, setForm] = useState({
    name: '',
    provider: 'payhero',
    enabled: false,
    config: { ...defaultConfig },
  })

  const [payForm, setPayForm] = useState({
    amount: '',
    phone_number: '',
    provider: 'm-pesa',
    network_code: '63902',
    external_reference: '',
  })

  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    phone_number: '',
    account_number: '',
    network_code: '63902',
    channel: 'mobile',
    external_reference: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const [chData, txData] = await Promise.all([
        window.api?.paymentChannels?.getAll?.(),
        window.api?.paymentChannels?.getTransactions?.(),
      ])
      setChannels(chData || [])
      setTransactions(txData || [])
    } catch (e) { console.warn(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.name) return toast.error('Channel name is required')
    try {
      const payload = { ...form, config: { ...form.config } }
      if (editing) {
        await window.api?.paymentChannels?.update?.(editing.id, payload)
        toast.success('Channel updated')
      } else {
        await window.api?.paymentChannels?.add?.(payload)
        toast.success('Channel added')
      }
      setShowForm(false)
      setEditing(null)
      setForm({ name: '', provider: 'payhero', enabled: false, config: { ...defaultConfig } })
      load()
    } catch (e: any) {
      console.error('Save channel error:', e)
      toast.error(e?.message || 'Failed to save channel')
    }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.paymentChannels?.delete?.(id); load(); toast.success('Deleted') }
    catch { toast.error('Failed to delete') }
  }

  const handleToggle = async (ch: PaymentChannel) => {
    try {
      await window.api?.paymentChannels?.toggle?.(ch.id)
      load()
    } catch { toast.error('Failed to toggle') }
  }

  const openEdit = (ch: PaymentChannel) => {
    setEditing(ch)
    const cfg = JSON.parse(ch.config || '{}')
    setForm({
      name: ch.name,
      provider: ch.provider,
      enabled: ch.enabled === 1,
      config: { ...defaultConfig, ...cfg },
    })
    setShowForm(true)
  }

  const openPay = (ch: PaymentChannel) => {
    setActiveChannel(ch)
    const cfg = JSON.parse(ch.config || '{}')
    setPayForm({
      amount: '',
      phone_number: '',
      provider: 'm-pesa',
      network_code: cfg.network_code || '63902',
      external_reference: `SAVE_${Date.now()}`,
    })
    setShowPayDialog(true)
  }

  const openWithdraw = (ch: PaymentChannel) => {
    setActiveChannel(ch)
    const cfg = JSON.parse(ch.config || '{}')
    setWithdrawForm({
      amount: '',
      phone_number: '',
      account_number: '',
      network_code: cfg.network_code || '63902',
      channel: 'mobile',
      external_reference: `WD_${Date.now()}`,
    })
    setShowWithdrawDialog(true)
  }

  const handlePay = async () => {
    if (!activeChannel) return
    if (!payForm.amount || !payForm.phone_number) return toast.error('Amount and phone number required')
    try {
      const cfg = JSON.parse(activeChannel.config || '{}')
      await window.api?.paymentChannels?.pay?.({
        channel_id: activeChannel.id,
        amount: parseFloat(payForm.amount),
        phone_number: payForm.phone_number,
        provider: payForm.provider,
        network_code: payForm.network_code,
        account_id: cfg.account_id,
        channel_id_val: cfg.channel_id,
        callback_url: cfg.callback_url,
        external_reference: payForm.external_reference,
      })
      toast.success('Payment initiated. Check transaction history for status.')
      setShowPayDialog(false)
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Payment failed')
    }
  }

  const handleWithdraw = async () => {
    if (!activeChannel) return
    if (!withdrawForm.amount || !withdrawForm.phone_number) return toast.error('Amount and phone number required')
    try {
      const cfg = JSON.parse(activeChannel.config || '{}')
      await window.api?.paymentChannels?.withdraw?.({
        channel_id: activeChannel.id,
        amount: parseFloat(withdrawForm.amount),
        phone_number: withdrawForm.phone_number,
        account_number: withdrawForm.account_number,
        network_code: withdrawForm.network_code,
        channel: withdrawForm.channel,
        account_id: cfg.account_id,
        channel_id_val: cfg.withdrawal_channel_id || cfg.channel_id,
        callback_url: cfg.callback_url,
        external_reference: withdrawForm.external_reference,
      })
      toast.success('Withdrawal initiated. Check transaction history for status.')
      setShowWithdrawDialog(false)
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Withdrawal failed')
    }
  }

  const statusIcon = (status: string) => {
    const s = status?.toLowerCase()
    if (s === 'success' || s === 'queued') return <TickCircle className="h-3 w-3 text-green-500" />
    if (s === 'failed') return <CloseCircle className="h-3 w-3 text-rose-500" />
    return <Clock className="h-3 w-3 text-amber-500" />
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading payment channels...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CardIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Payment Channels</h1>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ name: '', provider: 'payhero', enabled: false, config: { ...defaultConfig } }); setShowForm(true) }}>
          <Add className="h-4 w-4 mr-1" /> Add Channel
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Connect payment providers like PayHero to top-up savings and withdraw funds. Toggle channels on/off as needed.
      </p>

      {/* Channels List */}
      <div className="space-y-3">
        {channels.map(ch => {
          const cfg = JSON.parse(ch.config || '{}')
          return (
            <Card key={ch.id} className={ch.enabled ? 'border-primary/30' : 'opacity-70'}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch checked={ch.enabled === 1} onCheckedChange={() => handleToggle(ch)} />
                    <div>
                      <p className="text-sm font-semibold">{ch.name}</p>
                      <p className="text-xs text-muted-foreground">{ch.provider} · Account {cfg.account_id || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openPay(ch)} disabled={!ch.enabled}>
                      <ArrowCircleUp className="h-4 w-4 mr-1" /> Top Up
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openWithdraw(ch)} disabled={!ch.enabled}>
                      <ArrowCircleDown className="h-4 w-4 mr-1" /> Withdraw
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(ch)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(ch.id)}>
                      <Trash className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </div>
                {ch.enabled === 1 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">Channel ID: {cfg.channel_id || '—'}</Badge>
                    <Badge variant="outline">Network: {cfg.network_code || '—'}</Badge>
                    <Badge variant="outline">API Key: {cfg.api_key ? '••••••' : 'Not set'}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
        {channels.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <CardIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">No payment channels yet</p>
              <p className="text-sm text-muted-foreground">Add a PayHero channel to start saving via M-Pesa or SasaPay</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Transaction History</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.slice(0, 20).map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
              <div className="flex items-center gap-2">
                {statusIcon(tx.status)}
                <div>
                  <p className="font-medium">{tx.type === 'payment' ? 'Top Up' : 'Withdrawal'}</p>
                  <p className="text-xs text-muted-foreground">{tx.phone_number || '—'} · {tx.provider || '—'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{fmt(tx.amount)}</p>
                <p className="text-xs text-muted-foreground">{tx.status} · {tx.reference || tx.external_reference || '—'}</p>
              </div>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No transactions yet.</p>}
        </CardContent>
      </Card>

      {/* Channel Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Channel' : 'Add Payment Channel'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Name</Label>
              <Input placeholder="My PayHero M-Pesa" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={v => setForm({ ...form, provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payhero">PayHero</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={v => setForm({ ...form, enabled: v })} />
              <Label>Enabled</Label>
            </div>
            <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase">API Configuration</p>
              <div>
                <Label className="text-xs">API Key (Base64 Credentials)</Label>
                <Input type="password" placeholder="Base64 encoded credentials" value={form.config.api_key} onChange={e => setForm({ ...form, config: { ...form.config, api_key: e.target.value } })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Account ID</Label>
                  <Input placeholder="e.g. 5" value={form.config.account_id} onChange={e => setForm({ ...form, config: { ...form.config, account_id: e.target.value } })} />
                </div>
                <div>
                  <Label className="text-xs">Payment Channel ID</Label>
                  <Input placeholder="e.g. 100" value={form.config.channel_id} onChange={e => setForm({ ...form, config: { ...form.config, channel_id: e.target.value } })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Withdrawal Channel ID (optional)</Label>
                <Input placeholder="e.g. 1523" value={form.config.withdrawal_channel_id} onChange={e => setForm({ ...form, config: { ...form.config, withdrawal_channel_id: e.target.value } })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Network Code</Label>
                  <Input placeholder="63902" value={form.config.network_code} onChange={e => setForm({ ...form, config: { ...form.config, network_code: e.target.value } })} />
                </div>
                <div>
                  <Label className="text-xs">Callback URL</Label>
                  <Input placeholder="https://..." value={form.config.callback_url} onChange={e => setForm({ ...form, config: { ...form.config, callback_url: e.target.value } })} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>{editing ? 'Update' : 'Save'} Channel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Top Up / Save Money</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Amount (KES)</Label>
              <Input type="number" placeholder="500" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input placeholder="0708344101" value={payForm.phone_number} onChange={e => setPayForm({ ...payForm, phone_number: e.target.value })} />
            </div>
            <div>
              <Label>Provider</Label>
              <Select value={payForm.provider} onValueChange={v => setPayForm({ ...payForm, provider: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="m-pesa">M-Pesa</SelectItem>
                  <SelectItem value="sasapay">SasaPay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Network Code</Label>
              <Input value={payForm.network_code} onChange={e => setPayForm({ ...payForm, network_code: e.target.value })} />
            </div>
            <div>
              <Label>External Reference</Label>
              <Input value={payForm.external_reference} onChange={e => setPayForm({ ...payForm, external_reference: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowPayDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handlePay}><MoneySend className="h-4 w-4 mr-1" /> Initiate Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Withdraw Money</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Amount (KES)</Label>
              <Input type="number" placeholder="500" value={withdrawForm.amount} onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input placeholder="0708344101" value={withdrawForm.phone_number} onChange={e => setWithdrawForm({ ...withdrawForm, phone_number: e.target.value })} />
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={withdrawForm.channel} onValueChange={v => setWithdrawForm({ ...withdrawForm, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {withdrawForm.channel === 'bank' && (
              <div>
                <Label>Account Number</Label>
                <Input placeholder="Bank account number" value={withdrawForm.account_number} onChange={e => setWithdrawForm({ ...withdrawForm, account_number: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Network Code</Label>
              <Input value={withdrawForm.network_code} onChange={e => setWithdrawForm({ ...withdrawForm, network_code: e.target.value })} />
            </div>
            <div>
              <Label>External Reference</Label>
              <Input value={withdrawForm.external_reference} onChange={e => setWithdrawForm({ ...withdrawForm, external_reference: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowWithdrawDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleWithdraw}><ArrowCircleDown className="h-4 w-4 mr-1" /> Initiate Withdrawal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
