import { useState, useCallback } from 'react'
import {
  Palette, Check, Moon, Sun, Monitor, RotateCcw, Type, Layout,
  CreditCard, BarChart3, Sparkles, Wand2, Image, Zap, Layers,
  Box, Sliders, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Circle,
  Eye, EyeOff, Grid3X3, Fingerprint, Loader2, X, Paintbrush,
  AlignLeft, AlignCenter, AlignRight, SunDim, Sunset, Sunrise
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useThemeStore, THEME_PRESETS } from '@/store/themeStore'
import { toast } from 'sonner'
import type { ThemeSettings } from '@/types'

/* ─── Constants ───────────────────────────────────────────────────────── */
const PRESET_DISPLAY = [
  { id: 'wealth', name: 'Wealth', primary: '#22c55e', secondary: '#1e293b', accent: '#eab308', bg: '#090c0f', card: '#111820' },
  { id: 'midnight', name: 'Midnight', primary: '#0ea5e9', secondary: '#0f172a', accent: '#06b6d4', bg: '#020408', card: '#0a0f1a' },
  { id: 'rose-gold', name: 'Rose Gold', primary: '#f472b6', secondary: '#2d1b2e', accent: '#fbbf24', bg: '#140a14', card: '#1e1220' },
  { id: 'obsidian', name: 'Obsidian', primary: '#a78bfa', secondary: '#18181b', accent: '#d8b4fe', bg: '#0a0a0c', card: '#141418' },
  { id: 'arctic', name: 'Arctic', primary: '#0ea5e9', secondary: '#e0f2fe', accent: '#38bdf8', bg: '#f0f9ff', card: '#ffffff', isLight: true },
  { id: 'sunset', name: 'Sunset', primary: '#f97316', secondary: '#2a1510', accent: '#ef4444', bg: '#140a08', card: '#1e100c' },
  { id: 'forest', name: 'Forest', primary: '#22c55e', secondary: '#0f1f12', accent: '#84cc16', bg: '#08100a', card: '#0f1a12' },
  { id: 'corporate', name: 'Corporate', primary: '#3b82f6', secondary: '#1e293b', accent: '#60a5fa', bg: '#0a0f1a', card: '#111827' },
]

const FONT_OPTIONS = [
  { id: 'Inter', name: 'Inter' },
  { id: 'DM Sans', name: 'DM Sans' },
  { id: 'Sora', name: 'Sora' },
  { id: 'JetBrains Mono', name: 'JetBrains Mono' },
]

const SIDEBAR_STYLES = [
  { id: 'floating', name: 'Floating', icon: Layers },
  { id: 'flush', name: 'Flush', icon: AlignLeft },
  { id: 'mini', name: 'Mini', icon: Grid3X3 },
  { id: 'top', name: 'Top', icon: ArrowUp },
]

const CARD_STYLES = [
  { id: 'default', name: 'Default', preview: 'bg-card border shadow-sm' },
  { id: 'elevated', name: 'Elevated', preview: 'bg-card border shadow-lg' },
  { id: 'glass', name: 'Glass', preview: 'bg-white/5 backdrop-blur border-white/10' },
  { id: 'flat', name: 'Flat', preview: 'bg-muted border-0' },
]

