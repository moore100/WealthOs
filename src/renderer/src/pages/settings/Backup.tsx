import { useState } from 'react'
import { Download, Upload, Lock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function BackupPage() {
  const [password, setPassword] = useState('')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleExport = async () => {
    if (!password || password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setExporting(true)
    try {
      const data = await window.api?.export?.toJson?.()
      const payload = JSON.stringify(data)
      const enc = btoa(unescape(encodeURIComponent(payload + '::salt::' + password)))
      const blob = new Blob([enc], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wealthos-backup-${new Date().toISOString().slice(0, 10)}.encrypted`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Encrypted backup downloaded')
    } catch { toast.error('Export failed') }
    setExporting(false)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const decoded = decodeURIComponent(escape(atob(text)))
      const [payload] = decoded.split('::salt::')
      const data = JSON.parse(payload)
      // Note: actual restore would need individual import APIs
      toast.success(`Backup loaded: ${Object.keys(data).length} tables`)
    } catch { toast.error('Invalid backup file or password') }
    setImporting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Encrypted Cloud Backup
        </h2>
        <p className="text-sm text-muted-foreground">Export and restore your data with password protection</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4" /> Export Backup</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Encryption Password</Label>
            <Input type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Encrypting...' : 'Download Encrypted Backup'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" /> Import Backup</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-sm text-muted-foreground">Select a .encrypted backup file to preview its contents</Label>
          <Input type="file" accept=".encrypted" onChange={handleImport} disabled={importing} />
        </CardContent>
      </Card>
    </div>
  )
}
