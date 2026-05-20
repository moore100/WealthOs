import { useState, useEffect } from 'react'
import { Globe, Plane, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { CURRENCIES } from '@/utils/formatCurrency'
import { useAppStore } from '@/store/appStore'

export default function MultiCurrencyPage() {
  const { updateSettings } = useAppStore()
  const [currency, setCurrency] = useState('USD')
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const [locale, setLocale] = useState('en-US')
  const [travelMode, setTravelMode] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const s = await window.api?.settings?.get?.()
        setCurrency(s?.currency || 'USD')
        setCurrencySymbol(s?.currencySymbol || '$')
        setLocale(s?.locale || 'en-US')
        setTravelMode(s?.travel_mode || false)
      } catch { /* ignore */ }
    }
    load()
  }, [])

  const handleCurrencyChange = (code: string) => {
    const meta = CURRENCIES.find(c => c.code === code)
    setCurrency(code)
    setCurrencySymbol(meta?.symbol ?? '$')
    setLocale(meta?.locale ?? 'en-US')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings({ currency, currencySymbol, locale, travel_mode: travelMode })
      toast.success('Currency settings saved')
    } catch { toast.error('Failed to save') }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Multi-Currency & Travel Mode
        </h2>
        <p className="text-sm text-muted-foreground">Set your base currency and travel preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Base Currency</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Plane className="h-4 w-4" /> Travel Mode</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Travel Mode</p>
              <p className="text-xs text-muted-foreground">Tag expenses as travel and show currency alerts</p>
            </div>
            <Switch checked={travelMode} onCheckedChange={setTravelMode} />
          </div>
          {travelMode && (
            <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">
              Travel mode is active. New expenses will be tagged as travel purchases.
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-1.5">
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}
