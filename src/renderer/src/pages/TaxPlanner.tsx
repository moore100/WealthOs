import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, Plus, Trash2, FileText, AlertTriangle, CheckCircle } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'

interface TaxRecord {
  id: number
  tax_year: number
  total_income: number
  taxable_income: number
  deductions: number
  credits: number
  tax_paid: number
  estimated_tax_due: number
  filing_status: string
  notes: string
}

export default function TaxPlannerPage() {
  const { format: fmt } = useCurrency()
  const [records, setRecords] = useState<TaxRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<TaxRecord>>({
    tax_year: new Date().getFullYear(),
    total_income: 0,
    taxable_income: 0,
    deductions: 0,
    credits: 0,
    tax_paid: 0,
    filing_status: 'single',
    notes: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const data = await window.api?.tax?.getAll?.()
      setRecords(data || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const currentYear = new Date().getFullYear()
  const currentRecord = records.find(r => r.tax_year === currentYear)
  const estimatedRefund = currentRecord
    ? (currentRecord.tax_paid + currentRecord.credits) - currentRecord.estimated_tax_due
    : 0

  const handleSave = async () => {
    if (!form.tax_year) { toast.error('Tax year is required'); return }
    try {
      const estimatedTax = estimateTax(
        form.taxable_income || 0,
        form.deductions || 0,
        form.filing_status || 'single'
      )
      const payload = { ...form, estimated_tax_due: estimatedTax }
      await window.api?.tax?.add?.(payload)
      toast.success('Tax record saved')
      setShowForm(false)
      setForm({ tax_year: currentYear, total_income: 0, taxable_income: 0, deductions: 0, credits: 0, tax_paid: 0, filing_status: 'single', notes: '' })
      load()
    } catch { toast.error('Failed to save tax record') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.tax?.delete?.(id); load() } catch { }
  }

  function estimateTax(taxableIncome: number, deductions: number, status: string): number {
    const ti = Math.max(0, taxableIncome - deductions)
    // Simplified US federal tax brackets 2024
    if (status === 'single') {
      if (ti <= 11600) return ti * 0.10
      if (ti <= 47150) return 1160 + (ti - 11600) * 0.12
      if (ti <= 100525) return 5426 + (ti - 47150) * 0.22
      if (ti <= 191950) return 17168.50 + (ti - 100525) * 0.24
      if (ti <= 243725) return 39110.50 + (ti - 191950) * 0.32
      if (ti <= 609350) return 55678.50 + (ti - 243725) * 0.35
      return 183647.25 + (ti - 609350) * 0.37
    }
    // married_jointly simplified
    if (ti <= 23200) return ti * 0.10
    if (ti <= 94300) return 2320 + (ti - 23200) * 0.12
    if (ti <= 201050) return 10852 + (ti - 94300) * 0.22
    if (ti <= 383900) return 34337 + (ti - 201050) * 0.24
    if (ti <= 487450) return 78221 + (ti - 383900) * 0.32
    if (ti <= 731200) return 111357 + (ti - 487450) * 0.35
    return 196669.50 + (ti - 731200) * 0.37
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading tax records...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Tax Planner</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Estimate your tax liability, track deductions, and plan for refund or payment. AI can suggest deductions you might be missing.
      </p>

      {/* Current Year Summary */}
      {currentRecord ? (
        <Card className={estimatedRefund >= 0 ? 'border-green-500/30' : 'border-amber-500/30'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {estimatedRefund >= 0 ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
              {currentYear} Tax Estimate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Taxable Income</span>
              <span className="font-medium">{fmt(currentRecord.taxable_income)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Deductions</span>
              <span className="font-medium">{fmt(currentRecord.deductions)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Est. Tax Due</span>
              <span className="font-medium">{fmt(currentRecord.estimated_tax_due)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax Already Paid</span>
              <span className="font-medium">{fmt(currentRecord.tax_paid)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t font-bold">
              <span>{estimatedRefund >= 0 ? 'Estimated Refund' : 'Amount You Owe'}</span>
              <span className={estimatedRefund >= 0 ? 'text-green-600' : 'text-amber-600'}>
                {fmt(Math.abs(estimatedRefund))}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">No tax record for {currentYear}</p>
            <p className="text-xs text-muted-foreground">Add your income and deductions to get an estimate.</p>
          </CardContent>
        </Card>
      )}

      {/* Add Form */}
      <Button size="sm" onClick={() => setShowForm(!showForm)} variant="outline">
        <Plus className="h-4 w-4 mr-1" /> {showForm ? 'Cancel' : 'Add Tax Record'}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Tax Year" value={form.tax_year} onChange={e => setForm({ ...form, tax_year: Number(e.target.value) })} />
              <Select value={form.filing_status} onValueChange={v => setForm({ ...form, filing_status: v })}>
                <SelectTrigger><SelectValue placeholder="Filing Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married_jointly">Married Filing Jointly</SelectItem>
                  <SelectItem value="married_separately">Married Filing Separately</SelectItem>
                  <SelectItem value="head_household">Head of Household</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Total Income" value={form.total_income} onChange={e => setForm({ ...form, total_income: Number(e.target.value) })} />
              <Input type="number" placeholder="Taxable Income" value={form.taxable_income} onChange={e => setForm({ ...form, taxable_income: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Deductions" value={form.deductions} onChange={e => setForm({ ...form, deductions: Number(e.target.value) })} />
              <Input type="number" placeholder="Credits" value={form.credits} onChange={e => setForm({ ...form, credits: Number(e.target.value) })} />
              <Input type="number" placeholder="Tax Already Paid" value={form.tax_paid} onChange={e => setForm({ ...form, tax_paid: Number(e.target.value) })} />
            </div>
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button size="sm" onClick={handleSave} className="w-full">Save Tax Record</Button>
          </CardContent>
        </Card>
      )}

      {/* Records List */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">All Tax Records</h2>
        {records.map(r => {
          const refund = (r.tax_paid + r.credits) - r.estimated_tax_due
          return (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{r.tax_year} · {r.filing_status.replace('_', ' ')}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Income: {fmt(r.total_income)} · Deductions: {fmt(r.deductions)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={refund >= 0 ? 'default' : 'secondary'} className="text-[10px]">
                    {refund >= 0 ? 'Refund' : 'Owe'} {fmt(Math.abs(refund))}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {records.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No tax records yet.</p>}
      </div>
    </div>
  )
}
