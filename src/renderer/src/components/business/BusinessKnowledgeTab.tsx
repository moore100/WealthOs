import { useEffect, useState } from 'react'
import { Plus, Pin, Trash2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface KbEntry {
  id: number
  type: string
  title: string | null
  content: string
  tags: string | null
  pinned: number
  updated_at: string
}

const TYPES = ['note', 'mission', 'product', 'audience', 'revenue', 'event', 'lesson']

export default function BusinessKnowledgeTab({ businessId }: { businessId: number }) {
  const [entries, setEntries] = useState<KbEntry[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ type: 'note', title: '', content: '', tags: '' })

  const load = async () => {
    const data = await (window as any).api?.businesses?.kb?.list(businessId)
    setEntries(data || [])
  }

  useEffect(() => { load() }, [businessId])

  const handleAdd = async () => {
    if (!form.content.trim()) { toast.error('Content required'); return }
    const res = await (window as any).api?.businesses?.kb?.add(businessId, form)
    if (res?.ok) {
      toast.success('Knowledge added')
      setForm({ type: 'note', title: '', content: '', tags: '' })
      setAdding(false)
      load()
    }
  }

  const handleDelete = async (id: number) => {
    await (window as any).api?.businesses?.kb?.delete(id)
    load()
  }

  const handleTogglePin = async (entry: KbEntry) => {
    await (window as any).api?.businesses?.kb?.update(entry.id, { pinned: entry.pinned ? 0 : 1 })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Knowledge Base</h3>
          <p className="text-xs text-muted-foreground">Feed your AI team context about your business</p>
        </div>
        {!adding && <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-1 h-3 w-3" /> Add Entry</Button>}
      </div>

      {adding && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                className="px-3 py-2 text-sm rounded-md border bg-background"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <Input placeholder="Title (optional)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <Textarea
              rows={4}
              placeholder="What should your AI team know? e.g. 'Our launch generated $5k in week 1' or 'Customers love feature X but request Y'"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            />
            <Input placeholder="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 && !adding ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No knowledge entries yet</p>
            <p className="text-xs text-muted-foreground">Add notes about revenue, events, lessons, customer feedback — your AI uses this context</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <Card key={e.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{e.type}</span>
                      {e.title && <span className="font-medium text-sm">{e.title}</span>}
                      {e.pinned ? <Pin className="h-3 w-3 fill-current text-amber-500" /> : null}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{e.content}</p>
                    {e.tags && <p className="text-xs text-muted-foreground mt-2">#{e.tags.split(',').map(t => t.trim()).join(' #')}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTogglePin(e)}>
                      <Pin className={`h-3 w-3 ${e.pinned ? 'fill-current text-amber-500' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(e.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
