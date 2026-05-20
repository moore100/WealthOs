import { useState, useEffect } from 'react'
import { Plus, Trash2, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { toast } from 'sonner'

const chartConfig = { score: { label: 'Mood Score', color: 'hsl(var(--primary))' } }

const MOODS = [
  { score: 1, emoji: '😰', label: 'Very Stressed' },
  { score: 2, emoji: '😟', label: 'Stressed' },
  { score: 3, emoji: '😐', label: 'Neutral' },
  { score: 4, emoji: '😊', label: 'Good' },
  { score: 5, emoji: '😄', label: 'Great' },
]

interface MoodEntry { id: number; date: string; score: number; note?: string }

export default function MoodPage() {
  const [entries, setEntries] = useState<MoodEntry[]>([])
  const [open, setOpen] = useState(false)
  const [selectedScore, setSelectedScore] = useState(3)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try { const data = await window.api?.mood?.getAll(); setEntries(data || []) }
    catch (e) { console.warn(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const avgScore = entries.length > 0 ? entries.reduce((s, e) => s + e.score, 0) / entries.length : 0
  const chartData = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-30).map(e => ({ date: e.date.slice(5), score: e.score }))

  const handleSubmit = async () => {
    try {
      await window.api?.mood?.log({ date, mood: selectedScore, note })
      toast.success('Mood logged'); setOpen(false); setNote(''); setSelectedScore(3); load()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (id: number) => {
    try { await window.api?.mood?.delete(id); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const avgMood = MOODS.find(m => m.score === Math.round(avgScore))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Financial Mood</h2>
          <p className="text-sm text-muted-foreground">
            {avgScore > 0 && <>Average: <span className="text-xl">{avgMood?.emoji}</span> {avgMood?.label} ({avgScore.toFixed(1)}/5)</>}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Log Mood
        </Button>
      </div>

      {entries.length > 1 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Mood Trend (Last 30 days)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-40">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} tickFormatter={v => MOODS.find(m => m.score === v)?.emoji || String(v)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={{ fill: 'var(--color-score)', r: 3 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No mood entries yet</p>
            <p className="text-sm text-muted-foreground">Track how your finances make you feel</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...entries].sort((a, b) => b.date.localeCompare(a.date)).map(e => {
            const mood = MOODS.find(m => m.score === e.score) || MOODS[2]
            return (
              <Card key={e.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{mood.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{mood.label}</p>
                        <span className="text-xs text-muted-foreground">{e.date}</span>
                      </div>
                      {e.note && <p className="text-xs text-muted-foreground mt-0.5">{e.note}</p>}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete Entry?</AlertDialogTitle><AlertDialogDescription>Delete mood entry for {e.date}?</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Financial Mood</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-3 block">How are you feeling about your finances?</Label>
              <div className="flex justify-between gap-2">
                {MOODS.map(m => (
                  <button
                    key={m.score}
                    onClick={() => setSelectedScore(m.score)}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-xl border p-3 transition-all ${selectedScore === m.score ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-[9px] text-center leading-tight">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Textarea placeholder="What's affecting your financial mood?" value={note} onChange={e => setNote(e.target.value)} className="h-20 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Log Mood</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
