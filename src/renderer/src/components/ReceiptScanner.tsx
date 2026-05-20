import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, Image as ImageIcon, Sparkles, X } from 'lucide-react'
import Tesseract from 'tesseract.js'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

interface Receipt {
  name: string
  amount: number
  date: string
  merchant: string | null
  category: string
  items: string[]
  confidence: string
}

interface Props {
  open: boolean
  onClose: () => void
  onImported?: () => void
}

export default function ReceiptScanner({ open, onClose, onImported }: Props) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState<string>('')
  const [scanning, setScanning] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setImageDataUrl(null); setOcrText(''); setReceipt(null)
    setOcrProgress(0); setOcrStatus(''); setError(null)
    setScanning(false); setParsing(false); setImporting(false)
  }

  const handleClose = () => { reset(); onClose() }

  const runOCR = useCallback(async (imageSource: string) => {
    setScanning(true); setError(null); setOcrProgress(0); setOcrText(''); setReceipt(null)
    try {
      const result = await Tesseract.recognize(imageSource, 'eng', {
        logger: (m: any) => {
          setOcrStatus(m.status || '')
          if (typeof m.progress === 'number') setOcrProgress(Math.round(m.progress * 100))
        },
      })
      const text = result.data.text || ''
      setOcrText(text)
      if (!text.trim()) {
        setError('OCR found no text. Try a clearer photo.')
        return
      }
      // Auto-parse with AI
      setParsing(true)
      const parseResult = await window.api?.importer?.parseReceipt(text)
      if (parseResult?.ok && parseResult.receipt) {
        setReceipt(parseResult.receipt)
      } else {
        setError(parseResult?.error || 'Could not extract receipt details')
      }
    } catch (e: any) {
      setError(e?.message || 'OCR failed')
    } finally {
      setScanning(false); setParsing(false)
    }
  }, [])

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setImageDataUrl(dataUrl)
      await runOCR(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const onPaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || [])
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) { await handleFile(file); return }
      }
    }
  }

  const handleImport = async () => {
    if (!receipt) return
    setImporting(true)
    try {
      const result = await window.api?.agent?.execute({
        type: 'add_expense',
        name: receipt.name,
        amount: receipt.amount,
        date: receipt.date,
        category: receipt.category,
        merchant: receipt.merchant,
        notes: receipt.items.length > 0 ? `Items: ${receipt.items.join(', ')}` : undefined,
      })
      if (result?.ok) {
        toast.success(result.summary || 'Receipt imported as expense')
        onImported?.()
        handleClose()
      } else {
        toast.error(result?.summary || 'Import failed')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to import')
    } finally { setImporting(false) }
  }

  const updateReceipt = (field: keyof Receipt, value: any) => {
    if (!receipt) return
    setReceipt({ ...receipt, [field]: field === 'amount' ? parseFloat(value) || 0 : value })
  }

  const confidenceBadge = receipt?.confidence === 'high' ? 'bg-green-500/10 text-green-600' :
    receipt?.confidence === 'medium' ? 'bg-amber-500/10 text-amber-600' :
    'bg-destructive/10 text-destructive'

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onPaste={onPaste}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Scan Receipt
          </DialogTitle>
          <DialogDescription>
            Drop an image, paste from clipboard (Ctrl+V), or browse. OCR runs locally on your machine.
          </DialogDescription>
        </DialogHeader>

        {!imageDataUrl && (
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-12 transition-colors hover:border-primary/40"
          >
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag &amp; drop a receipt photo, paste, or browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Choose Image
            </Button>
            <p className="text-[10px] text-muted-foreground">Supports JPG, PNG, WEBP — runs Tesseract OCR locally</p>
          </div>
        )}

        {imageDataUrl && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto">
            {/* Left: Image preview */}
            <div className="space-y-2">
              <div className="relative rounded-lg border border-border overflow-hidden bg-muted">
                <img src={imageDataUrl} alt="Receipt" className="w-full h-auto max-h-[400px] object-contain" />
                <button
                  onClick={() => { setImageDataUrl(null); reset() }}
                  className="absolute top-1 right-1 rounded-md bg-background/80 p-1 hover:bg-background"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {(scanning || parsing) && (
                <div className="space-y-1.5 rounded-lg bg-muted/40 p-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span className="font-medium">
                      {scanning ? `OCR: ${ocrStatus || 'processing'}...` : 'Parsing with AI...'}
                    </span>
                  </div>
                  {scanning && <Progress value={ocrProgress} className="h-1.5" />}
                </div>
              )}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {ocrText && !scanning && (
                <details className="rounded-lg border border-border">
                  <summary className="cursor-pointer px-2.5 py-1.5 text-xs font-medium">Raw OCR text ({ocrText.length} chars)</summary>
                  <Textarea value={ocrText} onChange={e => setOcrText(e.target.value)} rows={6} className="border-0 text-[11px] font-mono" />
                </details>
              )}
            </div>

            {/* Right: Parsed details */}
            <div className="space-y-2">
              {receipt ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Parsed Receipt</h3>
                    <Badge className={confidenceBadge}>{receipt.confidence} confidence</Badge>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input value={receipt.name} onChange={e => updateReceipt('name', e.target.value)} className="h-8 text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={receipt.amount}
                        onChange={e => updateReceipt('amount', e.target.value)}
                        className="h-8 text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={receipt.date} onChange={e => updateReceipt('date', e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Merchant</Label>
                      <Input value={receipt.merchant || ''} onChange={e => updateReceipt('merchant', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Category</Label>
                      <Input value={receipt.category} onChange={e => updateReceipt('category', e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>

                  {receipt.items.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs">Items detected</Label>
                      <ul className="space-y-0.5 rounded-md bg-muted/40 p-2 text-[11px]">
                        {receipt.items.map((it, i) => <li key={i} className="truncate">• {it}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleImport} disabled={importing}>
                      {importing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />}
                      Save as Expense
                    </Button>
                  </div>
                </>
              ) : !scanning && !parsing && !error ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
                  <p className="text-xs text-muted-foreground">Drop an image to begin</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