const CHART_PALETTES = [
  { id: 'vivid', name: 'Vivid', colors: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'] },
  { id: 'pastel', name: 'Pastel', colors: ['#fca5a5', '#93c5fd', '#86efac', '#fde68a', '#c4b5fd'] },
  { id: 'monochrome', name: 'Mono', colors: ['#525252', '#737373', '#a3a3a3', '#d4d4d4', '#e5e5e5'] },
  { id: 'neon', name: 'Neon', colors: ['#ff00ff', '#00ffff', '#39ff14', '#ff006e', '#fb5607'] },
  { id: 'earth', name: 'Earth', colors: ['#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24'] },
  { id: 'ocean', name: 'Ocean', colors: ['#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd'] },
]

const HOVER_ANIMATIONS = [
  { id: 'none', name: 'None', desc: 'No hover effect' },
  { id: 'lift', name: 'Lift', desc: 'Cards rise up on hover' },
  { id: 'glow', name: 'Glow', desc: 'Soft primary glow' },
  { id: 'scale', name: 'Scale', desc: 'Subtle scale up' },
  { id: 'shine', name: 'Shine', desc: 'Light sweep effect' },
  { id: 'border-glow', name: 'Border', desc: 'Glowing border' },
]

const CARD_BORDERS = [
  { id: 'default', name: 'Default' },
  { id: 'glow', name: 'Glow' },
  { id: 'gradient', name: 'Gradient' },
  { id: 'neon', name: 'Neon' },
]

const LIGHT_DIRECTIONS = [
  { id: 'top', name: 'Top', icon: ArrowUp },
  { id: 'bottom', name: 'Bottom', icon: ArrowDown },
  { id: 'left', name: 'Left', icon: ArrowLeft },
  { id: 'right', name: 'Right', icon: ArrowRight },
  { id: 'center', name: 'Center', icon: Circle },
  { id: 'radial', name: 'Radial', icon: SunDim },
]

const BG_EXAMPLES = [
  { name: 'None', url: '' },
  { name: 'Stars', url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=80' },
  { name: 'Abstract', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1920&q=80' },
  { name: 'Gradient', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&q=80' },
  { name: 'City', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80' },
  { name: 'Nature', url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920&q=80' },
]

/* ─── AI Generate Dialog ──────────────────────────────────────────────── */
function AIGenerateDialog({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (theme: ThemeSettings) => void }) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    try {
      const generated = await window.api?.ai?.generateTheme(prompt)
      if (generated && Object.keys(generated).length > 0) {
        onApply(generated as ThemeSettings)
        toast.success('AI theme generated and applied!')
        onClose()
      } else {
        toast.error('AI returned empty theme')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate theme')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Generate Theme with AI
          </DialogTitle>
          <DialogDescription>Describe your dream theme and let AI design it</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="e.g. Cyberpunk neon with purple and cyan accents, dark background with grid lines..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
          />
          <div className="flex flex-wrap gap-1.5">
            {['Cyberpunk neon', 'Minimal white', 'Dark ocean', 'Sunset vibes', 'Forest zen', 'Rose gold luxury'].map(s => (
              <button key={s} onClick={() => setPrompt(s)} className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-accent transition-colors">
                {s}
              </button>
            ))}
          </div>
          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Designing...' : 'Generate Theme'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Color Picker Row ────────────────────────────────────────────────── */
function ColorRow({ label, desc, value, onChange }: { label: string; desc: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={hslToHex(value || '0 0% 50%')}
        onChange={e => onChange(hexToHsl(e.target.value))}
        className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent p-0 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <Label className="text-xs">{label}</Label>
        <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
      </div>
      <code className="rounded bg-muted px-2 py-1 text-[10px] font-mono text-muted-foreground shrink-0">{value || '—'}</code>
    </div>
  )
}

/* ─── Section Card Wrapper ───────────────────────────────────────────── */
function Section({ title, desc, icon: Icon, children }: { title: string; desc?: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <CardTitle className="text-sm flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </CardTitle>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      <CardContent className="p-4 space-y-4">{children}</CardContent>
    </Card>
  )
}

/* ─── Main Page ───────────────────────────────────────────────────────── */
export default function ThemeStudioPage() {
  const { theme, setTheme, setPreset, resetToDefault, applyToDOM } = useThemeStore()
  const [activePreset, setActivePreset] = useState(theme.preset || 'wealth')
  const [aiOpen, setAiOpen] = useState(false)

  const update = useCallback((partial: Partial<ThemeSettings>) => {
    setTheme(partial)
    applyToDOM({ ...theme, ...partial })
  }, [theme, setTheme, applyToDOM])

  const handlePreset = (id: string) => {
    setActivePreset(id)
    setPreset(id)
    toast.success(`${PRESET_DISPLAY.find(p => p.id === id)?.name || id} theme applied`)
  }

  const handleReset = () => {
    resetToDefault()
    setActivePreset('wealth')
    toast.success('Theme reset to default')
  }

  const handleAIApply = (generated: ThemeSettings) => {
    setActivePreset(generated.preset || 'custom')
    setTheme(generated)
    applyToDOM(generated)
  }

  const radiusPx = parseInt(theme.radius ?? '12px') || 12
  const fontSizePx = parseInt(theme.fontSize ?? '16px') || 16

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Theme Studio
          </h2>
          <p className="text-sm text-muted-foreground">Design your perfect WealthOS experience</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAiOpen(true)} className="gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            AI Generate
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      <AIGenerateDialog open={aiOpen} onClose={() => setAiOpen(false)} onApply={handleAIApply} />

      {/* ─── Presets ───────────────────────────────────────────────────── */}
      <Section title="Color Presets" desc="Choose a starting point" icon={Paintbrush}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRESET_DISPLAY.map(p => (
            <button
              key={p.id}
              onClick={() => handlePreset(p.id)}
              className={`group relative overflow-hidden rounded-xl border-2 p-3 text-left transition-all hover:scale-[1.02] ${activePreset === p.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'}`}
            >
              <div className="mb-2 rounded-lg p-2 space-y-1.5" style={{ backgroundColor: p.card, border: `1px solid ${p.isLight ? '#e5e7eb' : '#374151'}` }}>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.primary }} />
                  <div className="h-1 flex-1 rounded-full" style={{ backgroundColor: p.secondary, opacity: 0.5 }} />
                </div>
                <div className="h-5 rounded flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: p.primary, color: '#fff' }}>Button</div>
                <div className="flex gap-1">
                  <div className="h-3 flex-1 rounded-sm" style={{ backgroundColor: p.accent, opacity: 0.3 }} />
                  <div className="h-3 flex-1 rounded-sm" style={{ backgroundColor: p.primary, opacity: 0.2 }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{p.name}</p>
                {p.isLight && <Badge variant="outline" className="text-[10px] h-5">Light</Badge>}
              </div>
              {activePreset === p.id && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-md">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </Section>

      {/* ─── Core Colors & Mode ────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Color Theme" desc="Base mood and mode" icon={Sunrise}>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'system', label: 'System', icon: Monitor },
            ].map(m => {
              const Icon = m.icon
              const active = theme.mode === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => update({ mode: m.id as any })}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all ${active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${active ? 'text-primary' : ''}`}>{m.label}</span>
                </button>
              )
            })}
          </div>
          <Separator />
          <div className="space-y-3">
            <ColorRow label="Primary" desc="Buttons, links, highlights" value={theme.primary || ''} onChange={v => update({ primary: v })} />
            <ColorRow label="Secondary" desc="Backgrounds, surfaces" value={theme.secondary || ''} onChange={v => update({ secondary: v })} />
            <ColorRow label="Accent" desc="Badges, tags, indicators" value={theme.accent || ''} onChange={v => update({ accent: v })} />
            <ColorRow label="Background" desc="App background" value={theme.background || ''} onChange={v => update({ background: v })} />
            <ColorRow label="Card" desc="Card surfaces" value={theme.card || ''} onChange={v => update({ card: v })} />
            <ColorRow label="Border" desc="Borders and dividers" value={theme.border || ''} onChange={v => update({ border: v })} />
          </div>
        </Section>

        <Section title="Chart Palette" desc="Colors for data visualization" icon={BarChart3}>
          <div className="grid grid-cols-3 gap-2">
            {CHART_PALETTES.map(p => {
              const active = theme.chartPalette === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => update({ chartPalette: p.id as any })}
                  className={`rounded-lg border-2 p-2 transition-all ${active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                >
                  <div className="flex gap-1 mb-1.5">
                    {p.colors.map((c, i) => (
                      <div key={i} className="h-4 flex-1 rounded-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${active ? 'text-primary' : ''}`}>{p.name}</p>
                </button>
              )
            })}
          </div>
        </Section>
      </div>

      {/* ─── Layout & Cards ────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Border Radius" desc="Roundness of UI elements" icon={Box}>
          <Slider min={0} max={24} step={1} value={[radiusPx]} onValueChange={v => update({ radius: `${v[0]}px` })} />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Sharp</span>
            <span className="font-medium text-foreground">{radiusPx}px</span>
            <span>Pill</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[4, 8, 12, 16, 20, 24].map(r => (
              <button key={r} onClick={() => update({ radius: `${r}px` })} className={`flex h-9 items-center justify-center border-2 text-xs font-medium transition-all ${radiusPx === r ? 'border-primary bg-primary/10' : 'border-border bg-muted hover:border-primary/30'}`} style={{ borderRadius: `${r}px` }}>
                {r}px
              </button>
            ))}
          </div>
        </Section>

        <Section title="Card Style" desc="Visual treatment for cards" icon={CreditCard}>
          <div className="grid grid-cols-2 gap-2">
            {CARD_STYLES.map(s => {
              const active = theme.cardStyle === s.id
              return (
                <button key={s.id} onClick={() => update({ cardStyle: s.id as any })} className={`flex flex-col gap-2 rounded-lg border-2 p-2.5 transition-all ${active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div className={`h-10 rounded-md ${s.preview}`} />
                  <p className={`text-xs font-medium ${active ? 'text-primary' : ''}`}>{s.name}</p>
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Sidebar Style" desc="Navigation layout" icon={Layout}>
          <div className="grid grid-cols-2 gap-2">
            {SIDEBAR_STYLES.map(s => {
              const Icon = s.icon
              const active = theme.sidebarStyle === s.id
              return (
                <button key={s.id} onClick={() => update({ sidebarStyle: s.id as any })} className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all ${active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${active ? 'text-primary' : ''}`}>{s.name}</span>
                </button>
              )
            })}
          </div>
        </Section>
      </div>

      {/* ─── Sidebar & Topbar Colors ───────────────────────────────────── */}
      <Section title="Navigation Colors" desc="Customize sidebar and topbar appearance" icon={Sliders}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sidebar</p>
            <ColorRow label="Background" desc="Sidebar background color" value={theme.sidebarColor || 'transparent'} onChange={v => update({ sidebarColor: v })} />
            <ColorRow label="Text Color" desc="Sidebar text/icon color" value={theme.sidebarTextColor || ''} onChange={v => update({ sidebarTextColor: v })} />
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-sm font-medium">Sidebar Glow</p>
                <p className="text-[11px] text-muted-foreground">Soft inner glow effect</p>
              </div>
              <Switch checked={!!theme.sidebarGlow} onCheckedChange={v => update({ sidebarGlow: v })} />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Topbar</p>
            <ColorRow label="Background" desc="Topbar background color" value={theme.topbarColor || ''} onChange={v => update({ topbarColor: v })} />
            <ColorRow label="Text Color" desc="Topbar text color" value={theme.topbarTextColor || ''} onChange={v => update({ topbarTextColor: v })} />
          </div>
        </div>
      </Section>

      {/* ─── Card Animations ─────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Hover Animation" desc="What happens when you hover cards" icon={Zap}>
          <div className="grid gap-1.5">
            {HOVER_ANIMATIONS.map(a => {
              const active = theme.cardHoverAnimation === a.id
              return (
                <button key={a.id} onClick={() => update({ cardHoverAnimation: a.id as any })} className={`flex items-center gap-3 rounded-lg border-2 p-2.5 text-left transition-all ${active ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-primary' : 'bg-muted'}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${active ? 'text-primary' : ''}`}>{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Card Border" desc="Border style for cards" icon={Fingerprint}>
          <div className="grid grid-cols-2 gap-2">
            {CARD_BORDERS.map(b => {
              const active = theme.cardBorderStyle === b.id
              return (
                <button key={b.id} onClick={() => update({ cardBorderStyle: b.id as any })} className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-xs font-medium transition-all ${active ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>
                  {b.name}
                </button>
              )
            })}
          </div>
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Shadow Intensity</p>
                <p className="text-[11px] text-muted-foreground">Depth of shadows</p>
              </div>
              <div className="flex gap-1">
                {(['none', 'soft', 'medium', 'strong', 'neon'] as const).map(s => (
                  <button key={s} onClick={() => update({ shadowIntensity: s })} className={`rounded px-2 py-1 text-[10px] font-medium capitalize transition-all ${theme.shadowIntensity === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Hover Intensity</p>
                <p className="text-[11px] text-muted-foreground">How strong the hover effect is</p>
              </div>
              <div className="flex gap-1">
                {(['subtle', 'medium', 'strong'] as const).map(s => (
                  <button key={s} onClick={() => update({ hoverIntensity: s })} className={`rounded px-2 py-1 text-[10px] font-medium capitalize transition-all ${theme.hoverIntensity === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Border Width</p>
              </div>
              <div className="flex gap-1">
                {(['thin', 'normal', 'thick'] as const).map(s => (
                  <button key={s} onClick={() => update({ borderWidth: s })} className={`rounded px-2 py-1 text-[10px] font-medium capitalize transition-all ${theme.borderWidth === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* ─── Effects ───────────────────────────────────────────────────── */}
      <Section title="Visual Effects" desc="Advanced visual treatments" icon={Sparkles}>
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Glass Morphism */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Glass Morphism</p>
                <p className="text-[11px] text-muted-foreground">Frosted glass effect</p>
              </div>
              <Switch checked={!!theme.glassMorphism} onCheckedChange={v => update({ glassMorphism: v })} />
            </div>
            {theme.glassMorphism && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Blur Amount</Label>
                  <div className="flex gap-1">
                    {(['sm', 'md', 'lg', 'xl', '2xl'] as const).map(s => (
                      <button key={s} onClick={() => update({ glassBlur: s })} className={`flex-1 rounded py-1 text-[10px] font-medium transition-all ${theme.glassBlur === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Opacity</Label>
                  <div className="flex gap-1">
                    {(['0.05', '0.1', '0.15', '0.2'] as const).map(s => (
                      <button key={s} onClick={() => update({ glassOpacity: s })} className={`flex-1 rounded py-1 text-[10px] font-medium transition-all ${theme.glassOpacity === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Light Direction */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Light Direction</p>
            <p className="text-[11px] text-muted-foreground">Where light appears to come from</p>
            <div className="grid grid-cols-3 gap-1.5">
              {LIGHT_DIRECTIONS.map(d => {
                const Icon = d.icon
                const active = theme.lightDirection === d.id
                return (
                  <button key={d.id} onClick={() => update({ lightDirection: d.id as any })} className={`flex flex-col items-center gap-1 rounded-lg border-2 py-2 transition-all ${active ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <Icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-[10px] font-medium ${active ? 'text-primary' : ''}`}>{d.name}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-sm font-medium">Ambient Glow</p>
              </div>
              <Switch checked={!!theme.ambientGlow} onCheckedChange={v => update({ ambientGlow: v })} />
            </div>
          </div>

          {/* App Blur & Animation */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">App Blur</Label>
              <div className="flex gap-1">
                {(['none', 'sm', 'md', 'lg'] as const).map(s => (
                  <button key={s} onClick={() => update({ appBlur: s })} className={`flex-1 rounded py-1 text-[10px] font-medium capitalize transition-all ${theme.appBlur === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Animation Speed</Label>
              <div className="flex gap-1">
                {(['slow', 'normal', 'fast'] as const).map(s => (
                  <button key={s} onClick={() => update({ animationSpeed: s })} className={`flex-1 rounded py-1 text-[10px] font-medium capitalize transition-all ${theme.animationSpeed === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Animations</p>
                <p className="text-[11px] text-muted-foreground">Motion effects</p>
              </div>
              <Switch checked={theme.motion !== false} onCheckedChange={v => update({ motion: v })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Icon Style</Label>
              <div className="flex gap-1">
                {(['outline', 'filled', 'duotone'] as const).map(s => (
                  <button key={s} onClick={() => update({ iconStyle: s })} className={`flex-1 rounded py-1 text-[10px] font-medium capitalize transition-all ${theme.iconStyle === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Scrollbar</Label>
              <div className="flex gap-1">
                {(['default', 'thin', 'hidden', 'rounded'] as const).map(s => (
                  <button key={s} onClick={() => update({ scrollbarStyle: s })} className={`flex-1 rounded py-1 text-[10px] font-medium capitalize transition-all ${theme.scrollbarStyle === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Background ────────────────────────────────────────────────── */}
      <Section title="Background" desc="Set a background image for the app" icon={Image}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Presets</p>
            <div className="grid grid-cols-3 gap-2">
              {BG_EXAMPLES.map(bg => {
                const active = theme.backgroundImage === bg.url
                return (
                  <button
                    key={bg.name}
                    onClick={() => update({ backgroundImage: bg.url })}
                    className={`relative overflow-hidden rounded-lg border-2 aspect-video transition-all ${active ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/30'}`}
                    style={bg.url ? { backgroundImage: `url(${bg.url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'hsl(var(--muted))' }}
                  >
                    <div className={`absolute inset-0 flex items-center justify-center ${active ? 'bg-primary/20' : 'bg-black/30'}`}>
                      <span className={`text-xs font-bold ${bg.url ? 'text-white drop-shadow-md' : 'text-foreground'}`}>{bg.name}</span>
                    </div>
                    {active && (
                      <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Custom Image URL</Label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={theme.backgroundImage || ''}
                onChange={e => update({ backgroundImage: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Settings</p>
            <div className="space-y-1">
              <Label className="text-xs">Overlay Opacity</Label>
              <Slider min={0} max={100} step={5} value={[parseFloat(theme.backgroundOverlay || '0.7') * 100]} onValueChange={v => update({ backgroundOverlay: String(v[0] / 100) })} />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Transparent</span>
                <span>{Math.round(parseFloat(theme.backgroundOverlay || '0.7') * 100)}%</span>
                <span>Opaque</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Background Size</Label>
              <div className="flex gap-1">
                {(['cover', 'contain', 'auto'] as const).map(s => (
                  <button key={s} onClick={() => update({ backgroundSize: s })} className={`flex-1 rounded py-1 text-[10px] font-medium capitalize transition-all ${theme.backgroundSize === s ? 'bg-primary text-white' : 'bg-muted'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Gradient Overlay</p>
                <p className="text-[11px] text-muted-foreground">Fade from light direction</p>
              </div>
              <Switch checked={!!theme.gradientOverlay} onCheckedChange={v => update({ gradientOverlay: v })} />
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Typography ────────────────────────────────────────────────── */}
      <Section title="Typography & Spacing" desc="Text and layout density" icon={Type}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Font Family</p>
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map(f => {
                const active = theme.font === f.id
                return (
                  <button key={f.id} onClick={() => update({ font: f.id })} className={`rounded-lg border-2 p-2.5 text-left transition-all ${active ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <p className={`text-sm font-medium ${active ? 'text-primary' : ''}`} style={{ fontFamily: f.id }}>{f.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: f.id }}>Aa Bb Cc 123</p>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Font Size</p>
            <Slider min={12} max={20} step={1} value={[fontSizePx]} onValueChange={v => update({ fontSize: `${v[0]}px` })} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Small</span>
              <span className="font-medium text-foreground">{fontSizePx}px</span>
              <span>Large</span>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p style={{ fontSize: `${fontSizePx}px` }} className="font-medium">The quick brown fox</p>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Density</p>
            <div className="flex gap-2">
              {(['compact', 'comfortable', 'spacious'] as const).map(d => (
                <button key={d} onClick={() => update({ density: d })} className={`flex-1 rounded-lg border-2 py-2 text-xs font-medium capitalize transition-all ${theme.density === d ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>{d}</button>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}

/* ─── Utilities ───────────────────────────────────────────────────────── */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function hslToHex(hsl: string): string {
  const m = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/)
  if (!m) return '#888888'
  let h = parseFloat(m[1]) / 360, s = parseFloat(m[2]) / 100, l = parseFloat(m[3]) / 100
  let r: number, g: number, b: number
  if (s === 0) { r = g = b = l }
  else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
