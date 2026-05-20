import { useEffect, useState } from 'react'
import { Plus, TrendingUp, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Metric {
  id: number
  metric_type: string
  value: number
  unit: string
  period_start: string
  period_end: string | null
  source: string | null
  notes: string | null
}

const METRIC_TYPES = [
  { key: 'revenue', label: 'Revenue', unit: '$' },
  { key: 'traffic', label: 'Traffic', unit: 'visits' },
  { key: 'followers', label: 'Followers', unit: 'people' },
  { key: 'sales', label: 'Sales', unit: 'units' },
  { key: 'engagement', label: 'Engagement', unit: '%' },
  { key: 'conversion', label: 'Conversion', unit: '%' },
]

export default function BusinessMetricsTab({ businessId }: { businessId: number }) {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    metric_type: 'revenue',
    value: '',
    unit: '$',
    period_start: new Date().toISOString().slice(0, 10),
    period_end: '',
    source: '',
    notes: '',
  })

  const load = async () => {
    const data = await (window as any).api?.businesses?.metrics?.list(businessId)
    setMetrics(data || [])
  }
  useEffect(() => { load() }, [businessId])

  const handleAdd = async () => {
    if (!form.value || isNaN(Number(form.value))) { toast.error('Valid value required'); return }
    const res = await (window as any).api?.businesses?.metrics?.add(businessId, {
      ...form,
      value: Number(form.value),
      period_end: form.period_end || undefined,
    })
    if (res?.ok) {
      toast.success('Metric logged')
      setAdding(false)
      load()
    }
  }

  const handleDelete = async (id: number) => {
    await (window as any).api?.businesses?.metrics?.delete(id)
    load()
  }

  // Aggregate by metric_type for summary
  const grouped = metrics.reduce((acc, m) => {
    if (!acc[m.metric_type]) acc[m.metric_type] = []
    acc[m.metric_type].push(m)
    return acc
  }, {} as Record<string, Metric[]>)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Business Metrics</h3>
          <p className="text-xs text-muted-foreground">Log revenue, traffic, engagement — your AI uses this to learn what works</p>
        </div>
        {!adding && <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-1 h-3 w-3" /> Log Metric</Button>}
      </div>

      {adding && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Metric Type</label>
                <select
                  className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background"
                  value={form.metric_type}
                  onChange={e => {
                    const type = METRIC_TYPES.find(t => t.key === e.target.value)
                    setForm(f => ({ ...f, metric_type: e.target.value, unit: type?.unit || '' }))
                  }}
                >
                  {METRIC_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Value</label>
                <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Period Start</label>
                <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Period End (optional)</label>
                <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Source</label>
                <Input placeholder="e.g. Instagram, Stripe, Google Analytics" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <Input placeholder="Context" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd}>Log</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(grouped).length === 0 && !adding ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No metrics yet</p>
            <p className="text-xs text-muted-foreground">Log revenue, traffic, follower counts — anything measurable</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([type, items]) => {
          const total = items.reduce((s, m) => s + m.value, 0)
          const unit = items[0]?.unit || ''
          return (
            <Card key={type}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold capitalize">{type.replace('_', ' ')}</h4>
                    <p className="text-2xl font-bold">{unit}{total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{items.length} entries</p>
                  </div>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {items.slice(0, 10).map(m => (
                    <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b">
                      <div>
                        <span className="font-medium">{unit}{m.value.toLocaleString()}</span>
                        <span className="text-muted-foreground ml-2">{m.period_start}{m.period_end ? ` → ${m.period_end}` : ''}</span>
                        {m.source && <span className="text-muted-foreground ml-2">· {m.source}</span>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
