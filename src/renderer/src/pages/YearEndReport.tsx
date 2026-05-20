import { useState, useEffect, useRef } from 'react'
import { FileText, Printer, Download, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'

export default function YearEndReportPage() {
  const { format } = useCurrency()
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const generate = async () => {
    setLoading(true)
    try {
      const monthPrefix = `${year}-`
      const expenses = await window.api?.expenses?.getAll?.({}) || []
      const income = await window.api?.income?.getAll?.() || []
      const goals = await window.api?.goals?.getAll?.() || []
      const loans = await window.api?.loans?.getAll?.() || []
      const subscriptions = await window.api?.subscriptions?.getAll?.() || []
      const categories = await window.api?.categories?.getAll?.().catch(() => []) || []

      const yearExpenses = expenses.filter((e: any) => e.date?.startsWith(monthPrefix))
      const yearIncome = income.filter((i: any) => i.date?.startsWith(monthPrefix) || true)
      const totalIncome = yearIncome.reduce((s: number, i: any) => s + (i.amount || 0), 0)
      const totalExpenses = yearExpenses.reduce((s: number, e: any) => s + e.amount, 0)

      const byCategory: Record<string, number> = {}
      yearExpenses.forEach((e: any) => {
        const cat = e.category_name || 'Uncategorized'
        byCategory[cat] = (byCategory[cat] || 0) + e.amount
      })

      const topMerchants = yearExpenses.reduce((acc: Record<string, number>, e: any) => {
        const m = e.merchant || e.name
        acc[m] = (acc[m] || 0) + e.amount
        return acc
      }, {})

      setData({
        totalIncome,
        totalExpenses,
        netSavings: totalIncome - totalExpenses,
        expenseCount: yearExpenses.length,
        incomeCount: yearIncome.length,
        topCategories: Object.entries(byCategory).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5),
        topMerchants: Object.entries(topMerchants).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5),
        goalsProgress: goals.map((g: any) => ({ name: g.name, target: g.target_amount, current: g.current_amount })),
        subscriptions: subscriptions.filter((s: any) => s.active).map((s: any) => ({ name: s.name, amount: s.amount, frequency: s.frequency })),
        loans: loans.map((l: any) => ({ name: l.name, remaining: l.remaining_balance, monthly: l.monthly_payment })),
      })
    } catch { toast.error('Failed to generate report') }
    setLoading(false)
  }

  useEffect(() => { generate() }, [year])

  const handlePrint = () => {
    if (printRef.current) {
      const w = window.open('', '_blank')
      if (w) {
        w.document.write(`<html><head><title>Year-End Report ${year}</title><style>body{font-family:sans-serif;padding:40px;line-height:1.6}h1,h2{color:#111}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body>${printRef.current.innerHTML}</body></html>`)
        w.document.close()
        w.print()
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Year-End Report
          </h2>
          <p className="text-sm text-muted-foreground">Annual financial summary</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="number" value={year} onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())} className="w-24" />
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!data}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Generating report...</CardContent></Card>
      ) : data ? (
        <div ref={printRef} className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Total Income', value: format(data.totalIncome), color: 'text-primary' },
              { label: 'Total Expenses', value: format(data.totalExpenses), color: 'text-destructive' },
              { label: 'Net Savings', value: format(data.netSavings), color: data.netSavings >= 0 ? 'text-emerald-500' : 'text-destructive' },
              { label: 'Transactions', value: `${data.expenseCount} expenses · ${data.incomeCount} income`, color: 'text-foreground' },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Top Spending Categories</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.topCategories.map(([name, amount]: [string, number]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span className="font-medium">{format(amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Top Merchants</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.topMerchants.map(([name, amount]: [string, number]) => (
                <div key={name} className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span className="font-medium">{format(amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Goals Progress</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.goalsProgress.map((g: any) => (
                <div key={g.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{g.name}</span>
                    <span>{Math.round((g.current / g.target) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (g.current / g.target) * 100)}%` }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Active Subscriptions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.subscriptions.map((s: any) => (
                <div key={s.name} className="flex justify-between text-sm">
                  <span>{s.name} <span className="text-muted-foreground">({s.frequency})</span></span>
                  <span className="font-medium">{format(s.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
