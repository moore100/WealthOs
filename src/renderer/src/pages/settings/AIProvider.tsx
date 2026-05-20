import { useState, useEffect } from 'react'
import { KeyRound, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Cloud, HardDrive, Server, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

type Provider = 'openai' | 'ollama'

const OPENAI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (fast, cheap, recommended)' },
  { id: 'gpt-4o', name: 'GPT-4o (best quality)' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (legacy)' },
]

export default function AIProviderPage() {
  const [provider, setProvider] = useState<Provider>('openai')

  // OpenAI state
  const [openaiKey, setOpenaiKey] = useState('')
  const [savedOpenaiKey, setSavedOpenaiKey] = useState('')
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini')
  const [showKey, setShowKey] = useState(false)
  const [testingKey, setTestingKey] = useState(false)
  const [keyTestResult, setKeyTestResult] = useState<'success' | 'error' | null>(null)

  // Ollama state
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('llama3.2')
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [testingOllama, setTestingOllama] = useState(false)
  const [ollamaTestResult, setOllamaTestResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const cfg = await window.api?.llm?.getSettings()
        if (cfg) {
          setProvider(cfg.provider)
          setOpenaiKey(cfg.openaiKey || '')
          setSavedOpenaiKey(cfg.openaiKey || '')
          setOpenaiModel(cfg.openaiModel || 'gpt-4o-mini')
          setOllamaUrl(cfg.ollamaUrl || 'http://localhost:11434')
          setOllamaModel(cfg.ollamaModel || 'llama3.2')
        }
      } catch { /* ignore */ }
    }
    load()
  }, [])

  // Auto-fetch models on Ollama URL change
  useEffect(() => {
    if (provider === 'ollama') refreshOllamaModels()
  }, [provider])

  const refreshOllamaModels = async () => {
    setLoadingModels(true)
    try {
      const result = await window.api?.llm?.listOllamaModels(ollamaUrl)
      if (result?.ok) {
        setOllamaModels(result.models || [])
        if (result.models && result.models.length > 0 && !result.models.includes(ollamaModel)) {
          setOllamaModel(result.models[0])
        }
      } else {
        setOllamaModels([])
      }
    } catch { setOllamaModels([]) }
    finally { setLoadingModels(false) }
  }

  const handleTestKey = async () => {
    if (!openaiKey.trim()) return toast.error('Enter an API key first')
    setTestingKey(true); setKeyTestResult(null)
    try {
      const ok = await window.api?.ai?.testKey(openaiKey.trim())
      setKeyTestResult(ok ? 'success' : 'error')
    } catch { setKeyTestResult('error') }
    finally { setTestingKey(false) }
  }

  const handleTestOllama = async () => {
    setTestingOllama(true); setOllamaTestResult(null)
    try {
      const result = await window.api?.llm?.testOllama(ollamaUrl, ollamaModel)
      if (result?.ok) setOllamaTestResult({ ok: true, msg: `Connected. Model replied: "${(result.sample || '').slice(0, 60)}"` })
      else setOllamaTestResult({ ok: false, msg: result?.error || 'Connection failed' })
    } catch (e: any) {
      setOllamaTestResult({ ok: false, msg: e?.message || 'Connection failed' })
    }
    finally { setTestingOllama(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        llm_provider: provider,
        openai_model: openaiModel,
        ollama_url: ollamaUrl,
        ollama_model: ollamaModel,
      }
      if (openaiKey.trim() !== savedOpenaiKey) payload.openai_key = openaiKey.trim()
      console.log('[AIProvider] Saving payload:', payload)
      if (!window.api?.settings?.save) {
        throw new Error('Settings save API is not available. Please restart the app.')
      }
      const result = await window.api.settings.save(payload)
      console.log('[AIProvider] Save result:', result)
      setSavedOpenaiKey(openaiKey.trim())
      toast.success(`Saved. Using ${provider === 'openai' ? 'OpenAI' : 'Ollama (local)'}`)
    } catch (e: any) {
      console.error('[AIProvider] Save error:', e)
      toast.error(e?.message || 'Failed to save')
    }
    finally { setSaving(false) }
  }

  const maskedKey = savedOpenaiKey ? `${savedOpenaiKey.slice(0, 7)}${'•'.repeat(20)}${savedOpenaiKey.slice(-4)}` : ''

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">AI Provider</h2>
        <p className="text-sm text-muted-foreground">Choose between cloud (OpenAI) or local (Ollama) AI for all features</p>
      </div>

      {/* Provider Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setProvider('openai')}
          className={`text-left rounded-xl border-2 p-4 transition-all ${provider === 'openai' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
        >
          <div className="flex items-start justify-between mb-2">
            <Cloud className={`h-5 w-5 ${provider === 'openai' ? 'text-primary' : 'text-muted-foreground'}`} />
            {provider === 'openai' && <CheckCircle className="h-4 w-4 text-primary" />}
          </div>
          <h3 className="text-sm font-semibold">OpenAI (Cloud)</h3>
          <p className="mt-1 text-xs text-muted-foreground">High quality. Requires API key. Data sent to OpenAI servers.</p>
        </button>
        <button
          onClick={() => setProvider('ollama')}
          className={`text-left rounded-xl border-2 p-4 transition-all ${provider === 'ollama' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
        >
          <div className="flex items-start justify-between mb-2">
            <HardDrive className={`h-5 w-5 ${provider === 'ollama' ? 'text-primary' : 'text-muted-foreground'}`} />
            {provider === 'ollama' && <CheckCircle className="h-4 w-4 text-primary" />}
          </div>
          <h3 className="text-sm font-semibold">Ollama (Local)</h3>
          <p className="mt-1 text-xs text-muted-foreground">100% private. Runs on your machine. Quality depends on your model.</p>
        </button>
      </div>

      {provider === 'openai' && (
        <>
          <Alert>
            <KeyRound className="h-4 w-4" />
            <AlertDescription>
              Your API key is stored locally and only sent to OpenAI's servers. Get a key at{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">platform.openai.com/api-keys</a>.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">OpenAI API Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {savedOpenaiKey && (
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm font-mono">{maskedKey}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>{savedOpenaiKey ? 'Update Key' : 'Enter Key'}</Label>
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={e => { setOpenaiKey(e.target.value); setKeyTestResult(null) }}
                    className="pr-10 font-mono text-sm"
                  />
                  <button onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Model</Label>
                <Select value={openaiModel} onValueChange={setOpenaiModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPENAI_MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {keyTestResult && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${keyTestResult === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                  {keyTestResult === 'success'
                    ? <><CheckCircle className="h-4 w-4" /> API key is valid</>
                    : <><AlertCircle className="h-4 w-4" /> Invalid API key</>}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleTestKey} variant="outline" disabled={testingKey || !openaiKey.trim()}>
                  {testingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {testingKey ? 'Testing...' : 'Test Key'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {provider === 'ollama' && (
        <>
          <Alert>
            <Server className="h-4 w-4" />
            <AlertDescription>
              Install <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Ollama</a> on this machine, then run <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">ollama pull llama3.2</code> in a terminal. Your financial data NEVER leaves your computer.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Ollama Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Server URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={ollamaUrl}
                    onChange={e => setOllamaUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" onClick={refreshOllamaModels} disabled={loadingModels}>
                    {loadingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Model</Label>
                {ollamaModels.length > 0 ? (
                  <Select value={ollamaModel} onValueChange={setOllamaModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ollamaModels.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={ollamaModel}
                    onChange={e => setOllamaModel(e.target.value)}
                    placeholder="llama3.2"
                    className="font-mono text-sm"
                  />
                )}
                {ollamaModels.length === 0 && !loadingModels && (
                  <p className="text-[11px] text-amber-600">
                    No models detected. Click refresh after starting Ollama, or type a model name manually.
                  </p>
                )}
              </div>

              {ollamaTestResult && (
                <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${ollamaTestResult.ok ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                  {ollamaTestResult.ok
                    ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                  <span className="text-xs">{ollamaTestResult.msg}</span>
                </div>
              )}

              <Button onClick={handleTestOllama} variant="outline" disabled={testingOllama}>
                {testingOllama ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {testingOllama ? 'Testing...' : 'Test Connection'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recommended models</CardTitle>
              <CardDescription>Pull these in a terminal with <code className="font-mono">ollama pull &lt;name&gt;</code></CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="font-mono">llama3.2</span><span className="text-muted-foreground">3B · fast, decent quality</span></div>
              <div className="flex justify-between"><span className="font-mono">llama3.1:8b</span><span className="text-muted-foreground">8B · better reasoning</span></div>
              <div className="flex justify-between"><span className="font-mono">qwen2.5:7b</span><span className="text-muted-foreground">7B · strong at JSON/structured output</span></div>
              <div className="flex justify-between"><span className="font-mono">mistral</span><span className="text-muted-foreground">7B · solid all-rounder</span></div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
