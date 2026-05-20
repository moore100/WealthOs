import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Gift, Plus, Trash2, ShoppingBag, CheckCircle, Clock, Star } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { toast } from 'sonner'

interface WishItem {
  id: number
  name: string
  price: number
  priority: number
  category: string
  target_date: string
  savings_allocated: number
  purchased: number
  notes: string
  created_at: string
}

export default function WishlistPage() {
  const { format: fmt } = useCurrency()
  const [items, setItems] = useState<WishItem[]>([])
  const [purchasedItems, setPurchasedItems] = useState<WishItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    price: 0,
    priority: 3,
    category: 'general',
    target_date: '',
    savings_allocated: 0,
    notes: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const active = await window.api?.wishlist?.getAll?.()
      const bought = await window.api?.wishlist?.getPurchased?.()
      setItems(active || [])
      setPurchasedItems(bought || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const totalWishlistValue = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items])
  const totalAllocated = useMemo(() => items.reduce((s, i) => s + i.savings_allocated, 0), [items])
  const readyToBuy = useMemo(() => items.filter(i => i.savings_allocated >= i.price), [items])

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Name and price are required'); return }
    try {
      await window.api?.wishlist?.add?.(form)
      toast.success('Wishlist item added')
      setShowForm(false)
      setForm({ name: '', price: 0, priority: 3, category: 'general', target_date: '', savings_allocated: 0, notes: '' })
      load()
    } catch { toast.error('Failed to add item') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.wishlist?.delete?.(id); load() } catch { }
  }

  const handlePurchase = async (id: number) => {
    try {
      await window.api?.wishlist?.markPurchased?.(id)
      toast.success('Item marked as purchased!')
      load()
    } catch { toast.error('Failed to mark purchased') }
  }

  const priorityLabel = (p: number) => p <= 2 ? 'High' : p === 3 ? 'Medium' : 'Low'
  const priorityColor = (p: number) => p <= 2 ? 'text-rose-500' : p === 3 ? 'text-amber-500' : 'text-muted-foreground'

  if (loading) return <div className="text-sm text-muted-foreground">Loading wishlist...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Wishlist</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Track things you want to buy. Allocate savings from goals and see when you're ready to purchase. AI can calculate the impact on your budget.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{items.length}</p>
            <p className="text-[10px] text-muted-foreground">Items Saved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShoppingBag className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold">{fmt(totalWishlistValue)}</p>
            <p className="text-[10px] text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{readyToBuy.length}</p>
            <p className="text-[10px] text-muted-foreground">Ready to Buy</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Button */}
      <Button size="sm" onClick={() => setShowForm(!showForm)} variant="outline">
        <Plus className="h-4 w-4 mr-1" /> {showForm ? 'Cancel' : 'Add Item'}
      </Button>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Item Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input type="number" placeholder="Price" value={form.price || ''} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={String(form.priority)} onValueChange={v => setForm({ ...form, priority: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">High</SelectItem>
                  <SelectItem value="2">High-Med</SelectItem>
                  <SelectItem value="3">Medium</SelectItem>
                  <SelectItem value="4">Low-Med</SelectItem>
                  <SelectItem value="5">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" placeholder="Target Date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
            </div>
            <Input type="number" placeholder="Savings Already Allocated" value={form.savings_allocated || ''} onChange={e => setForm({ ...form, savings_allocated: Number(e.target.value) })} />
            <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button size="sm" onClick={handleSave} className="w-full">Save to Wishlist</Button>
          </CardContent>
        </Card>
      )}

      {/* Active Items */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Active Wishlist</h2>
        {items.map(item => {
          const pct = Math.min(100, (item.savings_allocated / Math.max(1, item.price)) * 100)
          const canBuy = item.savings_allocated >= item.price
          return (
            <Card key={item.id} className={canBuy ? 'border-green-500/30' : ''}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{item.name}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{item.category}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-medium', priorityColor(item.priority))}>
                      <Star className="h-3 w-3 inline mr-0.5" />
                      {priorityLabel(item.priority)}
                    </span>
                    <span className="text-sm font-bold">{fmt(item.price)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{fmt(item.savings_allocated)} saved</span>
                    <span className="text-muted-foreground">{fmt(item.price)} needed</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
                {item.target_date && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Target: {item.target_date}
                  </p>
                )}
                {canBuy && (
                  <Button size="sm" variant="default" className="w-full" onClick={() => handlePurchase(item.id)}>
                    <ShoppingBag className="h-4 w-4 mr-2" /> Ready to Buy — Purchase Now
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Your wishlist is empty. Add something you want to save for.</p>}
      </div>

      {/* Purchased Items */}
      {purchasedItems.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Purchased ({purchasedItems.length})</h2>
          {purchasedItems.map(item => (
            <Card key={item.id} className="opacity-60">
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <p className="text-sm">{item.name}</p>
                  <Badge variant="outline" className="text-[10px]">{fmt(item.price)}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
