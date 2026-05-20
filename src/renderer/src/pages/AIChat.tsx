import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send, User, Trash2, Loader2, Target, Bell, CheckCircle, Sparkles, Mic, MicOff,
  Volume2, VolumeX, Settings, Wand2, Play, Pause, MessageSquare, X, UserCircle,
  ChevronRight, Cog, Radio, BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { ChatMessage } from '@/types'
import { useAppStore } from '@/store/appStore'
import { useAIChatStore } from '@/store/aiChatStore'
import { Plus, Copy } from 'lucide-react'

type AgentActionType =
  | 'add_expense' | 'delete_expense'
  | 'add_income'
  | 'add_subscription' | 'cancel_subscription'
  | 'update_category_budget'
  | 'transfer_to_goal'
  | 'log_loan_payment'
  | 'create_goal' | 'create_reminder' | 'snooze_reminder'
  | 'add_kb_entry'

interface AIAction {
  type: AgentActionType
  [key: string]: any
}

const ACTION_LABELS: Record<AgentActionType, string> = {
  add_expense: 'Log expense',
  delete_expense: 'Delete expense',
  add_income: 'Add income source',
  add_subscription: 'Track subscription',
  cancel_subscription: 'Cancel subscription',
  update_category_budget: 'Update budget',
  transfer_to_goal: 'Transfer to goal',
  log_loan_payment: 'Log loan payment',
  create_goal: 'Create savings goal',
  create_reminder: 'Set reminder',
  snooze_reminder: 'Snooze reminder',
  add_kb_entry: 'Add to knowledge base',
}

const describeAction = (a: AIAction): string => {
  switch (a.type) {
    case 'add_expense': return `${a.name} — $${a.amount}${a.category ? ` (${a.category})` : ''}`
    case 'delete_expense': return `Expense #${a.id}`
    case 'add_income': return `${a.name} — $${a.amount}/${a.frequency || 'monthly'}`
    case 'add_subscription': return `${a.name} — $${a.amount}/${a.frequency || 'monthly'}`
    case 'cancel_subscription': return `${a.name || `#${a.id}`}`
    case 'update_category_budget': return `${a.category} → $${a.monthly_budget}/mo`
    case 'transfer_to_goal': return `$${a.amount} → ${a.goal_name || `goal #${a.goal_id}`}`
    case 'log_loan_payment': return `$${a.amount} → ${a.loan_name || `loan #${a.loan_id}`}`
    case 'create_goal': return `${a.name} — target $${a.target_amount}`
    case 'create_reminder': return `${a.title} @ ${a.scheduledAt}`
    case 'snooze_reminder': return `#${a.id} → ${a.scheduledAt}`
    case 'add_kb_entry': return a.content
    default: return JSON.stringify(a)
  }
}

interface AIPersonality {
  name: string
  avatar: string
  gender: string
  personality: string
  instructions: string
  voiceEnabled: boolean
  voiceMode: 'text' | 'voice'
  elevenlabsKey: string
  voiceId?: string
}

interface ElevenVoice {
  id: string
  name: string
  gender: string
  preview?: string
}

const SUGGESTED = [
  'How am I doing financially this month?',
  'What can I do to increase my savings rate?',
  'Analyze my biggest spending categories',
  'Am I on track to meet my savings goals?',
  'What subscriptions should I consider cancelling?',
]

const PERSONALITY_LABELS: Record<string, string> = {
  professional: 'Professional Advisor',
  friendly: 'Friendly Coach',
  witty: 'Witty Companion',
  strict: 'Strict Disciplinarian',
  zen: 'Zen Master',
}

const AVATAR_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500',
  'bg-cyan-500', 'bg-pink-500', 'bg-orange-500',
]

const AI_PERSONALITIES = [
  { id: 'professional', name: 'Professional Advisor', desc: 'Formal, precise, data-driven financial analyst' },
  { id: 'friendly', name: 'Friendly Coach', desc: 'Warm, encouraging, supportive mentor style' },
  { id: 'witty', name: 'Witty Companion', desc: 'Humorous, playful, uses light jokes and emojis' },
  { id: 'strict', name: 'Strict Disciplinarian', desc: 'Direct, no-nonsense, holds you accountable' },
  { id: 'zen', name: 'Zen Master', desc: 'Calm, philosophical, mindful approach to money' },
]

