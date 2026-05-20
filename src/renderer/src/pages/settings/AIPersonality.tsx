import { useState, useEffect, useRef } from 'react'
import { Bot, Save, Mic, MicOff, Volume2, VolumeX, Sparkles, User, TextSelect, Loader2, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { useAppStore } from '@/store/appStore'
import { Badge } from '@/components/ui/badge'

const AVATAR_COLORS = [
  { bg: 'bg-emerald-500', text: 'text-white' },
  { bg: 'bg-blue-500', text: 'text-white' },
  { bg: 'bg-violet-500', text: 'text-white' },
  { bg: 'bg-rose-500', text: 'text-white' },
  { bg: 'bg-amber-500', text: 'text-white' },
  { bg: 'bg-cyan-500', text: 'text-white' },
  { bg: 'bg-pink-500', text: 'text-white' },
  { bg: 'bg-orange-500', text: 'text-white' },
]

const AI_PERSONALITIES = [
  { id: 'professional', name: 'Professional Advisor', desc: 'Formal, precise, data-driven financial analyst' },
  { id: 'friendly', name: 'Friendly Coach', desc: 'Warm, encouraging, supportive mentor style' },
  { id: 'witty', name: 'Witty Companion', desc: 'Humorous, playful, uses light jokes and emojis' },
  { id: 'strict', name: 'Strict Disciplinarian', desc: 'Direct, no-nonsense, holds you accountable' },
  { id: 'zen', name: 'Zen Master', desc: 'Calm, philosophical, mindful approach to money' },
]

export default function AIPersonalityPage() {
  const { settings, updateSettings } = useAppStore()
  const [form, setForm] = useState({
    ai_name: 'WealthOS AI',
    ai_gender: 'neutral',
    ai_avatar: 'bg-emerald-500',
    ai_personality: 'friendly',
    ai_instructions: '',
    elevenlabs_key: '',
    ai_voice_enabled: false,
    ai_voice_mode: 'text' as 'text' | 'voice',
    ai_voice_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [voices, setVoices] = useState<{ id: string; name: string; gender: string; preview?: string }[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (settings) {
      setForm({
        ai_name: settings.ai_name || 'WealthOS AI',
        ai_gender: settings.ai_gender || 'neutral',
        ai_avatar: settings.ai_avatar || 'bg-emerald-500',
        ai_personality: settings.ai_personality || 'friendly',
        ai_instructions: settings.ai_instructions || '',
        elevenlabs_key: settings.elevenlabs_key || '',
        ai_voice_enabled: settings.ai_voice_enabled || false,
        ai_voice_mode: settings.ai_voice_mode || 'text',
        ai_voice_id: settings.ai_voice_id || '',
      })
    }
  }, [settings])

  const fetchVoices = async () => {
    if (!form.elevenlabs_key) { toast.error('Enter ElevenLabs API key first'); return }
    setLoadingVoices(true)
    try {
      const list = await window.api?.ai?.getVoices(form.elevenlabs_key)
      setVoices(list || [])
    } catch (e: any) {
      toast.error(e.message || 'Failed to fetch voices')
    } finally { setLoadingVoices(false) }
  }

  const playPreview = async (voice: { id: string; preview?: string }) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setPlayingVoice(voice.id)

    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything!",
      "I told my wife she was drawing her eyebrows too high. She looked surprised!",
      "Why did the scarecrow win an award? He was outstanding in his field!",
      "I'm reading a book on anti-gravity. It's impossible to put down!",
      "Why don't skeletons fight each other? They don't have the guts!",
      "What do you call fake spaghetti? An impasta!",
      "Why did the math book look so sad? Because it had too many problems!",
    ]
    const joke = jokes[Math.floor(Math.random() * jokes.length)]

    try {
      const { audio } = await window.api?.ai?.speak(joke, voice.id, form.elevenlabs_key)
      const audioEl = new Audio(audio)
      audioRef.current = audioEl
      audioEl.onended = () => setPlayingVoice(null)
      audioEl.onerror = () => setPlayingVoice(null)
      audioEl.play()
    } catch {
      // Fallback to static preview if speak fails
      if (voice.preview) {
        const audio = new Audio(voice.preview)
        audioRef.current = audio
        audio.onended = () => setPlayingVoice(null)
        audio.onerror = () => setPlayingVoice(null)
        audio.play()
      } else {
        setPlayingVoice(null)
      }
    }
  }

  const filteredVoices = voices.filter(v => {
    if (form.ai_gender === 'neutral') return true
    return v.gender.toLowerCase() === form.ai_gender || v.gender === 'unknown'
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings({ ...form })
      toast.success('AI personality saved')
    } catch {
      toast.error('Failed to save')
    } finally { setSaving(false) }
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Personality
        </h2>
        <p className="text-sm text-muted-foreground">Customize your AI assistant's identity and behavior</p>
      </div>

      {/* Identity Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Identity
          </CardTitle>
          <CardDescription>Name, avatar, and gender of your AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className={`${form.ai_avatar} text-white text-xl font-bold`}>
                {form.ai_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <Label>AI Name</Label>
                <Input
                  placeholder="e.g. Finley"
                  value={form.ai_name}
                  onChange={e => setForm(f => ({ ...f, ai_name: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.ai_gender} onValueChange={v => setForm(f => ({ ...f, ai_gender: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Avatar Color</Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setForm(f => ({ ...f, ai_avatar: c.bg }))}
                    className={`h-8 w-8 rounded-full ${c.bg} transition-all ${form.ai_avatar === c.bg ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personality Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Personality & Behavior
          </CardTitle>
          <CardDescription>How your AI speaks and thinks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Personality Preset</Label>
            <div className="grid gap-2">
              {AI_PERSONALITIES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setForm(f => ({ ...f, ai_personality: p.id }))}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${form.ai_personality === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                >
                  <div className={`h-3 w-3 rounded-full ${form.ai_personality === p.id ? 'bg-primary' : 'bg-muted'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${form.ai_personality === p.id ? 'text-primary' : ''}`}>{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Custom Instructions</Label>
            <p className="text-xs text-muted-foreground">Tell your AI how to behave, what to focus on, or any rules it should follow</p>
            <Textarea
              placeholder="e.g. Always greet me by name. Use emojis sparingly. Prioritize debt reduction advice. ..."
              value={form.ai_instructions}
              onChange={e => setForm(f => ({ ...f, ai_instructions: e.target.value }))}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Voice Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-primary" />
            Voice & Speech
          </CardTitle>
          <CardDescription>Enable voice replies and listening</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Voice Features</p>
              <p className="text-xs text-muted-foreground">AI speaks responses and listens to your voice</p>
            </div>
            <Switch
              checked={form.ai_voice_enabled}
              onCheckedChange={v => setForm(f => ({ ...f, ai_voice_enabled: v }))}
            />
          </div>

          {form.ai_voice_enabled && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setForm(f => ({ ...f, ai_voice_mode: 'text' }))}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${form.ai_voice_mode === 'text' ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <TextSelect className={`h-5 w-5 ${form.ai_voice_mode === 'text' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${form.ai_voice_mode === 'text' ? 'text-primary' : ''}`}>Text Only</span>
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, ai_voice_mode: 'voice' }))}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${form.ai_voice_mode === 'voice' ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <Volume2 className={`h-5 w-5 ${form.ai_voice_mode === 'voice' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${form.ai_voice_mode === 'voice' ? 'text-primary' : ''}`}>Voice Replies</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <Label>ElevenLabs API Key</Label>
                <p className="text-xs text-muted-foreground">Required for AI voice replies. Get yours at elevenlabs.io</p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="sk_..."
                    value={form.elevenlabs_key}
                    onChange={e => setForm(f => ({ ...f, elevenlabs_key: e.target.value }))}
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={fetchVoices} disabled={loadingVoices}>
                    {loadingVoices ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Load Voices'}
                  </Button>
                </div>
              </div>

              {/* Voice Picker */}
              {voices.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Select Voice ({filteredVoices.length} available)</Label>
                  <p className="text-[11px] text-muted-foreground">
                    {form.ai_gender === 'neutral' ? 'Showing all voices' : `Filtered by ${form.ai_gender} gender`}
                  </p>
                  <div className="grid gap-1.5 max-h-48 overflow-y-auto">
                    {filteredVoices.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setForm(f => ({ ...f, ai_voice_id: v.id }))}
                        className={`flex items-center gap-2 rounded-lg border-2 p-2 text-left transition-all ${form.ai_voice_id === v.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                      >
                        <div className={`h-2.5 w-2.5 rounded-full ${form.ai_voice_id === v.id ? 'bg-primary' : 'bg-muted'}`} />
                        <span className="flex-1 text-sm">{v.name}</span>
                        <Badge variant="outline" className="text-[10px] h-5">{v.gender}</Badge>
                        {v.preview && (
                          <button
                            onClick={e => { e.stopPropagation(); playPreview(v) }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted hover:bg-primary/10 transition-colors"
                          >
                            {playingVoice === v.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </button>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Personality'}
        </Button>
      </div>
    </div>
  )
}
