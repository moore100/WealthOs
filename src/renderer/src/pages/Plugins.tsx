import { useState, useEffect, useCallback, useRef } from 'react'
import Editor from '@monaco-editor/react'
import {
  Puzzle, Plus, Trash2, Play, Loader2,
  ToggleLeft, ToggleRight, FileJson, RefreshCw, X,
  ChevronDown, BookOpen, PanelRightClose,
  PanelRightOpen, Zap, Save, FileCode, FilePlus,
  Sparkles, Wand2, Code, Eye, Columns2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/themeStore'
import PluginSandbox from '@/components/PluginSandbox'

interface Plugin {
  id: number
  name: string
  description: string
  version: string
  author: string
  file_name: string
  enabled: number
  created_at: string
  installed: boolean
}

const defaultPluginCode = `// WealthOS Plugin Template
// This plugin registers a custom widget on the Plugins page.

module.exports = {
  name: 'My First Plugin',
  version: '1.0.0',
  author: 'You',
  description: 'A simple greeting widget',

  onInit(api) {
    api.registerWidget({
      id: 'greeting-widget',
      title: 'Hello from Plugin',
      render() {
        return api.html\`
          <div style="padding: 16px; background: hsl(var(--primary)/0.1); border-radius: 12px; text-align: center;">
            <h3 style="margin: 0; color: hsl(var(--primary)); font-size: 1.1rem;">Hello WealthOS!</h3>
            <p style="margin: 8px 0 0; color: hsl(var(--muted-foreground)); font-size: 0.85rem;">
              This widget was rendered by your custom plugin.
            </p>
          </div>
        \`
      }
    })
  }
}
`

function DocsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Plugin Development Guide
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          WealthOS plugins are JavaScript modules that run in a sandboxed environment.
          They can register widgets, fetch read-only data, and extend the app without
          modifying core code.
        </p>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Module Structure</h3>
          <pre className="text-[11px] font-mono overflow-x-auto">
{`module.exports = {
  name: 'Plugin Name',
  version: '1.0.0',
  author: 'Your Name',
  description: 'What this plugin does',

  onInit(api) {
    // Your plugin logic here
  }
}`}
          </pre>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">API Reference</h3>
          <div className="grid gap-2">
            <DocItem signature="api.registerWidget({ id, title, render() })" description="Register a custom widget card that appears in the Run panel. The render() function must return an HTML string." />
            <DocItem signature="api.html\`...\`" description="Tagged template literal for creating sanitized HTML strings in widget render functions." />
            <DocItem signature="api.fetchExpenses(month?)" description="Fetch all expenses. Optionally pass a month string like '2024-01' to filter. Returns a Promise resolving to an array of expense objects." />
            <DocItem signature="api.fetchIncome()" description="Fetch all income sources. Returns a Promise resolving to an array of income objects." />
            <DocItem signature="api.fetchCategories()" description="Fetch all categories. Returns a Promise resolving to an array of category objects." />
            <DocItem signature="api.toast(message)" description="Display a toast notification inside the plugin sandbox." />
            <DocItem signature="api.log(...args)" description="Log to the browser console with a [plugin] prefix." />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Security Notes</h3>
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
            <li>Plugins run in a sandboxed <code className="font-mono text-[11px]">new Function()</code> context.</li>
            <li>No access to Node.js APIs, filesystem, or network (except via exposed API methods).</li>
            <li>Plugins are disabled by default after installation. Enable them before running.</li>
            <li>Only install plugins from sources you trust.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function DocItem({ signature, description }: { signature: string; description: string }) {
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded">{signature}</code>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
  const [code, setCode] = useState('')
  const [originalCode, setOriginalCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [showDocs, setShowDocs] = useState(false)
  const [showOutput, setShowOutput] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showAiRegen, setShowAiRegen] = useState(false)
  const [aiRegenPrompt, setAiRegenPrompt] = useState('')
  const [editorTab, setEditorTab] = useState<'code' | 'preview' | 'split'>('code')
  const editorRef = useRef<any>(null)
  const { theme } = useThemeStore()
  const monacoTheme = theme.mode === 'light' ? 'vs' : 'vs-dark'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.api?.plugin?.discover()
      if (res?.ok) {
        const list = (res.plugins || []) as Plugin[]
        setPlugins(list)
        if (list.length > 0 && !selectedPlugin) {
          handleSelect(list[0])
        }
      }
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSelect = async (p: Plugin) => {
    setSelectedPlugin(p)
    setShowDocs(false)
    setCreating(false)
    try {
      const res = await window.api?.plugin?.getCode(p.file_name)
      if (res?.ok && res.code) {
        setCode(res.code)
        setOriginalCode(res.code)
      }
    } catch { /* ignore */ }
  }

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return toast.error('Describe what your plugin should do')
    setGenerating(true)
    try {
      const systemPrompt = `You are an expert JavaScript plugin developer for WealthOS, a personal finance desktop app.
You write plugins that run in a sandboxed environment and register custom widgets.

Rules:
1. Return ONLY valid JavaScript code wrapped in a code block (\`\`\`javascript ... \`\`\`).
2. The plugin MUST use \`module.exports = { ... }\` to export its object. Do NOT use \`export default\`.
3. The exported object must have: name, version, author, description, and an onInit(api) function.
4. Use api.registerWidget({ id, title, render() }) to create widgets. render() must return an HTML string.
5. Use api.html\`...\` for HTML templates.
6. Available data APIs: api.fetchExpenses(month?), api.fetchIncome(), api.fetchCategories().
7. Available UI APIs: api.toast(message), api.log(...args).
8. Keep plugins simple, single-purpose, and self-contained.
9. Style widgets using inline styles or Tailwind-like utility classes. Use CSS custom properties for colors.

Example widget styling:
- background: hsl(var(--primary)/0.1) for primary tint backgrounds
- border-radius: 12px
- padding: 16px
- font sizes in rem units

Generate a complete, working plugin based on the user's request.`

      const res = await window.api?.llm?.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: aiPrompt }
        ],
        maxTokens: 1200,
        jsonResponse: false
      })
      if (res?.ok && res.text) {
        const codeMatch = res.text.match(/```javascript\n([\s\S]*?)\n```/)
        const generated = codeMatch ? codeMatch[1].trim() : res.text.trim()
        setCode(generated)
        toast.success('Plugin code generated!')
      } else {
        toast.error(res?.error || 'Generation failed')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleNewPlugin = async () => {
    if (!newFileName.trim()) return toast.error('Enter a file name')
    setSaving(true)
    try {
      const pluginCode = code && code !== defaultPluginCode ? code : defaultPluginCode
      const res = await window.api?.plugin?.install(newFileName, pluginCode)
      if (res?.ok) {
        toast.success('Plugin created')
        setNewFileName('')
        setCreating(false)
        setCode('')
        await load()
      } else {
        toast.error(res?.error || 'Failed to create')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed')
    } finally { setSaving(false) }
  }

  const handleSave = async () => {
    if (!selectedPlugin) return
    setSaving(true)
    try {
      const res = await window.api?.plugin?.install(selectedPlugin.file_name, code)
      if (res?.ok) {
        setOriginalCode(code)
        toast.success('Saved')
      } else {
        toast.error(res?.error || 'Save failed')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  const handleRegenerate = async () => {
    if (!aiRegenPrompt.trim()) return toast.error('Describe what you want changed')
    setGenerating(true)
    try {
      const systemPrompt = `You are an expert JavaScript plugin developer for WealthOS.
Rewrite the plugin based on the user's request. Return ONLY valid JavaScript code wrapped in \`\`\`javascript ... \`\`\`.
CRITICAL: You MUST use \`module.exports = { ... }\` to export the plugin object. Do NOT use \`export default\`.
Keep the same plugin structure (name, version, author, description, onInit(api)).
Use api.registerWidget, api.html, api.fetchExpenses, api.fetchIncome, api.fetchCategories, api.toast, api.log.`

      const res = await window.api?.llm?.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Current plugin code:\n\`\`\`javascript\n${code}\n\`\`\`\n\nRequest: ${aiRegenPrompt}` }
        ],
        maxTokens: 1200,
        jsonResponse: false
      })
      if (res?.ok && res.text) {
        const codeMatch = res.text.match(/```javascript\n([\s\S]*?)\n```/)
        const generated = codeMatch ? codeMatch[1].trim() : res.text.trim()
        setCode(generated)
        setShowAiRegen(false)
        setAiRegenPrompt('')
        toast.success('Plugin regenerated! Click Save to apply.')
      } else {
        toast.error(res?.error || 'Regeneration failed')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Regeneration failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleToggle = async (p: Plugin) => {
    try {
      const res = await window.api?.plugin?.toggle(p.id, !p.enabled)
      if (res?.ok) {
        toast.success(p.enabled ? 'Disabled' : 'Enabled')
        const updated = plugins.map(pl => pl.id === p.id ? { ...pl, enabled: p.enabled ? 0 : 1 } : pl)
        setPlugins(updated)
        if (selectedPlugin?.id === p.id) setSelectedPlugin({ ...selectedPlugin, enabled: p.enabled ? 0 : 1 })
      } else toast.error(res?.error || 'Failed')
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (p: Plugin) => {
    try {
      const res = await window.api?.plugin?.uninstall(p.file_name)
      if (res?.ok) {
        toast.success('Deleted')
        if (selectedPlugin?.id === p.id) {
          setSelectedPlugin(null)
          setCode('')
          setOriginalCode('')
        }
        load()
      } else toast.error(res?.error || 'Failed')
    } catch { toast.error('Failed') }
  }

  const isDirty = code !== originalCode

  return (
    <div className="h-[calc(100vh-3rem)] -m-6 flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Puzzle className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Plugin Editor</span>
          {selectedPlugin && (
            <Badge variant="outline" className="text-[10px] h-5 gap-1">
              <FileJson className="h-3 w-3" />
              {selectedPlugin.file_name}
              {isDirty && <span className="text-orange-500">●</span>}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setShowDocs(v => !v)}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Docs
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left sidebar */}
        <div className={cn(
          "border-r bg-muted/20 flex flex-col transition-all duration-200 shrink-0",
          collapsed ? "w-10" : "w-56"
        )}>
          <div className="h-9 border-b flex items-center justify-between px-2 shrink-0">
            {!collapsed && <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Explorer</span>}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCollapsed(v => !v)}
            >
              {collapsed ? <PanelRightOpen className="h-3.5 w-3.5" /> : <PanelRightClose className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {!collapsed && (
            <>
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-7 text-xs gap-1.5"
                  onClick={() => { setCreating(true); setSelectedPlugin(null); setShowDocs(false) }}
                >
                  <FilePlus className="h-3.5 w-3.5" />
                  New Plugin
                </Button>
              </div>
              <div className="flex-1 overflow-auto px-2 pb-2 space-y-0.5">
                {loading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                  </div>
                ) : plugins.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2">No plugins yet</div>
                ) : (
                  plugins.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(p)}
                      className={cn(
                        "w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                        selectedPlugin?.id === p.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <FileCode className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{p.name}</span>
                      {!p.enabled && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-auto shrink-0">Off</Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {showDocs ? (
            <DocsPanel onClose={() => setShowDocs(false)} />
          ) : creating ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
              <FilePlus className="h-10 w-10 text-muted-foreground/40" />
              <div className="text-center space-y-1">
                <p className="font-medium">Create a new plugin</p>
                <p className="text-sm text-muted-foreground">Describe what it does, or write code manually</p>
              </div>

              {/* AI Generation */}
              <div className="w-full max-w-lg space-y-3">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold">Generate with AI</p>
                  </div>
                  <textarea
                    placeholder="Describe what your plugin should do. E.g., 'A widget that shows my top 3 spending categories with progress bars and color coding'"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={handleGenerate}
                      disabled={generating}
                    >
                      {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      Generate Code
                    </Button>
                    <span className="text-[10px] text-muted-foreground">Requires AI provider configured</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted-foreground uppercase">or start manually</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="my-awesome-plugin"
                    value={newFileName}
                    onChange={e => setNewFileName(e.target.value)}
                    className="h-8 text-sm font-mono"
                    onKeyDown={e => e.key === 'Enter' && handleNewPlugin()}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">.plugin.js</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleNewPlugin} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
                    Create
                  </Button>
                </div>
              </div>
            </div>
          ) : selectedPlugin ? (
            <>
              {/* Editor toolbar */}
              <div className="h-9 border-b flex items-center justify-between px-3 shrink-0 bg-muted/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{selectedPlugin.file_name}</span>
                  {selectedPlugin.enabled ? (
                    <Badge className="bg-green-500/10 text-green-600 text-[10px] h-5 px-1.5 border-0 gap-1">
                      <Zap className="h-3 w-3" /> Enabled
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1">
                      <ToggleLeft className="h-3 w-3" /> Disabled
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => handleToggle(selectedPlugin)}
                  >
                    {selectedPlugin.enabled ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    {selectedPlugin.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Separator orientation="vertical" className="h-4 mx-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1 text-primary"
                    onClick={() => { setCreating(true); setSelectedPlugin(null); setShowDocs(false); setAiPrompt('') }}
                    title="Create new plugin with AI"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    New
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1 text-primary"
                    onClick={() => setShowAiRegen(true)}
                    title="Regenerate this plugin with AI"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Regenerate
                  </Button>
                  <Separator orientation="vertical" className="h-4 mx-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => setRunning(v => !v)}
                    disabled={!selectedPlugin.enabled}
                  >
                    <Play className="h-3.5 w-3.5" />
                    {running ? 'Stop' : 'Run'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-destructive hover:text-destructive gap-1"
                    onClick={() => handleDelete(selectedPlugin)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* AI Regenerate Panel */}
              {showAiRegen && (
                <div className="border-b bg-muted/20 p-3 space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wand2 className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold">Regenerate with AI</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowAiRegen(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <textarea
                    placeholder="Describe what you want changed. E.g., 'Add a second widget that shows monthly spending as a bar chart', or 'Make the colors match the app theme better'"
                    value={aiRegenPrompt}
                    onChange={e => setAiRegenPrompt(e.target.value)}
                    className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={handleRegenerate}
                      disabled={generating}
                    >
                      {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      {generating ? 'Regenerating...' : 'Regenerate'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAiRegen(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Tab bar */}
              <div className="h-8 border-b flex items-center px-2 gap-1 shrink-0 bg-muted/20">
                {[
                  { key: 'code', label: 'Code', icon: Code },
                  { key: 'preview', label: 'Preview', icon: Eye },
                  { key: 'split', label: 'Split', icon: Columns2 },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setEditorTab(tab.key as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                      editorTab === tab.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <tab.icon className="h-3 w-3" />
                    {tab.label}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {running ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 min-h-0 flex">
                {/* Code panel */}
                <div className={cn(
                  "flex flex-col min-h-0",
                  editorTab === 'code' ? "flex-1" : editorTab === 'split' ? "flex-1 border-r" : "hidden"
                )}>
                  <Editor
                    height="100%"
                    language="javascript"
                    theme={monacoTheme}
                    value={code}
                    onChange={v => setCode(v || '')}
                    onMount={editor => { editorRef.current = editor }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 8 },
                      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    }}
                  />
                </div>

                {/* Preview panel */}
                <div className={cn(
                  "flex flex-col min-h-0 bg-muted/10",
                  editorTab === 'preview' ? "flex-1" : editorTab === 'split' ? "flex-1" : "hidden"
                )}>
                  {running && selectedPlugin.enabled ? (
                    <div className="flex-1 overflow-auto p-3">
                      <PluginSandbox fileName={selectedPlugin.file_name} />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Play className="h-6 w-6 opacity-30" />
                      <p className="text-xs">
                        {selectedPlugin.enabled
                          ? 'Click Run to execute the plugin and see output'
                          : 'Enable the plugin first, then click Run'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <FileCode className="h-10 w-10 opacity-30" />
              <p className="text-sm">Select a plugin from the sidebar or create a new one</p>
              <Button size="sm" onClick={() => { setCreating(true); setShowDocs(false) }}>
                <Plus className="mr-2 h-4 w-4" /> New Plugin
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
