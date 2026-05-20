import { useEffect, useState } from 'react'
import { Plus, Bot, Trash2, Sparkles, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Agent {
  id: number
  role: string
  name: string
  avatar: string
  system_prompt: string
  parent_agent_id: number | null
  is_active: number
  created_at: string
}

const ROLE_PRESETS: Record<string, { name: string; avatar: string; prompt: string }> = {
  ceo: { name: 'CEO', avatar: '👔', prompt: 'You are the CEO of this business. You set strategy, delegate to specialists, and ensure all teams are aligned. You spawn new agents when needed and review their work before presenting to the user.' },
  marketing: { name: 'Marketing Lead', avatar: '📣', prompt: 'You are the marketing lead. You craft strategies, identify target audiences, plan campaigns, and analyze what works. You collaborate with the content and design teams.' },
  designer: { name: 'Designer', avatar: '🎨', prompt: 'You are a creative designer. You produce visual concepts for posters, social media, t-shirts, and marketing materials. You suggest color palettes, layouts, and imagery.' },
  social_media: { name: 'Social Media Manager', avatar: '📱', prompt: 'You manage all social media. You craft posts for each platform (Twitter/X, Instagram, LinkedIn), determine optimal posting times, and track engagement.' },
  copywriter: { name: 'Copywriter', avatar: '✍️', prompt: 'You write compelling copy: headlines, ad scripts, product descriptions, email campaigns. You match brand voice and drive action.' },
  analyst: { name: 'Analyst', avatar: '📊', prompt: 'You analyze business metrics: revenue, traffic, engagement, conversion. You spot patterns, identify problems, and recommend data-driven actions.' },
}

export default function BusinessAgentsTab({ businessId }: { businessId: number }) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ role: 'custom', name: '', avatar: '🤖', system_prompt: '' })

  const load = async () => {
    const data = await (window as any).api?.businesses?.agents?.list(businessId)
    setAgents((data || []).filter((a: Agent) => a.is_active))
  }
  useEffect(() => { load() }, [businessId])

  const applyPreset = (role: string) => {
    const preset = ROLE_PRESETS[role]
    if (preset) {
      setForm({ role, name: preset.name, avatar: preset.avatar, system_prompt: preset.prompt })
    } else {
      setForm(f => ({ ...f, role }))
    }
  }

  const handleAdd = async () => {
    if (!form.name.trim() || !form.system_prompt.trim()) { toast.error('Name and system prompt required'); return }
    const res = await (window as any).api?.businesses?.agents?.create(businessId, form)
    if (res?.ok) {
      toast.success(`${form.name} hired`)
      setAdding(false)
      setForm({ role: 'custom', name: '', avatar: '🤖', system_prompt: '' })
      load()
    }
  }

  const handleDelete = async (id: number) => {
    await (window as any).api?.businesses?.agents?.delete(id)
    load()
  }

  const ceoExists = agents.some(a => a.role === 'ceo')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">AI Team</h3>
          <p className="text-xs text-muted-foreground">Build your AI workforce — CEO + specialists</p>
        </div>
        {!adding && <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-1 h-3 w-3" /> Hire Agent</Button>}
      </div>

      {!ceoExists && agents.length === 0 && !adding && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Crown className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">Start with a CEO</p>
              <p className="text-xs text-muted-foreground">The CEO agent orchestrates everything else.</p>
            </div>
            <Button size="sm" onClick={() => { setAdding(true); setTimeout(() => applyPreset('ceo'), 0) }}>
              <Crown className="mr-1 h-3 w-3" /> Hire CEO
            </Button>
          </CardContent>
        </Card>
      )}

      {adding && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-1">
              {Object.keys(ROLE_PRESETS).map(role => (
                <Button key={role} size="sm" variant={form.role === role ? 'default' : 'outline'} onClick={() => applyPreset(role)}>
                  {ROLE_PRESETS[role].avatar} {ROLE_PRESETS[role].name}
                </Button>
              ))}
              <Button size="sm" variant={form.role === 'custom' ? 'default' : 'outline'} onClick={() => applyPreset('custom')}>+ Custom</Button>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <Input value={form.avatar} onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))} className="text-center text-2xl" />
              <Input placeholder="Agent name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <Textarea
              rows={5}
              placeholder="System prompt — describe this agent's role and capabilities"
              value={form.system_prompt}
              onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd}>Hire</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agents.map(a => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{a.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{a.name}</span>
                      {a.role === 'ceo' && <Crown className="h-3 w-3 text-amber-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">{a.role.replace('_', ' ')}</p>
                    <p className="text-xs mt-2 line-clamp-3 text-muted-foreground">{a.system_prompt}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="p-4 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            Phase 2: Agent execution engine (task delegation, tool calls, CEO orchestration) — coming next
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
