import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBusinessStore, type Business } from '@/store/businessStore'

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444']

export default function BusinessSettingsTab({ business, onUpdated }: { business: Business; onUpdated: (b: Business) => void }) {
  const navigate = useNavigate()
  const { refresh } = useBusinessStore()
  const [form, setForm] = useState({
    name: business.name,
    description: business.description || '',
    industry: business.industry || '',
    website: business.website || '',
    mission: business.mission || '',
    target_audience: business.target_audience || '',
    brand_color: business.brand_color || '#3b82f6',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await (window as any).api?.businesses?.update(business.id, form)
      if (res?.ok) {
        toast.success('Saved')
        onUpdated(res.business)
        await refresh()
      } else {
        toast.error(res?.error || 'Failed to save')
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${business.name}"? This hides it but keeps data.`)) return
    await (window as any).api?.businesses?.delete(business.id)
    await refresh()
    toast.success('Business archived')
    navigate('/businesses')
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Business Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Industry</Label>
              <Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Brand Color</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map(c => (
                <button
                  key={c} type="button"
                  className={`h-8 w-8 rounded-md border-2 ${form.brand_color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                  onClick={() => setForm(f => ({ ...f, brand_color: c }))}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <Label>Mission</Label>
            <Textarea rows={3} value={form.mission} onChange={e => setForm(f => ({ ...f, mission: e.target.value }))} />
          </div>
          <div>
            <Label>Target Audience</Label>
            <Textarea rows={2} value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="text-base text-destructive">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Archive Business</p>
              <p className="text-xs text-muted-foreground">Hides from list. Data is kept and can be restored.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-2 h-3 w-3" /> Archive
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
