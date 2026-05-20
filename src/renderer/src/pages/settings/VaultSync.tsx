import { useState, useEffect } from 'react'
import { Shield, Lock, Download, Upload, RefreshCw, Loader2, Eye, EyeOff, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function VaultSyncPage() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [info, setInfo] = useState<{ lastBackup: string | null; lastRestore: string | null }>({ lastBackup: null, lastRestore: null })
  const [loadingInfo, setLoadingInfo] = useState(true)

  useEffect(() => {
    loadInfo()
  }, [])

  const loadInfo = async () => {
    setLoadingInfo(true)
    try {
      const res = await window.api?.vault?.info()
      if (res?.ok) {
        setInfo({ lastBackup: res.lastBackup || null, lastRestore: res.lastRestore || null })
      }
    } catch { /* ignore */ }
    finally { setLoadingInfo(false) }
  }

  const handleExport = async () => {
    if (!password || password.length < 6) return toast.error('Enter a password (min 6 characters)')
    setExporting(true)
    try {
      const result = await window.api?.vault?.export(password)
      if (result?.ok) {
        toast.success(`Vault exported to ${result.path}`)
        loadInfo()
      } else if (result?.cancelled) {
        // silently ignore
      } else {
        toast.error(result?.error || 'Export failed')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Export failed')
    } finally { setExporting(false) }
  }

  const handleImport = async () => {
    if (!password || password.length < 6) return toast.error('Enter a password (min 6 characters)')
    setImporting(true)
    try {
      const result = await window.api?.vault?.import(password)
      if (result?.ok) {
        toast.success('Vault restored successfully. Restart the app to load the restored database.')
        loadInfo()
      } else if (result?.cancelled) {
        // silently ignore
      } else {
        toast.error(result?.error || 'Import failed')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Import failed')
    } finally { setImporting(false) }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never'
    try {
      const d = new Date(iso)
      return d.toLocaleString()
    } catch { return iso }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Encrypted Vault Sync
        </h2>
        <p className="text-sm text-muted-foreground">AES-256 encrypted database backups that you control</p>
      </div>

      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Your database is encrypted locally with AES-256-GCM using a password you choose. The file never leaves your computer unless you move it yourself.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Vault Password</CardTitle>
          <CardDescription>Use the same password for export and import. This is NOT stored anywhere.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Export Vault
            </CardTitle>
            <CardDescription>Encrypt and save your database to a file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleExport} disabled={exporting || !password || password.length < 6} className="w-full">
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {exporting ? 'Encrypting...' : 'Export Encrypted Vault'}
            </Button>
            <p className="text-xs text-muted-foreground">Produces a <code className="font-mono">.wealth</code> file you can store on a USB drive or cloud folder.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Import Vault
            </CardTitle>
            <CardDescription>Restore from an encrypted backup file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleImport} disabled={importing || !password || password.length < 6} variant="outline" className="w-full">
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {importing ? 'Decrypting...' : 'Import Encrypted Vault'}
            </Button>
            <p className="text-xs text-muted-foreground">Your current database will be backed up before restoring. You must restart the app after import.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary" />
            Vault History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingInfo ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last export</span>
                <span className="font-medium">{formatDate(info.lastBackup)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last restore</span>
                <span className="font-medium">{formatDate(info.lastRestore)}</span>
              </div>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={loadInfo} disabled={loadingInfo}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loadingInfo ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
