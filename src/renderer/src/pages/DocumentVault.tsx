import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FolderOpen, Plus, Trash2, FileText, Receipt, Image, Shield, Tag, Search } from 'lucide-react'
import { toast } from 'sonner'

interface Document {
  id: number
  name: string
  type: string
  file_path: string
  tags: string
  related_entity: string
  related_id: number
  notes: string
  uploaded_at: string
}

export default function DocumentVaultPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({
    name: '',
    type: 'receipt',
    file_path: '',
    tags: '',
    related_entity: '',
    related_id: 0,
    notes: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const data = await window.api?.documents?.getAll?.()
      setDocs(data || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = docs.filter(d => {
    const matchesSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.tags || '').toLowerCase().includes(search.toLowerCase())
    const matchesType = filter === 'all' || d.type === filter
    return matchesSearch && matchesType
  })

  const handleSave = async () => {
    if (!form.name) { toast.error('Document name is required'); return }
    try {
      await window.api?.documents?.add?.(form)
      toast.success('Document added')
      setShowForm(false)
      setForm({ name: '', type: 'receipt', file_path: '', tags: '', related_entity: '', related_id: 0, notes: '' })
      load()
    } catch { toast.error('Failed to add document') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.documents?.delete?.(id); load() } catch { }
  }

  const iconMap: Record<string, any> = { receipt: Receipt, insurance: Shield, tax: FileText, photo: Image, other: FolderOpen }

  if (loading) return <div className="text-sm text-muted-foreground">Loading documents...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FolderOpen className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Document Vault</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Store and organize financial documents. Link them to expenses, goals, or tax records. AI can reference these when giving advice.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {['receipt', 'tax', 'insurance', 'other'].map(type => {
          const count = docs.filter(d => d.type === type).length
          const Icon = iconMap[type] || FolderOpen
          return (
            <Card key={type}>
              <CardContent className="p-3 text-center">
                <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{count}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{type}s</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="receipt">Receipt</SelectItem>
            <SelectItem value="tax">Tax</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
            <SelectItem value="photo">Photo</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowForm(!showForm)} variant="outline">
          <Plus className="h-4 w-4 mr-1" /> {showForm ? 'Cancel' : 'Add'}
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Document Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="tax">Tax</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="File Path (optional)" value={form.file_path} onChange={e => setForm({ ...form, file_path: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
              <Input placeholder="Related Entity (e.g., expense, goal)" value={form.related_entity} onChange={e => setForm({ ...form, related_entity: e.target.value })} />
            </div>
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button size="sm" onClick={handleSave} className="w-full">Save Document</Button>
          </CardContent>
        </Card>
      )}

      {/* Document List */}
      <div className="space-y-2">
        {filtered.map(d => {
          const Icon = iconMap[d.type] || FolderOpen
          return (
            <Card key={d.id}>
              <CardContent className="flex items-start gap-3 p-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{d.type}</Badge>
                    {d.tags && d.tags.split(',').map(t => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t.trim()}</Badge>
                    ))}
                  </div>
                  {d.notes && <p className="text-[10px] text-muted-foreground mt-1">{d.notes}</p>}
                  {d.file_path && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{d.file_path}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {docs.length === 0 ? 'No documents yet. Add your first one.' : 'No documents match your search.'}
          </p>
        )}
      </div>
    </div>
  )
}
