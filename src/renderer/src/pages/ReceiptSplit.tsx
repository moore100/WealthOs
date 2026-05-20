import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Receipt, Plus, Trash2, User, Split, Calculator } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface SplitItem {
  id: string
  name: string
  amount: number
  person: string
}

export default function ReceiptSplitPage() {
  const { format: fmt } = useCurrency()
  const [items, setItems] = useState<SplitItem[]>([
    { id: '1', name: 'Salmon', amount: 28, person: 'Sarah' },
    { id: '2', name: 'Burger', amount: 22, person: 'You' },
    { id: '3', name: 'Fries (shared)', amount: 8, person: 'Split' },
    { id: '4', name: 'Drinks x2', amount: 14, person: 'Split' },
  ])
  const [taxRate, setTaxRate] = useState(8.5)
  const [tipRate, setTipRate] = useState(18)

  const people = ['You', 'Sarah', 'Mike', 'Split']

  const subtotal = items.reduce((s, i) => s + i.amount, 0)
  const tax = subtotal * (taxRate / 100)
  const tip = subtotal * (tipRate / 100)
  const total = subtotal + tax + tip

  const splits = people.map(person => {
    const personItems = items.filter(i => i.person === person)
    const personSub = personItems.reduce((s, i) => s + i.amount, 0)
    const splitShare = items
      .filter(i => i.person === 'Split')
      .reduce((s, i) => s + i.amount, 0) / (people.length - 1) // exclude 'Split'
    const rawTotal = person === 'Split' ? 0 : personSub + splitShare
    const shareTax = rawTotal * (taxRate / 100)
    const shareTip = rawTotal * (tipRate / 100)
    return {
      person,
      items: personItems,
      subtotal: rawTotal,
      tax: shareTax,
      tip: shareTip,
      total: rawTotal + shareTax + shareTip,
    }
  }).filter(s => s.person !== 'Split' && s.total > 0)

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', amount: 0, person: 'You' }])
  }

  const updateItem = (id: string, field: keyof SplitItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Receipt className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Smart Receipt Split</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        AI reads the receipt and suggests fair splits based on who ordered what. Adjust as needed.
      </p>

      {/* Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Receipt Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <Input
                placeholder="Item"
                value={item.name}
                onChange={e => updateItem(item.id, 'name', e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="$"
                value={item.amount || ''}
                onChange={e => updateItem(item.id, 'amount', Number(e.target.value))}
                className="w-20"
              />
              <select
                value={item.person}
                onChange={e => updateItem(item.id, 'person', e.target.value)}
                className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm"
              >
                {people.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>

          <div className="flex gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Tax %</span>
              <Input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="w-16 h-8 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Tip %</span>
              <Input type="number" value={tipRate} onChange={e => setTipRate(Number(e.target.value))} className="w-16 h-8 text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Split Summary */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Split className="h-4 w-4" /> Fair Split
        </h2>
        {splits.map(s => (
          <Card key={s.person}>
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{s.person}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.items.length} item{s.items.length !== 1 ? 's' : ''} + share
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{fmt(s.total)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {fmt(s.subtotal)} + {fmt(s.tax)} tax + {fmt(s.tip)} tip
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total */}
      <Card className="bg-primary/5">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium">Total Receipt</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{fmt(total)}</p>
            <p className="text-[10px] text-muted-foreground">
              {fmt(subtotal)} subtotal + {fmt(tax)} tax + {fmt(tip)} tip
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