/* ─── Audio Wave Visualizer ─────────────────────────────────────────────── */
function AudioWaveVisualizer({ active, color = 'hsl(var(--primary))' }: { active: boolean; color?: string }) {
  return (
    <div className="flex items-end justify-center gap-[3px] h-12">
      {Array.from({ length: 24 }).map((_, i) => {
        const delay = i * 0.08
        const duration = 0.4 + Math.random() * 0.4
        return (
          <div
            key={i}
            className="w-[3px] rounded-full transition-all"
            style={{
              backgroundColor: color,
              height: active ? '100%' : '12%',
              animation: active ? `audioWave ${duration}s ease-in-out ${delay}s infinite alternate` : 'none',
              opacity: active ? 0.9 : 0.3,
            }}
          />
        )
      })}
      <style>{`
        @keyframes audioWave {
          0% { height: 12%; opacity: 0.4; }
          50% { height: 100%; opacity: 1; }
          100% { height: 20%; opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

/* ─── Voice Mode Overlay ──────────────────────────────────────────────── */
function VoiceModeOverlay({
  open, onClose, aiPersonality, onSend, isLoading, isSpeaking,
}: {
  open: boolean
  onClose: () => void
  aiPersonality: AIPersonality
  onSend: (text: string) => void
  isLoading: boolean
  isSpeaking: boolean
}) {
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const [isListening, setIsListening] = useState(false)
  const [aiSpeakingLocal, setAiSpeakingLocal] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [liveCaption, setLiveCaption] = useState('')
  const [greeted, setGreeted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasGreetedRef = useRef(false)
  const prevSpeakingRef = useRef(false)

  // MediaRecorder + silence detection refs
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const silenceCheckRef = useRef<number | null>(null)
  // Web Speech API for LIVE interim captions while user speaks
  const speechRecRef = useRef<any>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const silenceStartRef = useRef<number | null>(null)
  const isStoppingRef = useRef(false)

  const greetingText = `Hi! I'm ${aiPersonality.name}. How can I help you today?`

  useEffect(() => {
    if (!open) {
      cleanupRecording()
      setMicPermission('prompt')
      setIsListening(false)
      setAiSpeakingLocal(false)
      setTranscript('')
      setLiveCaption('')
      setGreeted(false)
      hasGreetedRef.current = false
      prevSpeakingRef.current = false
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      return
    }

    // AI greets when overlay opens
    if (!hasGreetedRef.current && aiPersonality.voiceEnabled && aiPersonality.voiceMode === 'voice') {
      hasGreetedRef.current = true
      speakGreeting()
    } else if (!hasGreetedRef.current) {
      hasGreetedRef.current = true
      setGreeted(true)
    }
  }, [open])

  useEffect(() => {
    if (
      greeted &&
      micPermission === 'granted' &&
      !isListening &&
      !aiSpeakingLocal &&
      !isSpeaking &&
      !isLoading &&
      !isStoppingRef.current
    ) {
      startListening()
    }
  }, [greeted, aiSpeakingLocal, isSpeaking, isLoading, micPermission])

  // Track when parent-speaking transitions false → auto-restart
  useEffect(() => {
    if (
      prevSpeakingRef.current &&
      !isSpeaking &&
      !isLoading &&
      micPermission === 'granted' &&
      !isListening &&
      !aiSpeakingLocal &&
      !isStoppingRef.current
    ) {
      startListening()
    }
    prevSpeakingRef.current = isSpeaking
  }, [isSpeaking, isLoading, micPermission])

  const speakGreeting = async () => {
    if (!aiPersonality.elevenlabsKey) { setGreeted(true); return }
    try {
      setAiSpeakingLocal(true)
      const { audio } = await window.api?.ai?.speak(greetingText, aiPersonality.voiceId || undefined, aiPersonality.elevenlabsKey)
      const audioEl = new Audio(audio)
      audioRef.current = audioEl
      audioEl.onended = () => { setAiSpeakingLocal(false); setGreeted(true) }
      audioEl.onerror = () => { setAiSpeakingLocal(false); setGreeted(true) }
      audioEl.play()
    } catch {
      setAiSpeakingLocal(false)
      setGreeted(true)
    }
  }

  const cleanupRecording = () => {
    if (silenceCheckRef.current) {
      cancelAnimationFrame(silenceCheckRef.current)
      silenceCheckRef.current = null
    }
    if (speechRecRef.current) {
      try { speechRecRef.current.onend = null; speechRecRef.current.onresult = null; speechRecRef.current.onerror = null; speechRecRef.current.stop() } catch {}
      speechRecRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close() } catch {}
      audioContextRef.current = null
    }
    if (analyserRef.current) { analyserRef.current = null }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch {}
      mediaRecorderRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    recordedChunksRef.current = []
    silenceStartRef.current = null
    isStoppingRef.current = false
  }

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setMicPermission('granted')
    } catch (e: any) {
      console.error('[VoiceMode] Mic permission request failed:', e?.name, e?.message, e)
      // NotAllowedError = user denied; NotFoundError = no device; SecurityError = insecure context
      const reason = e?.name === 'NotAllowedError'
        ? 'Permission denied. Allow microphone access in Windows Settings → Privacy → Microphone.'
        : e?.name === 'NotFoundError'
          ? 'No microphone found. Plug one in and try again.'
          : e?.name === 'NotReadableError'
            ? 'Microphone is in use by another app. Close it and retry.'
            : (e?.message || 'Failed to access microphone')
      toast.error(reason)
      setMicPermission('denied')
    }
  }

  // Start Web Speech API for live interim captions (best-effort, no-op if unsupported)
  const startLiveCaptions = () => {
    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SR) {
        console.warn('[VoiceMode] SpeechRecognition not available — live captions disabled')
        return
      }
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'
      rec.onresult = (e: any) => {
        let interim = ''
        let final = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const txt = e.results[i][0].transcript
          if (e.results[i].isFinal) final += txt
          else interim += txt
        }
        setLiveCaption((final + ' ' + interim).trim())
      }
      rec.onerror = (e: any) => {
        console.warn('[VoiceMode] SpeechRecognition error:', e?.error)
      }
      rec.onend = () => {
        // restart if still listening (continuous mode can drop unexpectedly)
        if (speechRecRef.current === rec && mediaRecorderRef.current?.state === 'recording') {
          try { rec.start() } catch {}
        }
      }
      speechRecRef.current = rec
      rec.start()
    } catch (e) {
      console.warn('[VoiceMode] Failed to start live captions:', e)
    }
  }

  const startListening = async () => {
    if (isStoppingRef.current || mediaRecorderRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      // Set up audio context + analyser for silence detection
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      recordedChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        isStoppingRef.current = false
        setIsListening(false)
        cleanupRecording()

        const blob = new Blob(recordedChunksRef.current, { type: mimeType })
        recordedChunksRef.current = []

        if (blob.size < 1000) {
          // Too short — probably just silence, restart listening
          setTimeout(() => {
            if (open && micPermission === 'granted') startListening()
          }, 500)
          return
        }

        // Transcribe via Whisper
        setTranscript('Transcribing...')
        try {
          const reader = new FileReader()
          reader.readAsDataURL(blob)
          reader.onloadend = async () => {
            const base64 = reader.result as string
            try {
              const { text } = await window.api?.ai?.transcribe(base64)
              if (text && text.trim()) {
                setTranscript(text)
                onSend(text.trim())
              } else {
                setTranscript('')
                // No speech detected, restart
                setTimeout(() => {
                  if (open && micPermission === 'granted') startListening()
                }, 500)
              }
            } catch (e: any) {
              toast.error(e.message || 'Transcription failed')
              setTranscript('')
            }
          }
        } catch (e: any) {
          toast.error(e.message || 'Failed to process audio')
          setTranscript('')
        }
      }

      recorder.onerror = () => {
        isStoppingRef.current = false
        setIsListening(false)
        cleanupRecording()
        toast.error('Recording error. Please try again.')
      }

      recorder.start(100) // collect chunks every 100ms
      setIsListening(true)
      setLiveCaption('')
      // Kick off Web Speech API for live interim captions (parallel, best-effort)
      startLiveCaptions()

      // Silence detection loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const checkSilence = () => {
        if (!analyserRef.current || !mediaRecorderRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)

        // Calculate average volume
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
        const average = sum / dataArray.length

        const SILENCE_THRESHOLD = 15 // volume level below this = silence
        const SILENCE_DURATION = 2000  // 2 seconds

        const now = Date.now()
        if (average < SILENCE_THRESHOLD) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = now
          } else if (now - silenceStartRef.current >= SILENCE_DURATION && !isStoppingRef.current) {
            isStoppingRef.current = true
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop()
            }
            return
          }
        } else {
          silenceStartRef.current = null
        }

        silenceCheckRef.current = requestAnimationFrame(checkSilence)
      }
      silenceCheckRef.current = requestAnimationFrame(checkSilence)

    } catch (e: any) {
      console.error('[VoiceMode] startListening failed:', e?.name, e?.message, e)
      const msg = e?.name === 'NotAllowedError'
        ? 'Microphone blocked. Allow access in Windows Settings → Privacy → Microphone.'
        : e?.name === 'NotReadableError'
          ? 'Microphone is in use by another app.'
          : e?.name === 'NotFoundError'
            ? 'No microphone device found.'
            : `Mic error: ${e?.message || 'unknown'}`
      toast.error(msg)
      setIsListening(false)
      setMicPermission('denied')
      cleanupRecording()
    }
  }

  const stopListening = () => {
    isStoppingRef.current = true
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    } else {
      cleanupRecording()
      setIsListening(false)
    }
  }

  if (!open) return null

  const statusText = aiSpeakingLocal || isSpeaking
    ? 'Speaking...'
    : isLoading
      ? 'Thinking...'
      : isListening
        ? 'Listening...'
        : greeted
          ? 'Ready'
          : 'Connecting...'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-primary/10 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* AI Avatar */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <Avatar className="h-20 w-20 ring-4 ring-primary/20">
          <AvatarFallback className={`${aiPersonality.avatar} text-white text-2xl font-bold`}>
            {aiPersonality.name.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="text-lg font-bold">{aiPersonality.name}</p>
          <p className="text-sm text-muted-foreground">{statusText}</p>
        </div>
      </div>

      {/* Audio Waves */}
      <div className="mb-8 w-64">
        <AudioWaveVisualizer active={aiSpeakingLocal || isListening} />
      </div>

      {/* Live caption (while user is speaking) */}
      {isListening && (
        <div className="mb-4 w-full max-w-2xl px-6">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 px-6 py-4 text-center min-h-[70px] flex items-center justify-center">
            {liveCaption ? (
              <p className="text-base leading-relaxed text-foreground">
                {liveCaption}
                <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground">Listening... start speaking</p>
            )}
          </div>
        </div>
      )}

      {/* Transcript (after Whisper finalizes) */}
      {transcript && !isListening && (
        <div className="mb-6 max-w-md rounded-xl bg-muted px-6 py-3 text-center">
          <p className="text-sm text-muted-foreground">{transcript}</p>
        </div>
      )}

      {/* Mic permission prompt */}
      {micPermission === 'prompt' && (
        <div className="mb-6 max-w-sm rounded-xl border border-primary/30 bg-primary/10 p-6 text-center">
          <Mic className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-primary">Microphone Access Required</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {aiPersonality.name} needs microphone access to hear you speak.
          </p>
          <Button size="sm" className="mt-4 gap-2" onClick={requestMic}>
            <Mic className="h-3.5 w-3.5" />
            Allow Microphone
          </Button>
        </div>
      )}

      {/* Mic permission denied */}
      {micPermission === 'denied' && (
        <div className="mb-6 max-w-sm rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center">
          <MicOff className="mx-auto mb-2 h-6 w-6 text-destructive" />
          <p className="text-sm font-medium text-destructive">Microphone access denied</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Please enable microphone access in your browser settings, then try again.
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setMicPermission('prompt')}>
            Try Again
          </Button>
        </div>
      )}

      {/* Mic button - only show after permission granted */}
      {micPermission === 'granted' && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
              isListening
                ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30 animate-pulse'
                : 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105'
            }`}
          >
            {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </button>
          <p className="text-xs text-muted-foreground">
            {isListening ? 'Tap to stop' : 'Tap to speak'}
          </p>
        </div>
      )}

      {/* Hint text */}
      <p className="absolute bottom-6 text-xs text-muted-foreground">
        {aiPersonality.voiceEnabled && aiPersonality.voiceMode === 'voice'
          ? `${aiPersonality.name} will speak responses aloud`
          : 'Voice replies are disabled. Enable them in AI Personality settings.'}
      </p>
    </div>
  )
}

/* ─── Rich Text Renderer ───────────────────────────────────────────────── */
function RichText({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: JSX.Element[] = []
  let key = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { elements.push(<div key={key++} className="h-2" />); continue }

    if (trimmed.startsWith('### ')) {
      elements.push(<h4 key={key++} className="mt-3 mb-1 text-sm font-bold text-primary">{trimmed.slice(4)}</h4>)
      continue
    }
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={key++} className="mt-4 mb-2 text-base font-bold text-primary">{trimmed.slice(3)}</h3>)
      continue
    }
    if (trimmed.startsWith('# ')) {
      elements.push(<h2 key={key++} className="mt-4 mb-2 text-lg font-bold text-primary">{trimmed.slice(2)}</h2>)
      continue
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2)
      elements.push(
        <div key={key++} className="flex gap-2 my-1">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span className="text-sm">{renderInline(content)}</span>
        </div>
      )
      continue
    }

    const numMatch = trimmed.match(/^(\d+)\.\s(.+)$/)
    if (numMatch) {
      elements.push(
        <div key={key++} className="flex gap-2 my-1">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{numMatch[1]}</span>
          <span className="text-sm">{renderInline(numMatch[2])}</span>
        </div>
      )
      continue
    }

    elements.push(<p key={key++} className="text-sm my-1 leading-relaxed">{renderInline(trimmed)}</p>)
  }

  return <>{elements}</>
}

function renderInline(text: string): JSX.Element {
  const parts: JSX.Element[] = []
  let remaining = text
  let key = 0

  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, render: (m: string) => <strong key={key++} className="font-bold text-foreground">{m}</strong> },
    { regex: /\*(.+?)\*/g, render: (m: string) => <em key={key++} className="italic text-muted-foreground">{m}</em> },
    { regex: /`(.+?)`/g, render: (m: string) => <code key={key++} className="rounded bg-primary/10 px-1 py-0.5 text-xs font-mono text-primary">{m}</code> },
    { regex: /\[(.+?)\]\((.+?)\)/g, render: (m: string, url: string) => <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{m}</a> },
  ]

  const highlightTerms = ['budget', 'savings', 'debt', 'income', 'expense', 'goal', 'investment', 'loan', 'emergency fund', 'retirement', 'interest', 'rate', 'profit', 'loss', 'warning', 'alert', 'critical', 'urgent']

  while (remaining) {
    let bestMatch: { index: number; length: number; replacement: JSX.Element } | null = null

    for (const p of patterns) {
      p.regex.lastIndex = 0
      const match = p.regex.exec(remaining)
      if (match && (!bestMatch || match.index < bestMatch.index)) {
        const groups = match.slice(1)
        bestMatch = { index: match.index, length: match[0].length, replacement: p.render(groups[0], groups[1]) }
      }
    }

    for (const term of highlightTerms) {
      const regex = new RegExp(`\\b(${term})\\b`, 'i')
      const match = regex.exec(remaining)
      if (match && (!bestMatch || match.index < bestMatch.index)) {
        bestMatch = { index: match.index, length: match[1].length, replacement: <span key={key++} className="rounded bg-amber-500/15 px-1 font-medium text-amber-500">{match[1]}</span> }
      }
    }

    if (bestMatch) {
      if (bestMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, bestMatch.index)}</span>)
      }
      parts.push(bestMatch.replacement)
      remaining = remaining.slice(bestMatch.index + bestMatch.length)
    } else {
      parts.push(<span key={key++}>{remaining}</span>)
      remaining = ''
    }
  }

  return <>{parts}</>
}

/* ─── Inline Personality Setup Component ───────────────────────────────── */
function PersonalitySetup({
  open, onClose, initial, onSave,
}: {
  open: boolean
  onClose: () => void
  initial: AIPersonality
  onSave: (p: AIPersonality) => void
}) {
  const [form, setForm] = useState<AIPersonality>(initial)
  const [voices, setVoices] = useState<ElevenVoice[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => { setForm(initial) }, [initial])

  const fetchVoices = async () => {
    if (!form.elevenlabsKey) { toast.error('Enter ElevenLabs API key first'); return }
    setLoadingVoices(true)
    try {
      const list = await window.api?.ai?.getVoices(form.elevenlabsKey)
      setVoices(list || [])
    } catch (e: any) {
      toast.error(e.message || 'Failed to fetch voices')
    } finally { setLoadingVoices(false) }
  }

  const playPreview = async (voice: ElevenVoice) => {
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
      const { audio } = await window.api?.ai?.speak(joke, voice.id, form.elevenlabsKey)
      const audioEl = new Audio(audio)
      audioRef.current = audioEl
      audioEl.onended = () => setPlayingVoice(null)
      audioEl.onerror = () => setPlayingVoice(null)
      audioEl.play()
    } catch {
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
    if (form.gender === 'neutral') return true
    return v.gender.toLowerCase() === form.gender || v.gender === 'unknown'
  })

  const handleSave = () => {
    onSave(form)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            AI Personality
          </DialogTitle>
          <DialogDescription>Customize your AI assistant's identity and behavior</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Name & Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className={`${form.avatar} text-white text-lg font-bold`}>
                {form.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Label>AI Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Finley" />
            </div>
          </div>

          {/* Gender & Avatar Color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <div className="flex gap-1">
                {[
                  { id: 'neutral', label: 'Neutral' },
                  { id: 'male', label: 'Male' },
                  { id: 'female', label: 'Female' },
                ].map(g => (
                  <button
                    key={g.id}
                    onClick={() => setForm(f => ({ ...f, gender: g.id }))}
                    className={`flex-1 rounded-md border-2 py-1.5 text-xs font-medium transition-all ${form.gender === g.id ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Avatar Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, avatar: c }))}
                    className={`h-7 w-7 rounded-full ${c} transition-all ${form.avatar === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Personality Preset */}
          <div className="space-y-1.5">
            <Label>Personality</Label>
            <div className="grid gap-1.5">
              {AI_PERSONALITIES.map(p => (
                <button
                  key={p.id}
                  onClick={() => setForm(f => ({ ...f, personality: p.id }))}
                  className={`flex items-center gap-3 rounded-lg border-2 p-2.5 text-left transition-all ${form.personality === p.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <div className={`h-2.5 w-2.5 rounded-full ${form.personality === p.id ? 'bg-primary' : 'bg-muted'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${form.personality === p.id ? 'text-primary' : ''}`}>{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <Label>Custom Instructions</Label>
            <Textarea
              value={form.instructions}
              onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
              placeholder="e.g. Always greet me by name. Prioritize debt reduction advice."
              rows={3}
            />
          </div>

          {/* Voice Settings */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable Voice Features</p>
                <p className="text-[11px] text-muted-foreground">AI speaks responses and listens to your voice</p>
              </div>
              <Switch checked={form.voiceEnabled} onCheckedChange={v => setForm(f => ({ ...f, voiceEnabled: v }))} />
            </div>

            {form.voiceEnabled && (
              <>
                {/* Text/Voice mode */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setForm(f => ({ ...f, voiceMode: 'text' }))}
                    className={`flex items-center justify-center gap-2 rounded-md border-2 py-2 text-xs font-medium transition-all ${form.voiceMode === 'text' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Text Chat
                  </button>
                  <button
                    onClick={() => setForm(f => ({ ...f, voiceMode: 'voice' }))}
                    className={`flex items-center justify-center gap-2 rounded-md border-2 py-2 text-xs font-medium transition-all ${form.voiceMode === 'voice' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
                  >
                    <Volume2 className="h-3.5 w-3.5" /> Voice Replies
                  </button>
                </div>

                {/* ElevenLabs Key */}
                <div className="space-y-1.5">
                  <Label>ElevenLabs API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={form.elevenlabsKey}
                      onChange={e => setForm(f => ({ ...f, elevenlabsKey: e.target.value }))}
                      placeholder="sk_..."
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
                      {form.gender === 'neutral' ? 'Showing all voices' : `Filtered by ${form.gender} gender`}
                    </p>
                    <div className="grid gap-1.5 max-h-48 overflow-y-auto">
                      {filteredVoices.map(v => (
                        <button
                          key={v.id}
                          onClick={() => setForm(f => ({ ...f, voiceId: v.id }))}
                          className={`flex items-center gap-2 rounded-lg border-2 p-2 text-left transition-all ${form.voiceId === v.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                        >
                          <div className={`h-2.5 w-2.5 rounded-full ${form.voiceId === v.id ? 'bg-primary' : 'bg-muted'}`} />
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
          </div>

          <Button onClick={handleSave} className="w-full">
            Save Personality
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Main Chat Page ───────────────────────────────────────────────────── */
export default function AIChatPage() {
  const navigate = useNavigate()
  const { settings, updateSettings } = useAppStore()
  const {
    threads, activeThreadId, createThread, setActiveThread, closeThread,
    addMessage, updateThreadTitle, renameThreadFromFirstMessage, getThread
  } = useAIChatStore()

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [llmProvider, setLlmProvider] = useState<string>('openai')
  const [pendingActions, setPendingActions] = useState<Record<string, AIAction>>({})
  const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({})
  const [aiPersonality, setAiPersonality] = useState<AIPersonality>({
    name: 'WealthOS AI', avatar: 'bg-emerald-500', gender: 'neutral', personality: 'friendly',
    instructions: '', voiceEnabled: false, voiceMode: 'text', elevenlabsKey: '', voiceId: ''
  })
  const [showPersonality, setShowPersonality] = useState(false)
  const [firstTime, setFirstTime] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [voiceModeOpen, setVoiceModeOpen] = useState(false)
  const [kbContent, setKbContent] = useState('')
  const [showKbPanel, setShowKbPanel] = useState(false)
  const [kbSaving, setKbSaving] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  const activeThread = activeThreadId ? getThread(activeThreadId) : undefined
  const messages = activeThread?.messages || []
  const isNewThread = !activeThread || messages.length === 0

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const s = await window.api?.settings?.get() as any
        const provider = s?.llm_provider || 'openai'
        setLlmProvider(provider)
        setHasKey(provider === 'ollama' ? true : !!s?.openai_key)
        const personality = {
          name: s?.ai_name || 'WealthOS AI',
          avatar: s?.ai_avatar || 'bg-emerald-500',
          gender: s?.ai_gender || 'neutral',
          personality: s?.ai_personality || 'friendly',
          instructions: s?.ai_instructions || '',
          voiceEnabled: s?.ai_voice_enabled || false,
          voiceMode: s?.ai_voice_mode || 'text',
          elevenlabsKey: s?.elevenlabs_key || '',
          voiceId: s?.ai_voice_id || '',
        }
        setAiPersonality(personality)
        if (!s?.ai_name) {
          setFirstTime(true)
          setShowPersonality(true)
        }
      } catch { setHasKey(false) }
    }
    loadSettings()
    loadKb()
  }, [])

  const loadKb = async () => {
    try {
      const row = await window.api?.kb?.get()
      if (row?.content !== undefined) {
        setKbContent(row.content)
      }
    } catch (e: any) {
      console.error('[KB] Failed to load:', e)
    }
  }

  useEffect(() => {
    if (showKbPanel) {
      loadKb()
    }
  }, [showKbPanel])

  const handleSaveKb = async () => {
    if (!kbContent.trim()) {
      toast.error('Knowledge base content is empty')
      return
    }
    setKbSaving(true)
    try {
      const result = await window.api?.kb?.save(kbContent)
      if (result) {
        toast.success('Knowledge base saved')
      } else {
        toast.error('Failed to save knowledge base')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save knowledge base')
    } finally { setKbSaving(false) }
  }

  useEffect(() => {
    if (activeThreadId && messages.length === 0 && !firstTime) {
      const greeting = `Hi! I'm ${aiPersonality.name}, your personalized financial assistant. ${getGreeting(aiPersonality.personality)} What would you like to know?`
      addMessage(activeThreadId, {
        id: 'greet-' + Date.now(), role: 'assistant', content: greeting
      })
    }
  }, [activeThreadId, aiPersonality.name, aiPersonality.personality, firstTime])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      if (recognitionRef.current) { recognitionRef.current.stop() }
    }
  }, [])

  const getGreeting = (p: string) => {
    switch (p) {
      case 'friendly': return "I'm here to help you make sense of your money and reach your goals!"
      case 'professional': return "I'll provide data-driven analysis and actionable recommendations."
      case 'witty': return "Let's make finance fun... or at least less boring!"
      case 'strict': return "We'll get your finances in order. No excuses."
      case 'zen': return "Let's approach your finances with calm and clarity."
      default: return "How can I help you today?"
    }
  }

  const parseMemory = (text: string): { content: string; memories: string[] } => {
    const memories: string[] = []
    const memoryRegex = /```memory\s*\n([\s\S]*?)\n```/g
    let match
    while ((match = memoryRegex.exec(text)) !== null) {
      const fact = match[1].trim()
      if (fact) memories.push(fact)
    }
    const content = text.replace(memoryRegex, '').trim()
    return { content, memories }
  }

  const parseActions = (text: string): { content: string; actions: AIAction[] } => {
    const actions: AIAction[] = []
    const actionRegex = /```action\s*\n([\s\S]*?)\n```/g
    let content = text
    let match
    const validTypes: Set<string> = new Set(Object.keys(ACTION_LABELS))
    while ((match = actionRegex.exec(text)) !== null) {
      try {
        const action = JSON.parse(match[1]) as AIAction
        if (action.type && validTypes.has(action.type)) actions.push(action)
      } catch { /* ignore */ }
    }
    content = content.replace(actionRegex, '').trim()
    return { content, actions }
  }

  const handleSpeak = useCallback(async (text: string) => {
    if (!aiPersonality.voiceEnabled || aiPersonality.voiceMode !== 'voice') return
    if (!aiPersonality.elevenlabsKey) { toast.error('Add ElevenLabs API key in AI Personality settings'); return }
    try {
      setSpeaking(true)
      const { audio } = await window.api?.ai?.speak(text, aiPersonality.voiceId || undefined, aiPersonality.elevenlabsKey)
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      const audioEl = new Audio(audio)
      audioRef.current = audioEl
      audioEl.onended = () => setSpeaking(false)
      audioEl.onerror = () => { setSpeaking(false); toast.error('Voice playback failed') }
      audioEl.play()
    } catch {
      setSpeaking(false)
      toast.error('Voice synthesis failed')
    }
  }, [aiPersonality])

  const handleStartListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { toast.error('Speech recognition not supported'); return }
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      setTimeout(() => handleSend(transcript), 100)
    }
    rec.onerror = () => { setListening(false); toast.error('Voice input failed') }
    recognitionRef.current = rec
    rec.start()
  }

  const handleStopListening = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null }
    setListening(false)
  }

  const handleSend = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg) return
    if (!hasKey) {
      const errorMsg = llmProvider === 'ollama'
        ? 'Please configure Ollama in Settings → AI Provider'
        : 'Please add your OpenAI API key in Settings → AI Provider'
      toast.error(errorMsg)
      return
    }
    if (!activeThreadId) {
      const newId = createThread()
      setActiveThread(newId)
      setTimeout(() => handleSend(msg), 0)
      return
    }
    const threadId = activeThreadId
    const userMsgId = String(Date.now())
    addMessage(threadId, { id: userMsgId, role: 'user', content: msg })
    renameThreadFromFirstMessage(threadId, 'New Chat')
    setInput('')
    setLoading(true)
    try {
      const mem = useAIChatStore.getState().getMemory(threadId)
      const response = await window.api?.ai?.chat(msg, mem)
      const { content: cleanedContent, memories } = parseMemory(response || '')
      const { content, actions } = parseActions(cleanedContent)
      const msgId = String(Date.now() + 1)
      addMessage(threadId, { id: msgId, role: 'assistant', content: content || 'No response received.' })
      if (memories.length > 0) {
        memories.forEach(fact => useAIChatStore.getState().addMemory(threadId, fact))
      }
      if (actions.length > 0) {
        const actionMap: Record<string, AIAction> = {}
        actions.forEach((a, i) => { actionMap[`${msgId}-${i}`] = a })
        setPendingActions(prev => ({ ...prev, ...actionMap }))
      }
      if (aiPersonality.voiceEnabled && aiPersonality.voiceMode === 'voice') {
        handleSpeak(content)
      }
    } catch (e: any) {
      const errMsg = e?.message || String(e) || 'Unknown error'
      toast.error(`AI error: ${errMsg}`)
      addMessage(threadId, { id: String(Date.now() + 2), role: 'assistant', content: `⚠️ Failed to get response: ${errMsg}` })
    } finally { setLoading(false) }
  }

  const handleExecuteAction = async (key: string, action: AIAction) => {
    try {
      const result = await window.api?.agent?.execute(action)
      if (result?.ok) {
        toast.success(result.summary)
        setExecutedActions(prev => ({ ...prev, [key]: true }))
      } else {
        toast.error(result?.summary || 'Action failed')
      }
    } catch (e: any) { toast.error(e?.message || 'Failed to execute action') }
  }

  const handleExecuteAllActions = async (msgId: string) => {
    const keys = Object.keys(pendingActions).filter(k => k.startsWith(`${msgId}-`) && !executedActions[k])
    let successCount = 0
    for (const key of keys) {
      const action = pendingActions[key]
      try {
        const result = await window.api?.agent?.execute(action)
        if (result?.ok) { successCount++; setExecutedActions(prev => ({ ...prev, [key]: true })) }
      } catch { /* continue */ }
    }
    toast.success(`Executed ${successCount}/${keys.length} actions`)
  }

  const handleSavePersonality = async (p: AIPersonality) => {
    setAiPersonality(p)
    setFirstTime(false)
    try {
      await updateSettings({
        ai_name: p.name,
        ai_avatar: p.avatar,
        ai_gender: p.gender,
        ai_personality: p.personality,
        ai_instructions: p.instructions,
        ai_voice_enabled: p.voiceEnabled,
        ai_voice_mode: p.voiceMode,
        elevenlabs_key: p.elevenlabsKey,
        ai_voice_id: p.voiceId,
      })
      toast.success('AI personality saved')
    } catch { toast.error('Failed to save personality') }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const clearChat = () => {
    if (activeThreadId) {
      // Clear this thread's messages but keep the thread
      setPendingActions({})
      setExecutedActions({})
      const greeting = `Hi! I'm ${aiPersonality.name}, your personalized financial assistant. ${getGreeting(aiPersonality.personality)} What would you like to know?`
      addMessage(activeThreadId, { id: 'greet-' + Date.now(), role: 'assistant', content: greeting })
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }

  const toggleVoiceMode = () => {
    const newMode = aiPersonality.voiceMode === 'voice' ? 'text' : 'voice'
    const updated = { ...aiPersonality, voiceMode: newMode as 'text' | 'voice' }
    setAiPersonality(updated)
    handleSavePersonality(updated)
  }

  return (
    <div className="flex h-full -mx-6 -mt-6">
      {/* Voice Mode Overlay */}
      <VoiceModeOverlay
        open={voiceModeOpen}
        onClose={() => setVoiceModeOpen(false)}
        aiPersonality={aiPersonality}
        onSend={(text) => handleSend(text)}
        isLoading={loading}
        isSpeaking={speaking}
      />

      {/* Personality Setup Modal */}
      <PersonalitySetup
        open={showPersonality}
        onClose={() => { setShowPersonality(false); setFirstTime(false) }}
        initial={aiPersonality}
        onSave={handleSavePersonality}
      />

      {/* Knowledge Base Panel */}
      <Dialog open={showKbPanel} onOpenChange={setShowKbPanel}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              My Knowledge Base
            </DialogTitle>
            <DialogDescription>
              Teach {aiPersonality.name} about your life — rent, income, goals, habits — so it gives personalized advice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Write anything about your finances, goals, lifestyle, constraints — the AI will read this and give personalized advice.
            </p>
            <Textarea
              value={kbContent}
              onChange={e => setKbContent(e.target.value)}
              placeholder={`Example:
- I pay $1500/month rent
- My salary is $5000/month after tax
- I want to save for a car in 2 years
- I spend too much on dining out ($600/month)
- I want to invest $500/month into index funds
- I have $2000 in emergency savings
- My max budget for fun is $300/month`}
              rows={12}
              className="resize-none text-sm"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSaveKb} disabled={kbSaving} className="gap-1.5">
                {kbSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Save Knowledge Base
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Left Sidebar — Conversation History */}
      <div className="w-56 border-r border-border bg-muted/20 flex flex-col shrink-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm">Conversations</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => createThread()} title="New chat">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {threads
              .filter(t => t.messages.some(m => m.role === 'user') || t.id === activeThreadId)
              .map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveThread(t.id)}
                  className={`w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                    t.id === activeThreadId
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                  title={t.title}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t.title}</span>
                </button>
              ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right Column — Chat */}
      <div className="flex-1 flex flex-col min-w-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPersonality(true)} className="relative group">
            <Avatar className="h-10 w-10 border-2 border-primary/20 transition-all group-hover:ring-2 group-hover:ring-primary/30">
              <AvatarFallback className={`${aiPersonality.avatar} text-white text-sm font-bold`}>
                {aiPersonality.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-muted border border-border">
              <Settings className="h-2.5 w-2.5" />
            </div>
          </button>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              {aiPersonality.name}
              {aiPersonality.voiceEnabled && aiPersonality.voiceMode === 'voice' && (
                <Volume2 className="h-3.5 w-3.5 text-primary" />
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              {PERSONALITY_LABELS[aiPersonality.personality] || 'AI Assistant'} · Powered by {llmProvider === 'ollama' ? 'Ollama' : 'GPT-4o'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasKey === false && (
            <Badge variant="destructive">
              {llmProvider === 'ollama' ? 'Ollama Not Configured' : 'No API Key'}
            </Badge>
          )}
          {hasKey === true && (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              {llmProvider === 'ollama' ? 'Ollama Connected' : 'Connected'}
            </Badge>
          )}

          {/* Knowledge Base button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowKbPanel(true)}
            title="My Knowledge Base"
          >
            <BookOpen className="h-4 w-4" />
          </Button>

          {/* Cog icon → AI Personality settings page */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate('/ai-personality')}
            title="AI Personality Settings"
          >
            <Cog className="h-4 w-4" />
          </Button>

          {/* Voice mode toggle */}
          {aiPersonality.voiceEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleVoiceMode}
              className="h-8 gap-1.5 text-xs"
            >
              {aiPersonality.voiceMode === 'voice' ? (
                <><Volume2 className="h-3.5 w-3.5 text-primary" /> Voice</>
              ) : (
                <><MessageSquare className="h-3.5 w-3.5" /> Text</>
              )}
            </Button>
          )}

          {/* Voice Chat button - opens overlay */}
          {aiPersonality.voiceEnabled && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setVoiceModeOpen(true)}
              className="h-8 gap-1.5 text-xs bg-primary/90 hover:bg-primary"
            >
              <Radio className="h-3.5 w-3.5" />
              Voice Chat
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={clearChat} title="Clear current chat"><Trash2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => createThread()} title="New chat thread"><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden border-0 shadow-none rounded-none">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-5">
            {/* First-time welcome */}
            {firstTime && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Avatar className="h-16 w-16 mb-4">
                  <AvatarFallback className={`${aiPersonality.avatar} text-white text-xl font-bold`}>
                    {aiPersonality.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-bold mb-2">Welcome to your AI Assistant</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  Before we start, let's set up your AI's personality. Click the button below to customize how your AI looks, sounds, and behaves.
                </p>
                <Button onClick={() => setShowPersonality(true)} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Set Up AI Personality
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'assistant' ? (
                  <button onClick={() => setShowPersonality(true)} className="shrink-0">
                    <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
                      <AvatarFallback className={`${aiPersonality.avatar} text-white text-xs font-bold`}>
                        {aiPersonality.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                )}

                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm select-text ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.role === 'assistant' ? (
                    <div className="space-y-1">
                      <RichText text={m.content} />
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(m.content).then(() => toast.success('Copied to clipboard'))
                          }}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                        {aiPersonality.voiceEnabled && (
                          <button
                            onClick={() => handleSpeak(m.content)}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                          >
                            {speaking ? <Volume2 className="h-3 w-3 animate-pulse text-primary" /> : <VolumeX className="h-3 w-3" />}
                            {speaking ? 'Speaking...' : 'Read aloud'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  )}

                  {m.role === 'assistant' && (() => {
                    const msgActions = Object.entries(pendingActions).filter(([k]) => k.startsWith(`${m.id}-`))
                    if (msgActions.length === 0) return null
                    const allDone = msgActions.every(([k]) => executedActions[k])
                    const pendingCount = msgActions.filter(([k]) => !executedActions[k]).length
                    return (
                      <div className="mt-3 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-3 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-primary">Agent Plan ({msgActions.length} {msgActions.length === 1 ? 'action' : 'actions'})</span>
                          </div>
                          {!allDone && pendingCount > 1 && (
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleExecuteAllActions(String(m.id))}>
                              <Sparkles className="mr-1 h-3 w-3" /> Run All
                            </Button>
                          )}
                          {allDone && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="h-3.5 w-3.5" /> All done
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {msgActions.map(([k, action]) => {
                            const done = executedActions[k]
                            return (
                              <div key={k} className={`flex items-center gap-2 rounded-md border p-2 text-xs transition-colors ${done ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-background'}`}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant={done ? 'default' : 'outline'} className="text-[9px] h-4 px-1 font-mono">
                                      {ACTION_LABELS[action.type as AgentActionType] || action.type}
                                    </Badge>
                                    <span className="truncate font-medium">{describeAction(action)}</span>
                                  </div>
                                  {action.reason && <p className="mt-0.5 text-[10px] text-muted-foreground italic truncate">{action.reason}</p>}
                                </div>
                                {done ? (
                                  <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                                ) : (
                                  <Button size="sm" variant="outline" className="h-6 shrink-0 px-2 text-[10px]" onClick={() => handleExecuteAction(String(k), action)}>
                                    Approve
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

                  <p className={`mt-1 text-[10px] ${m.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={`${aiPersonality.avatar} text-white text-xs font-bold`}>
                    {aiPersonality.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-2xl bg-muted px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        {messages.length === 1 && !firstTime && (
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => handleSend(s)} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            {aiPersonality.voiceEnabled && (
              <Button
                size="icon"
                variant={listening ? 'destructive' : 'outline'}
                onClick={listening ? handleStopListening : handleStartListening}
                className="h-11 w-11 shrink-0"
                title={listening ? 'Stop listening' : 'Voice input'}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
            <Textarea
              placeholder={firstTime ? 'Set up your AI personality first...' : `Ask ${aiPersonality.name} about your finances...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
              disabled={firstTime}
            />
            <Button size="icon" onClick={() => handleSend()} disabled={loading || !input.trim() || firstTime} className="h-11 w-11 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Press Enter to send, Shift+Enter for new line</p>
            {aiPersonality.voiceEnabled && (
              <div className="flex items-center gap-1">
                <Wand2 className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">
                  Voice {aiPersonality.voiceMode === 'voice' ? 'replies on' : 'input only'}
                </span>
              </div>
            )}
          </div>
        </div>

      </Card>
      </div>{/* close right column */}
    </div>
  )
}
