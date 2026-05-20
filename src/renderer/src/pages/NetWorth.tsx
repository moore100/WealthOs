import { useState, useEffect } from 'react'
import { TrendingUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'

const chartConfig = { value: { label: 'Net Worth', color: 'hsl(var(--primary))' } }

const emptyForm = { date: new Date().toISOString().slice(0, 10), assets: '', liabilities: '', notes: '' }

interface Snapshot { id: number; date: string; assets: number; liabilities: number; net_worth: number; notes?: string }

export default function NetWorthPage() {
  const { format, formatCompact } = useCurrency()
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const data = await window.api?.netWorth?.getHistory(); setSnapshots(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const latest = snapshots[snapshots.length - 1]
  const prev = snapshots[snapshots.length - 2]
  const change = latest && prev ? latest.net_worth - prev.net_worth : 0
  const changePct = prev && prev.net_worth !== 0 ? (change / Math.abs(prev.net_worth)) * 100 : 0

  const chartData = snapshots.map(s => ({ date: s.date, value: s.net_worth }))

  const handleSubmit = async () => {
    if (!form.assets) return toast.error('Assets value required')
    const assets = parseFloat(form.assets) || 0
    const liabilities = parseFloat(form.liabilities) || 0
    try {
      await window.api?.netWorth?.saveSnapshot({ ...form, total_assets: assets, total_liabilities: liabilities, net_worth: assets - liabilities })
      toast.success('Snapshot saved'); setOpen(false); setForm(emptyForm); load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.netWorth?.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Net Worth</h2>
          {latest && (
            <p className="text-sm text-muted-foreground">
              Current: <span className="font-semibold text-primary">{formatCompact(latest.net_worth)}</span>
              {change !== 0 && <span className={`ml-2 ${change >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                {change >= 0 ? '+' : ''}{formatCompact(change)} ({changePct.toFixed(1)}%)
              </span>}
            </p>
          )}
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Log Snapshot
        </Button>
      </div>

      {latest && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Total Assets', value: formatCompact(latest.assets), color: 'text-green-500' },
            { label: 'Total Liabilities', value: formatCompact(latest.liabilities), color: 'text-destructive' },
            { label: 'Net Worth', value: formatCompact(latest.net_worth), color: latest.net_worth >= 0 ? 'text-primary' : 'text-destructive' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {snapshots.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Net Worth Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-48">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="value" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : snapshots.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No snapshots yet</p>
            <p className="text-sm text-muted-foreground">Log your assets and liabilities to track net worth</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[...snapshots].reverse().slice(0, 12).map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-xs text-muted-foreground">{s.date}</p>
                  <p className={`font-semibold ${s.net_worth >= 0 ? 'text-primary' : 'text-destructive'}`}>{format(s.net_worth)}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="text-green-500">A: {formatCompact(s.assets)}</span>
                  <span className="text-destructive">L: {formatCompact(s.liabilities)}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete Snapshot?</AlertDialogTitle><AlertDialogDescription>Delete snapshot from {s.date}?</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Net Worth Snapshot</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Total Assets</Label>
                <Input type="number" placeholder="0.00" value={form.assets} onChange={e => setForm(f => ({ ...f, assets: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Total Liabilities</Label>
                <Input type="number" placeholder="0.00" value={form.liabilities} onChange={e => setForm(f => ({ ...f, liabilities: e.target.value }))} />
              </div>
            </div>
            {form.assets && (
              <p className="text-sm text-center font-medium">
                Net Worth: <span className={parseFloat(form.assets) - parseFloat(form.liabilities || '0') >= 0 ? 'text-primary' : 'text-destructive'}>
                  {format(parseFloat(form.assets) - parseFloat(form.liabilities || '0'))}
                </span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save Snapshot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
