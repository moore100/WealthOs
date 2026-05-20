import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ExportModalProps {
  open: boolean
  onClose: () => void
}

const exportTypes = [
  { key: 'expenses', label: 'Expenses', description: 'All expense records' },
  { key: 'income', label: 'Income', description: 'Income sources' },
  { key: 'subscriptions', label: 'Subscriptions', description: 'Active subscriptions' },
  { key: 'networth', label: 'Net Worth', description: 'Net worth snapshots' },
]

function toCSV(rows: any[], headers: string[]): string {
  const escape = (v: any) => {
    const s = String(v ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  return [headers.map(escape).join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
}

export default function ExportModal({ open, onClose }: ExportModalProps) {
  const [exporting, setExporting] = useState<string | null>(null)

  const handleExport = async (type: string) => {
    setExporting(type)
    try {
      let data: any[] = []
      let headers: string[] = []
      let filename = ''

      switch (type) {
        case 'expenses': {
          data = await window.api?.expenses?.getAll?.({}) || []
          headers = ['id', 'name', 'amount', 'date', 'category', 'merchant', 'payment_method', 'notes']
          filename = 'wealthos_expenses.csv'
          break
        }
        case 'income': {
          data = await window.api?.income?.getAll?.() || []
          headers = ['id', 'name', 'amount', 'frequency', 'type', 'active']
          filename = 'wealthos_income.csv'
          break
        }
        case 'subscriptions': {
          data = await window.api?.subscriptions?.getAll?.() || []
          headers = ['id', 'name', 'amount', 'frequency', 'category', 'next_billing_date', 'active']
          filename = 'wealthos_subscriptions.csv'
          break
        }
        case 'networth': {
          data = await window.api?.netWorth?.getHistory?.() || []
          headers = ['id', 'date', 'total_assets', 'total_liabilities', 'net_worth']
          filename = 'wealthos_networth.csv'
          break
        }
      }

      if (data.length === 0) {
        toast.error(`No ${type} data to export`)
        return
      }

      const csv = toCSV(data, headers)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${type} exported to ${filename}`)
    } catch (e: any) {
      toast.error(e?.message || 'Export failed')
    } finally {
      setExporting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Export Data
          </DialogTitle>
          <DialogDescription>Download your financial data as CSV files</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {exportTypes.map(t => (
            <div key={t.key} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => handleExport(t.key)}
                disabled={exporting === t.key}
              >
                {exporting === t.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
