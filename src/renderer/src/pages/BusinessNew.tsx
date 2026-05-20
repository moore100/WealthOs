import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBusinessStore } from '@/store/businessStore'

const INDUSTRIES = ['E-commerce', 'SaaS', 'Restaurant', 'Retail', 'Consulting', 'Education', 'Healthcare', 'Finance', 'Real Estate', 'Manufacturing', 'Media', 'Other']
const COLORS = ['#3b82f6', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444']

export default function BusinessNewPage() {
  const navigate = useNavigate()
  const { refresh } = useBusinessStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    industry: '',
    website: '',
    mission: '',
    target_audience: '',
    brand_color: COLORS[0],
    logo_base64: '',
  })

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be < 5MB'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setLogoPreview(base64)
      setForm(f => ({ ...f, logo_base64: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Business name is required'); return }
    setSaving(true)
    try {
      const res = await (window as any).api?.businesses?.create(form)
      if (res?.ok) {
        toast.success(`"${form.name}" created`)
        await refresh()
        navigate(`/businesses/${res.id}`)
      } else {
        toast.error(res?.error || 'Failed to create')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/businesses')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Create New Business</h2>
          <p className="text-sm text-muted-foreground">Set up your business profile</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo upload */}
          <div className="flex items-center gap-4">
            <div
              className="h-20 w-20 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0 overflow-hidden cursor-pointer hover:opacity-80"
              style={{ background: form.brand_color }}
              onClick={() => fileInputRef.current?.click()}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="logo" className="h-full w-full object-cover" />
              ) : form.name ? form.name.slice(0, 2).toUpperCase() : <Building2 className="h-8 w-8" />}
            </div>
            <div>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-3 w-3" /> Upload Logo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onLogoChange} />
            </div>
          </div>

          <div>
            <Label htmlFor="name">Business Name *</Label>
            <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Inc." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="industry">Industry</Label>
              <select
                id="industry"
                className="w-full mt-1 px-3 py-2 text-sm rounded-md border bg-background"
                value={form.industry}
                onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
              >
                <option value="">Select...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
            </div>
          </div>

          <div>
            <Label>Brand Color</Label>
            <div className="flex gap-2 mt-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`h-8 w-8 rounded-md border-2 ${form.brand_color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ background: c }}
                  onClick={() => setForm(f => ({ ...f, brand_color: c }))}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Your Business</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="description">Short Description</Label>
            <Textarea id="description" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="One sentence about what you do" />
          </div>
          <div>
            <Label htmlFor="mission">Mission</Label>
            <Textarea id="mission" rows={3} value={form.mission} onChange={e => setForm(f => ({ ...f, mission: e.target.value }))} placeholder="What problem do you solve and why does it matter?" />
          </div>
          <div>
            <Label htmlFor="audience">Target Audience</Label>
            <Textarea id="audience" rows={2} value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))} placeholder="Who are your customers? (demographics, needs, behaviors)" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate('/businesses')}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving || !form.name.trim()}>
          {saving ? 'Creating...' : 'Create Business'}
        </Button>
      </div>
    </div>
  )
}
