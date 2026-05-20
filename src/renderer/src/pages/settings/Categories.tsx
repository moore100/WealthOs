import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { Category } from '@/types'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#f43f5e', '#14b8a6', '#fb923c', '#a3e635']
const ICONS = ['🏠', '🍔', '🚗', '💊', '🎮', '👕', '✈️', '💰', '📚', '🎵', '🏋️', '🛒', '💡', '📱', '🐾']

const emptyForm = { name: '', icon: '🏠', color: '#6366f1', type: 'expense' }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const data = await window.api?.categories?.getAll(); setCategories(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async () => {
    if (!form.name) return toast.error('Category name required')
    try {
      if (editing) { await window.api?.categories?.update(editing.id, form); toast.success('Updated') }
      else { await window.api?.categories?.add(form); toast.success('Created') }
      setOpen(false); setEditing(null); setForm(emptyForm); load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.categories?.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed to delete — may be in use') }
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, icon: c.icon || '🏠', color: c.color || '#6366f1', type: c.type || 'expense' })
    setOpen(true)
  }

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Categories</h2>
          <p className="text-sm text-muted-foreground">{categories.length} categories total</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : (
        <>
          {expenseCategories.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Expense</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {expenseCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{c.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <div className="h-1.5 w-12 rounded-full mt-1" style={{ backgroundColor: c.color }} />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      {!c.is_default && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>Delete category "{c.name}"? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {c.is_default && <Badge variant="secondary" className="text-[10px] h-5">Default</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {incomeCategories.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Income</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {incomeCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{c.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <div className="h-1.5 w-12 rounded-full mt-1" style={{ backgroundColor: c.color }} />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      {!c.is_default && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>Delete "{c.name}"?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(c.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Category name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map(ic => (
                  <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))} className={`text-xl p-1.5 rounded-lg border transition-all ${form.icon === ic ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(clr => (
                  <button key={clr} onClick={() => setForm(f => ({ ...f, color: clr }))} className={`h-7 w-7 rounded-full border-2 transition-all ${form.color === clr ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: clr }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
