import { useState } from 'react'
import { Upload, Loader2, FileText, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

interface ParsedTx {
  date: string
  name: string
  amount: number
  merchant?: string
  category: string
  raw?: string
  _selected: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  onImported?: (count: number) => void
}

export default function StatementImporter({ open, onClose, onImported }: Props) {
  const [filePath, setFilePath] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [transactions, setTransactions] = useState<ParsedTx[]>([])
  const [truncated, setTruncated] = useState(false)

  const reset = () => {
    setFilePath(null); setTransactions([]); setTruncated(false); setParsing(false); setImporting(false)
  }

  const handleClose = () => { reset(); onClose() }

  const pickAndParse = async () => {
    const picked = await window.api?.importer?.pickFile()
    if (!picked || picked.canceled || !picked.path) return
    setFilePath(picked.path)
    setParsing(true)
    setTransactions([])
    try {
      const result = await window.api?.importer?.parseStatement(picked.path)
      if (!result?.ok) {
        toast.error(result?.error || 'Failed to parse')
        setFilePath(null)
        return
      }
      const txs = (result.transactions || []).map(t => ({ ...t, _selected: true }))
      setTransactions(txs)
      setTruncated(!!result.truncated)
      if (txs.length === 0) toast.warning('No transactions detected in this file')
      else toast.success(`Parsed ${txs.length} transactions`)
    } catch (e: any) {
      toast.error(e?.message || 'Parse failed')
    } finally { setParsing(false) }
  }

  const toggle = (idx: number) => {
    setTransactions(prev => prev.map((t, i) => i === idx ? { ...t, _selected: !t._selected } : t))
  }

  const toggleAll = (checked: boolean) => {
    setTransactions(prev => prev.map(t => ({ ...t, _selected: checked })))
  }

  const updateField = (idx: number, field: 'name' | 'amount' | 'category' | 'date', value: string) => {
    setTransactions(prev => prev.map((t, i) => i === idx ? { ...t, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : t))
  }

  const handleCommit = async () => {
    const selected = transactions.filter(t => t._selected)
    if (selected.length === 0) { toast.error('Nothing selected'); return }
    setImporting(true)
    try {
      const result = await window.api?.importer?.commit(selected.map(({ _selected, ...rest }) => rest))
      if (result?.ok) {
        toast.success(`Imported ${result.inserted} transactions`)
        onImported?.(result.inserted)
        handleClose()
      } else {
        toast.error('Import failed')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Import failed')
    } finally { setImporting(false) }
  }

  const selectedCount = transactions.filter(t => t._selected).length
  const totalSelected = transactions.filter(t => t._selected).reduce((s, t) => s + t.amount, 0)

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Import Bank Statement
          </DialogTitle>
          <DialogDescription>
            Drop a PDF or CSV bank statement. AI parses transactions, categorizes them, and you approve before importing.
          </DialogDescription>
        </DialogHeader>

        {!filePath && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-12">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Choose a PDF, CSV, or TXT bank statement</p>
            <Button onClick={pickAndParse} disabled={parsing}>
              {parsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Choose File
            </Button>
          </div>
        )}

        {filePath && parsing && (
          <div className="flex flex-col items-center justify-center gap-3 p-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Parsing with AI...</p>
            <p className="text-xs text-muted-foreground">{filePath.split(/[\\/]/).pop()}</p>
          </div>
        )}

        {filePath && !parsing && transactions.length > 0 && (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5">
              <div className="flex items-center gap-3 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{filePath.split(/[\\/]/).pop()}</span>
                <Badge variant="outline" className="text-[10px]">{transactions.length} found</Badge>
                {truncated && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600">
                    <AlertCircle className="h-3 w-3" /> Large file — partially parsed
                  </span>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={pickAndParse}>Re-parse</Button>
            </div>

            <div className="flex items-center gap-2 px-1">
              <Checkbox checked={selectedCount === transactions.length} onCheckedChange={(v) => toggleAll(!!v)} id="select-all" />
              <label htmlFor="select-all" className="text-xs font-medium cursor-pointer">
                Select all ({selectedCount}/{transactions.length})
              </label>
              <span className="ml-auto text-xs text-muted-foreground">
                Selected total: <span className="font-semibold text-destructive">${totalSelected.toFixed(2)}</span>
              </span>
            </div>

            <ScrollArea className="flex-1 rounded-lg border border-border">
              <div className="divide-y divide-border">
                {transactions.map((t, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 transition-colors ${t._selected ? 'bg-background' : 'bg-muted/20 opacity-60'}`}>
                    <Checkbox checked={t._selected} onCheckedChange={() => toggle(i)} />
                    <Input
                      type="date"
                      value={t.date}
                      onChange={e => updateField(i, 'date', e.target.value)}
                      className="h-7 w-32 text-xs"
                    />
                    <Input
                      value={t.name}
                      onChange={e => updateField(i, 'name', e.target.value)}
                      className="h-7 flex-1 text-xs"
                      placeholder="Description"
                    />
                    <Input
                      value={t.category}
                      onChange={e => updateField(i, 'category', e.target.value)}
                      className="h-7 w-36 text-xs"
                      placeholder="Category"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={t.amount}
                      onChange={e => updateField(i, 'amount', e.target.value)}
                      className="h-7 w-24 text-xs text-right font-medium"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCommit} disabled={importing || selectedCount === 0} className="gap-1.5">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Import {selectedCount} {selectedCount === 1 ? 'expense' : 'expenses'}
              </Button>
            </div>
          </>
        )}

        {filePath && !parsing && transactions.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <p className="text-sm font-medium">No transactions detected</p>
            <p className="text-xs text-muted-foreground">The AI couldn't find any debit transactions in this file. Try a different statement or check the file format.</p>
            <Button variant="outline" onClick={pickAndParse}>Try another file</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
