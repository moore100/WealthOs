import { useEffect, useState, useCallback, useRef } from 'react'
import { Sun, Loader2, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

function renderMarkdown(text: string): string {
  // Light markdown: **bold** and line breaks
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
}

export default function DailyBriefing() {
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState<string>('')
  const [cached, setCached] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const load = useCallback(async (force?: boolean) => {
    setLoading(true); setError(null)
    try {
      const result = await window.api?.briefing?.get(!!force)
      if (result?.ok) {
        setContent(result.content || '')
        setCached(!!result.cached)
      } else {
        setError(result?.error || 'Briefing unavailable')
      }
    } catch (e: any) { setError(e?.message || 'Briefing failed') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSpeak = async () => {
    if (speaking) {
      audioRef.current?.pause()
      audioRef.current = null
      setSpeaking(false)
      return
    }
    if (!content) return
    try {
      // Try ElevenLabs via existing AI bridge if a key is configured; fallback to browser TTS
      const settings = await window.api?.settings?.get?.('elevenlabs_key')
      const elevenKey = (settings as any)?.value
      if (elevenKey) {
        const result = await window.api?.ai?.speak(content.replace(/\*\*/g, ''), undefined, elevenKey)
        if (result?.audio) {
          const audio = new Audio(`data:audio/mpeg;base64,${result.audio}`)
          audioRef.current = audio
          audio.onended = () => { setSpeaking(false); audioRef.current = null }
          audio.play()
          setSpeaking(true)
          return
        }
      }
      // Fallback: browser SpeechSynthesis
      const utter = new SpeechSynthesisUtterance(content.replace(/\*\*/g, ''))
      utter.onend = () => setSpeaking(false)
      speechSynthesis.speak(utter)
      setSpeaking(true)
    } catch {
      const utter = new SpeechSynthesisUtterance(content.replace(/\*\*/g, ''))
      utter.onend = () => setSpeaking(false)
      speechSynthesis.speak(utter)
      setSpeaking(true)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8 space-y-4">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Sun className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Daily Briefing unavailable</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            window.api?.window?.navigate('/openai-key')
          }}
        >
          Configure AI Provider
        </Button>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-50/40 to-orange-50/40 dark:from-amber-500/5 dark:to-orange-500/5">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Daily Briefing</h3>
            {cached && <Badge variant="outline" className="text-[9px] h-4 px-1">Today</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleSpeak} disabled={loading || !content}>
              {speaking ? <Volume2 className="h-3.5 w-3.5 animate-pulse text-primary" /> : <VolumeX className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => load(true)} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        {loading && !content ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating today's briefing...
          </div>
        ) : (
          <div
            className="text-sm leading-relaxed text-foreground/90"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </CardContent>
    </Card>
  )
}
