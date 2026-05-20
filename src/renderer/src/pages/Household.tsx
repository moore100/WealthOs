import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Users, Plus, Trash2, User, Receipt } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface Member {
  id: string
  name: string
}

interface SharedExpense {
  id: string
  description: string
  amount: number
  paidBy: string
  date: string
  members: string[]
}

const STORAGE_KEY = 'wealthos-household'

function loadData(): { members: Member[]; expenses: SharedExpense[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { members: [], expenses: [] }
}

function saveData(data: { members: Member[]; expenses: SharedExpense[] }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export default function HouseholdPage() {
  const { format: fmt } = useCurrency()
  const [members, setMembers] = useState<Member[]>([])
  const [expenses, setExpenses] = useState<SharedExpense[]>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newExpenseDesc, setNewExpenseDesc] = useState('')
  const [newExpenseAmount, setNewExpenseAmount] = useState('')
  const [newExpensePaidBy, setNewExpensePaidBy] = useState('')

  useEffect(() => {
    const data = loadData()
    setMembers(data.members)
    setExpenses(data.expenses)
  }, [])

  useEffect(() => {
    saveData({ members, expenses })
  }, [members, expenses])

  const addMember = () => {
    if (!newMemberName.trim()) return
    setMembers(prev => [...prev, { id: Date.now().toString(), name: newMemberName.trim() }])
    setNewMemberName('')
  }

  const removeMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id))
    setExpenses(prev => prev.filter(e => e.paidBy !== id && e.members.includes(id)))
  }

  const addExpense = () => {
    const amount = parseFloat(newExpenseAmount)
    if (!newExpenseDesc.trim() || !amount || !newExpensePaidBy) return
    const memberIds = members.map(m => m.id)
    setExpenses(prev => [...prev, {
      id: Date.now().toString(),
      description: newExpenseDesc.trim(),
      amount,
      paidBy: newExpensePaidBy,
      date: new Date().toISOString().slice(0, 10),
      members: memberIds,
    }])
    setNewExpenseDesc('')
    setNewExpenseAmount('')
    setNewExpensePaidBy('')
  }

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const balances = members.map(m => {
    const paid = expenses.filter(e => e.paidBy === m.id).reduce((s, e) => s + e.amount, 0)
    const owed = expenses.filter(e => e.members.includes(m.id)).reduce((s, e) => s + e.amount / e.members.length, 0)
    return { ...m, paid, owed, net: paid - owed }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Household</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage shared expenses and split costs equally among household members.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Members</CardTitle>
            <CardDescription>Add people who share expenses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Name"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addMember()}
              />
              <Button size="sm" onClick={addMember}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{m.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeMember(m.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              {members.length === 0 && <p className="text-xs text-muted-foreground">No members yet</p>}
            </div>
          </CardContent>
        </Card>

        {/* Add Expense */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Add Shared Expense</CardTitle>
            <CardDescription>Split equally among all members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Description (e.g. Groceries)" value={newExpenseDesc} onChange={e => setNewExpenseDesc(e.target.value)} />
            <Input placeholder="Amount" type="number" value={newExpenseAmount} onChange={e => setNewExpenseAmount(e.target.value)} />
            <select
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={newExpensePaidBy}
              onChange={e => setNewExpensePaidBy(e.target.value)}
            >
              <option value="">Paid by...</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <Button size="sm" className="w-full" onClick={addExpense} disabled={!newExpenseDesc || !newExpenseAmount || !newExpensePaidBy}>
              <Receipt className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Balances */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Balances</CardTitle>
          <CardDescription>Who owes whom</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {balances.map(b => (
            <div key={b.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{b.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">Paid: {fmt(b.paid)}</span>
                <span className="text-muted-foreground">Share: {fmt(b.owed)}</span>
                <Badge variant={b.net >= 0 ? 'default' : 'destructive'} className="text-[10px]">
                  {b.net >= 0 ? '+' : ''}{fmt(b.net)}
                </Badge>
              </div>
            </div>
          ))}
          {members.length === 0 && <p className="text-xs text-muted-foreground">Add members to see balances</p>}
        </CardContent>
      </Card>

      {/* Expense History */}
      {expenses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Expense History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expenses.slice().reverse().map(e => {
              const payer = members.find(m => m.id === e.paidBy)
              return (
                <div key={e.id} className="flex items-center justify-between rounded-md border p-2">
                  <div className="text-sm">{e.description}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{payer?.name || 'Unknown'}</span>
                    <Badge variant="secondary" className="text-[10px]">{fmt(e.amount)}</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteExpense(e.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
