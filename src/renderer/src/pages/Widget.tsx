import { useState, useEffect } from 'react'
import { X, Plus, TrendingUp, TrendingDown, Wallet, Zap, Target } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface WidgetData {
  income: number
  expenses: number
  savings: number
  savingsRate: number
  upcoming: { name: string; amount: number; days: number }[]
  netWorth: number
}

export default function WidgetPage() {
  const { format } = useCurrency()
  const [data, setData] = useState<WidgetData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const summary = await window.api?.widget?.summary?.()
      setData(summary || null)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleClose = () => window.api?.widget?.close?.()
  const openMain = () => window.api?.window?.open?.()

  const income = data?.income ?? 0
  const expenses = data?.expenses ?? 0
  const savings = data?.savings ?? 0
  const savingsRate = data?.savingsRate ?? 0
  const netWorth = data?.netWorth ?? 0

  return (
    <div className="h-screen w-screen overflow-hidden bg-transparent flex items-start justify-center pt-0">
      <div className="w-[300px] rounded-2xl bg-card/95 backdrop-blur-md border border-border/50 shadow-2xl overflow-hidden">
        {/* Draggable header */}
        <div className="widget-drag flex items-center justify-between px-3 py-2 border-b border-border/30 cursor-move">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-muted-foreground">WealthOS Widget</span>
          </div>
          <button onClick={handleClose} className="widget-no-drag h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors">
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>

        <div className="p-3 space-y-3">
          {/* Net Worth */}
          <div className="text-center pb-2 border-b border-border/20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Net Worth</p>
            <p className={`text-lg font-bold ${netWorth >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
              {loading ? '—' : format(netWorth)}
            </p>
          </div>

          {/* Income / Expenses / Savings */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <TrendingUp className="h-3 w-3 text-primary" />
              </div>
              <p className="text-[10px] text-muted-foreground">Income</p>
              <p className="text-xs font-semibold">{loading ? '—' : format(income)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <TrendingDown className="h-3 w-3 text-destructive" />
              </div>
              <p className="text-[10px] text-muted-foreground">Spent</p>
              <p className="text-xs font-semibold">{loading ? '—' : format(expenses)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5 mb-0.5">
                <Wallet className="h-3 w-3 text-emerald-500" />
              </div>
              <p className="text-[10px] text-muted-foreground">Saved</p>
              <p className="text-xs font-semibold">{loading ? '—' : format(savings)}</p>
            </div>
          </div>

          {/* Savings Rate */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-2">
            <Target className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Savings Rate</span>
                <span className="font-semibold">{savingsRate}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Upcoming */}
          {data && data.upcoming.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Upcoming</p>
              {data.upcoming.slice(0, 3).map((u, i) => (
                <div key={i} className="flex items-center justify-between text-xs rounded-md bg-muted/20 px-2 py-1">
                  <span className="truncate">{u.name}</span>
                  <span className="text-destructive font-medium shrink-0">{format(u.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={openMain}
              className="flex items-center justify-center gap-1 rounded-lg bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Zap className="h-3 w-3" />
              Open App
            </button>
            <button
              onClick={() => window.api?.window?.navigate?.('/expenses')}
              className="flex items-center justify-center gap-1 rounded-lg bg-muted px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Expense
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
