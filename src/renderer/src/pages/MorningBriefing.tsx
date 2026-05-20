import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Volume2, Clock, CalendarDays, TrendingUp, AlertTriangle, CreditCard, Dumbbell, Mic, Settings } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAppStore } from '@/store/appStore'
import { toast } from 'sonner'

export default function MorningBriefingPage() {
  const { format: fmt } = useCurrency()
  const navigate = useNavigate()
  const { settings } = useAppStore()
  const [enabled, setEnabled] = useState(true)
  const [time, setTime] = useState('08:00')
  const [playing, setPlaying] = useState(false)

  const voiceEnabled = settings.ai_voice_enabled || false
  const voiceId = settings.ai_voice_id || ''
  const elevenlabsKey = settings.elevenlabs_key || ''

  // Mock briefing content
  const briefing = {
    greeting: 'Good morning, Wahom.',
    checkingBalance: 847,
    upcomingBills: [
      { name: 'Netflix', amount: 15.99, due: 'Tomorrow' },
      { name: 'Rent', amount: 1200, due: 'In 3 days' },
    ],
    budgetStatus: { category: 'Dining Out', spent: 410, limit: 360, over: true },
    alerts: [
      { type: 'warning', message: 'You\'re $50 over your dining budget this week.' },
      { type: 'action', message: 'Your gym subscription — 0 visits in 3 weeks. Want me to draft the cancellation?' },
    ],
    win: 'You saved $120 more than last month. Keep it up!',
  }

  const playBriefing = async () => {
    if (!voiceEnabled) {
      toast.error('Voice is disabled. Enable it in AI Personality settings.')
      return
    }
    if (!elevenlabsKey) {
      toast.error('Add your ElevenLabs API key in AI Personality settings to hear the briefing.')
      return
    }
    setPlaying(true)
    try {
      const script = `${briefing.greeting} Your checking balance is ${fmt(briefing.checkingBalance)}. You have ${briefing.upcomingBills.length} upcoming bills. ${briefing.budgetStatus.over ? `You're over budget on ${briefing.budgetStatus.category}.` : ''} ${briefing.win}`
      const { audio } = await window.api?.ai?.speak(script, voiceId || undefined, elevenlabsKey)
      const audioEl = new Audio(audio)
      audioEl.onended = () => setPlaying(false)
      audioEl.onerror = () => { setPlaying(false); toast.error('Playback failed') }
      audioEl.play()
    } catch {
      setPlaying(false)
      toast.error('Voice synthesis failed. Check your ElevenLabs key.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Volume2 className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Morning Briefing</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Your personal CFO delivers a voice summary every morning. Customize what you hear and when.
      </p>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Daily at</span>
            </div>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Voice</span>
            </div>
            <div className="flex items-center gap-2">
              {voiceEnabled && voiceId ? (
                <Badge variant="outline" className="text-[10px]">Using AI Personality voice</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Not configured</Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={() => navigate('/ai-personality')}
              >
                <Settings className="h-3 w-3 mr-1" />
                Change
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Enabled</span>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Today's Briefing Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm font-medium">"{briefing.greeting}"</div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm">Checking: {fmt(briefing.checkingBalance)}</span>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Upcoming Bills</p>
              {briefing.upcomingBills.map(b => (
                <div key={b.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3 w-3 text-muted-foreground" />
                    <span>{b.name}</span>
                  </div>
                  <span>{fmt(b.amount)} <span className="text-xs text-muted-foreground">({b.due})</span></span>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Budget Status</p>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm">
                  {briefing.budgetStatus.category}: {fmt(briefing.budgetStatus.spent)} / {fmt(briefing.budgetStatus.limit)} — over by {fmt(briefing.budgetStatus.spent - briefing.budgetStatus.limit)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Alerts</p>
              {briefing.alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {a.type === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Dumbbell className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <span>{a.message}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">{briefing.win}</span>
            </div>
          </div>

          <Button className="w-full" onClick={playBriefing} disabled={playing}>
            <Volume2 className="h-4 w-4 mr-2" />
            {playing ? 'Playing...' : 'Play Briefing'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
