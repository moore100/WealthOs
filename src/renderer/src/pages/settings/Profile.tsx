import { useState, useEffect } from 'react'
import { User, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { CURRENCIES } from '@/utils/formatCurrency'
import { COUNTRIES } from '@/utils/formatCurrency'
import { toast } from 'sonner'
import { useAppStore } from '@/store/appStore'

export default function ProfilePage() {
  const { settings, updateSettings } = useAppStore()
  const [form, setForm] = useState({
    name: '',
    email: '',
    currency: 'USD',
    country: 'US',
    monthly_income: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name || '',
        email: settings.email || '',
        currency: settings.currency || 'USD',
        country: settings.country || 'US',
        monthly_income: settings.monthly_income ? String(settings.monthly_income) : '',
      })
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings({ ...form, monthly_income: parseFloat(form.monthly_income) || 0 })
      toast.success('Profile saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const initials = form.name ? form.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : 'WO'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your personal information and preferences</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 text-xl">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{form.name || 'Your Name'}</p>
              <p className="text-sm text-muted-foreground">{form.email || 'your@email.com'}</p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email (optional)</Label>
              <Input type="email" placeholder="john@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Financial Settings</CardTitle>
          <CardDescription>Set your currency and income for calculations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={v => {
                const meta = CURRENCIES.find(c => c.code === v)
                setForm(f => ({ ...f, currency: v, currencySymbol: meta?.symbol ?? '$', locale: meta?.locale ?? 'en-US' }))
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.slice(0, 30).map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Monthly Income</Label>
            <Input type="number" placeholder="0.00" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Used for health score calculations and budget planning</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
