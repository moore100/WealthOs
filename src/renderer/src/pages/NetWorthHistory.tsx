import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Wallet, Plus, Trash2, Calendar } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Snapshot {
  id: number
  total_assets: number
  total_liabilities: number
  net_worth: number
  snapshot_date: string
}

export default function NetWorthHistoryPage() {
  const { format: fmt } = useCurrency()
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState('')
  const [liabilities, setLiabilities] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const load = async () => {
    setLoading(true)
    try {
      const data = await window.api?.netWorth?.getHistory?.()
      setSnapshots(data || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const chartData = useMemo(() => {
    return snapshots.map(s => ({
      date: s.snapshot_date,
      netWorth: s.net_worth,
      assets: s.total_assets,
      liabilities: s.total_liabilities,
    }))
  }, [snapshots])

  const latest = snapshots[snapshots.length - 1]
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null
  const change = latest && previous ? latest.net_worth - previous.net_worth : 0

  const handleAdd = async () => {
    const a = Number(assets)
    const l = Number(liabilities)
    if (isNaN(a) || isNaN(l)) { toast.error('Enter valid numbers'); return }
    try {
      await window.api?.netWorth?.saveSnapshot?.({
        total_assets: a,
        total_liabilities: l,
        net_worth: a - l,
        snapshot_date: date,
      })
      toast.success('Snapshot saved')
      setAssets(''); setLiabilities('')
      load()
    } catch { toast.error('Failed to save snapshot') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.netWorth?.delete?.(id); load() } catch { }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading net worth history...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Net Worth History</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Track your net worth over time. Add snapshots manually or let AI calculate from your data.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Wallet className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{latest ? fmt(latest.net_worth) : fmt(0)}</p>
            <p className="text-[10px] text-muted-foreground">Current Net Worth</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            {change >= 0 ? <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" /> : <TrendingDown className="h-5 w-5 mx-auto mb-1 text-rose-500" />}
            <p className="text-lg font-bold">{fmt(Math.abs(change))}</p>
            <p className="text-[10px] text-muted-foreground">Since last snapshot</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{snapshots.length}</p>
            <p className="text-[10px] text-muted-foreground">Snapshots</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Net Worth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v).replace('$', '')} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Area type="monotone" dataKey="netWorth" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Add Snapshot */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" placeholder="Total Assets" value={assets} onChange={e => setAssets(e.target.value)} />
            <Input type="number" placeholder="Total Liabilities" value={liabilities} onChange={e => setLiabilities(e.target.value)} />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <Button size="sm" onClick={handleAdd} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Save Snapshot
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Net worth will be calculated automatically as Assets − Liabilities.
          </p>
        </CardContent>
      </Card>

      {/* Snapshot List */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Past Snapshots</h2>
        {snapshots.slice().reverse().map(s => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">{s.snapshot_date}</p>
                <p className="text-[10px] text-muted-foreground">
                  Assets: {fmt(s.total_assets)} · Liabilities: {fmt(s.total_liabilities)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">{fmt(s.net_worth)}</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {snapshots.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No snapshots yet. Add your first one above.</p>
        )}
      </div>
    </div>
  )
}
