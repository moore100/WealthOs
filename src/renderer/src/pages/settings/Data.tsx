import { useState } from 'react'
import { Download, Upload, Trash2, Database, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ExportModal from '@/components/ExportModal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function DataPage() {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const result = await window.api?.data?.export()
      if (result?.success) {
        toast.success(`Data exported to ${result.path}`)
      } else {
        toast.error('Export failed')
      }
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const result = await window.api?.data?.import()
      if (result?.success) {
        toast.success('Data imported successfully. Restart the app to see changes.')
      } else if (result?.cancelled) {
        toast.info('Import cancelled')
      } else {
        toast.error('Import failed')
      }
    } catch { toast.error('Import failed') }
    finally { setImporting(false) }
  }

  const handleClearAll = async () => {
    try {
      await window.api?.data?.clearAll()
      toast.success('All data cleared. Restart the app.')
    } catch { toast.error('Failed to clear data') }
  }

  const handleClearCategory = async (category: string) => {
    try {
      await window.api?.data?.clearCategory(category)
      toast.success(`${category} data cleared`)
    } catch { toast.error('Failed') }
  }

  const CATEGORIES = [
    { key: 'expenses', label: 'Expenses', desc: 'All expense records' },
    { key: 'income', label: 'Income', desc: 'All income sources' },
    { key: 'investments', label: 'Investments', desc: 'All investment records' },
    { key: 'loans', label: 'Loans', desc: 'All loan records' },
    { key: 'goals', label: 'Goals', desc: 'All savings goals' },
    { key: 'subscriptions', label: 'Subscriptions', desc: 'All subscriptions' },
    { key: 'habits', label: 'Bad Habits', desc: 'All habit records' },
    { key: 'mood', label: 'Mood Logs', desc: 'All mood entries' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Data Management</h2>
        <p className="text-sm text-muted-foreground">Export, import, and manage your financial data</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Backup & Restore</CardTitle>
          <CardDescription>Export your data as JSON or restore from a backup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={handleExport} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export All Data'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleImport} disabled={importing}>
              <Upload className="mr-2 h-4 w-4" />
              {importing ? 'Importing...' : 'Import Data'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setCsvOpen(true)}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Data is exported as a JSON file. Import will merge with existing data.
          </p>
          <ExportModal open={csvOpen} onClose={() => setCsvOpen(false)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Clear Data by Category</CardTitle>
          <CardDescription>Remove specific types of data while keeping others</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {CATEGORIES.map(cat => (
            <div key={cat.key} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear {cat.label}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {cat.label.toLowerCase()} data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleClearCategory(cat.key)} className="bg-destructive text-destructive-foreground">
                      Clear {cat.label}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions — proceed with caution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Clearing all data will permanently delete everything including settings and preferences.
            </AlertDescription>
          </Alert>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" /> Clear All Data & Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear ALL Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL your data including income, expenses, investments, loans, goals, settings, and everything else. <strong>This cannot be undone.</strong> Make sure to export a backup first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground">
                  Yes, Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
