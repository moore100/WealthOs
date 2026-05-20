import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Users, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import type { PersonOwed } from '@/types'

const emptyForm = { name: '', phone: '', amount: '', direction: 'i_owe', description: '', due_date: '' }

export default function PeoplePage() {
  const { format } = useCurrency()
  const [people, setPeople] = useState<PersonOwed[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PersonOwed | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const data = await window.api?.people?.getAll(); setPeople(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const iOwe = people.filter(p => p.direction === 'i_owe').reduce((s, p) => s + p.amount, 0)
  const owedToMe = people.filter(p => p.direction === 'they_owe').reduce((s, p) => s + p.amount, 0)

  const handleSubmit = async () => {
    if (!form.name || !form.amount) return toast.error('Name and amount required')
    const payload = { ...form, amount: parseFloat(form.amount) }
    try {
      if (editing) { await window.api?.people?.update(editing.id, payload); toast.success('Updated') }
      else { await window.api?.people?.add(payload); toast.success('Added') }
      setOpen(false); setEditing(null); setForm(emptyForm); load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.people?.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const handleSettle = async (id: number) => {
    try { await window.api?.people?.markPaid(id); toast.success('Marked as settled'); load() }
    catch { toast.error('Failed') }
  }

  const openEdit = (p: PersonOwed) => {
    setEditing(p)
    setForm({ name: p.name, phone: p.phone || '', amount: String(p.amount), direction: p.direction, description: p.description || '', due_date: p.due_date || '' })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">People & IOUs</h2>
          <p className="text-sm text-muted-foreground">
            You owe: <span className="text-destructive font-semibold">{format(iOwe)}</span>
            {' · '}Owed to you: <span className="text-green-500 font-semibold">{format(owedToMe)}</span>
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Person
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : people.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No people tracked</p>
            <p className="text-sm text-muted-foreground">Track who owes you and who you owe</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map(p => (
                <TableRow key={p.id} className={p.paid ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-1.5 text-sm font-medium ${p.direction === 'i_owe' ? 'text-destructive' : 'text-green-500'}`}>
                      {p.direction === 'i_owe' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                      {p.direction === 'i_owe' ? 'I owe' : 'Owes me'}
                    </div>
                  </TableCell>
                  <TableCell className={`font-semibold ${p.direction === 'i_owe' ? 'text-destructive' : 'text-green-500'}`}>{format(p.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.description || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.due_date || '—'}</TableCell>
                  <TableCell><Badge variant={p.paid ? 'secondary' : 'outline'}>{p.paid ? 'Settled' : 'Pending'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!p.paid && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:text-green-500" onClick={() => handleSettle(p.id)}>
                          <span className="text-xs">✓</span>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>Delete record for "{p.name}"?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Person' : 'Add Person'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="Person's name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Direction</Label>
                <Select value={form.direction} onValueChange={v => setForm(f => ({ ...f, direction: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="i_owe">I owe them</SelectItem>
                    <SelectItem value="they_owe">They owe me</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date (optional)</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Input placeholder="e.g. Dinner, Rent split" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
