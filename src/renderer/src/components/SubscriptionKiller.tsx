import { useState, useEffect } from 'react'
import { Scan, Loader2, Zap, Mail, Copy, CheckCircle, X, TrendingDown, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Detected {
  name: string
  merchant: string | null
  amount: number
  count: number
  frequency: string
  monthly_equivalent: number
  last_date: string
}

interface Props {
  open: boolean
  onClose: () => void
  onChanged?: () => void
}

export default function SubscriptionKiller({ open, onClose, onChanged }: Props) {
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [detected, setDetected] = useState<Detected[]>([])
  const [tracked, setTracked] = useState<any[]>([])
  const [totals, setTotals] = useState({ monthlyTracked: 0, monthlyDetected: 0, yearlyTracked: 0, yearlyDetected: 0 })
  const [emailFor, setEmailFor] = useState<any | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [draftingEmail, setDraftingEmail] = useState(false)

  const scan = async () => {
    setScanning(true)
    try {
      const result = await window.api?.subkiller?.scan()
      if (result?.ok) {
        setDetected(result.detected || [])
        setTracked(result.tracked || [])
        setTotals(result.totals)
        setScanned(true)
      } else toast.error('Scan failed')
    } catch (e: any) { toast.error(e?.message || 'Scan failed') }
    finally { setScanning(false) }
  }

  useEffect(() => { if (open && !scanned) scan() }, [open])

  const trackSubscription = async (d: Detected) => {
    const result = await window.api?.agent?.execute({
      type: 'add_subscription',
      name: d.merchant || d.name,
      amount: d.amount,
      frequency: d.frequency,
    })
    if (result?.ok) {
      toast.success(`Now tracking "${d.merchant || d.name}"`)
      scan(); onChanged?.()
    } else toast.error(result?.summary || 'Failed')
  }

  const cancelSubscription = async (sub: any) => {
    const result = await window.api?.agent?.execute({
      type: 'cancel_subscription',
      id: sub.id,
    })
    if (result?.ok) {
      toast.success(result.summary)
      scan(); onChanged?.()
    } else toast.error(result?.summary || 'Failed')
  }

  const draftCancelEmail = async (sub: any) => {
    setEmailFor(sub)
    setEmailSubject(''); setEmailBody('')
    setDraftingEmail(true)
    try {
      const result = await window.api?.subkiller?.draftCancelEmail({
        name: sub.name,
        amount: sub.amount,
        frequency: sub.frequency,
      })
      if (result?.ok) {
        setEmailSubject(result.subject || '')
        setEmailBody(result.body || '')
      } else toast.error(result?.error || 'Failed to draft email')
    } catch (e: any) { toast.error(e?.message) }
    finally { setDraftingEmail(false) }
  }

  const copyEmail = () => {
    const text = `Subject: ${emailSubject}\n\n${emailBody}`
    navigator.clipboard.writeText(text)
    toast.success('Email copied to clipboard')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={v => !v && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Subscription Killer
            </DialogTitle>
            <DialogDescription>
              Find recurring charges hiding in your expenses, track them, and cancel the ones you don't need.
            </DialogDescription>
          </DialogHeader>

          {scanning && (
            <div className="flex flex-col items-center gap-3 p-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">Scanning your last 6 months of expenses...</p>
            </div>
          )}

          {!scanning && scanned && (
            <ScrollArea className="flex-1 pr-3">
              <div className="space-y-4">
                {/* Totals */}
                <div className="grid grid-cols-2 gap-2">
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-[10px] text-muted-foreground uppercase">Tracked monthly</p>
                      <p className="text-lg font-bold">${totals.monthlyTracked.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">${totals.yearlyTracked.toFixed(0)}/yr</p>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="p-3">
                      <p className="text-[10px] text-amber-700 uppercase">Hidden / detected</p>
                      <p className="text-lg font-bold text-amber-700">${totals.monthlyDetected.toFixed(2)}</p>
                      <p className="text-[10px] text-amber-700">${totals.yearlyDetected.toFixed(0)}/yr</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Detected */}
                {detected.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-semibold">Recurring charges you're NOT tracking ({detected.length})</h3>
                    </div>
                    <div className="space-y-1.5">
                      {detected.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{d.merchant || d.name}</span>
                              <Badge variant="outline" className="text-[9px] h-4 px-1">{d.frequency}</Badge>
                              <Badge variant="outline" className="text-[9px] h-4 px-1">{d.count}x</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              ${d.amount} × {d.frequency} = ~${d.monthly_equivalent}/mo · last on {d.last_date}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => trackSubscription(d)} className="shrink-0 h-7 text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" /> Track
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tracked */}
                {tracked.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold">Active subscriptions ({tracked.length})</h3>
                    </div>
                    <div className="space-y-1.5">
                      {tracked.map(sub => (
                        <div key={sub.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{sub.name}</span>
                              <Badge variant="outline" className="text-[9px] h-4 px-1">{sub.frequency}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">${sub.amount}/{sub.frequency}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => draftCancelEmail(sub)} className="shrink-0 h-7 text-xs">
                            <Mail className="mr-1 h-3 w-3" /> Draft cancel email
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => cancelSubscription(sub)} className="shrink-0 h-7 text-xs">
                            <X className="mr-1 h-3 w-3" /> Cancel
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detected.length === 0 && tracked.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground">No recurring charges detected. Try adding more expenses first.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {!scanning && scanned && (
            <div className="border-t border-border pt-3 flex justify-between">
              <Button size="sm" variant="ghost" onClick={scan}>
                <Scan className="mr-1 h-3.5 w-3.5" /> Re-scan
              </Button>
              <Button size="sm" onClick={onClose}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Draft Dialog */}
      <Dialog open={!!emailFor} onOpenChange={v => !v && setEmailFor(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Cancellation Email for {emailFor?.name}
            </DialogTitle>
            <DialogDescription>Copy and send this from your email — AI drafted it for you.</DialogDescription>
          </DialogHeader>
          {draftingEmail ? (
            <div className="flex flex-col items-center gap-3 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Drafting...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Subject</p>
                <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Body</p>
                <Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={10} className="text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEmailFor(null)}>Close</Button>
                <Button onClick={copyEmail}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
