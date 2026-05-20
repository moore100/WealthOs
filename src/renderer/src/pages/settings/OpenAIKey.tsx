import { useState, useEffect } from 'react'
import { KeyRound, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

export default function OpenAIKeyPage() {
  const [key, setKey] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [show, setShow] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await window.api?.settings?.get()
        if (settings?.openai_key) {
          setSavedKey(settings.openai_key)
          setKey(settings.openai_key)
        }
      } catch { /* ignore */ }
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!key.trim()) return toast.error('Please enter an API key')
    setSaving(true)
    try {
      await window.api?.settings?.save({ openai_key: key.trim() })
      setSavedKey(key.trim())
      toast.success('API key saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleTest = async () => {
    if (!key.trim()) return toast.error('Please enter an API key first')
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.api?.ai?.testKey(key.trim())
      setTestResult(result ? 'success' : 'error')
    } catch {
      setTestResult('error')
    } finally { setTesting(false) }
  }

  const handleRemove = async () => {
    try {
      await window.api?.settings?.save({ openai_key: '' })
      setKey('')
      setSavedKey('')
      setTestResult(null)
      toast.success('API key removed')
    } catch { toast.error('Failed to remove') }
  }

  const maskedKey = savedKey ? `${savedKey.slice(0, 7)}${'•'.repeat(20)}${savedKey.slice(-4)}` : ''

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">OpenAI API Key</h2>
        <p className="text-sm text-muted-foreground">Connect your OpenAI account for AI-powered features</p>
      </div>

      <Alert>
        <KeyRound className="h-4 w-4" />
        <AlertDescription>
          Your API key is stored locally on your device and never sent to any external servers other than OpenAI.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">API Key</CardTitle>
          <CardDescription>
            Get your API key from{' '}
            <a href="https://platform.openai.com/api-keys" className="text-primary underline" target="_blank" rel="noopener noreferrer">
              platform.openai.com/api-keys
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {savedKey && !show && (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm font-mono">{maskedKey}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{savedKey ? 'Update Key' : 'Enter Key'}</Label>
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                placeholder="sk-..."
                value={key}
                onChange={e => { setKey(e.target.value); setTestResult(null) }}
                className="pr-10 font-mono text-sm"
              />
              <button
                onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${testResult === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
              {testResult === 'success'
                ? <><CheckCircle className="h-4 w-4" /> API key is valid and working</>
                : <><AlertCircle className="h-4 w-4" /> Invalid API key — please check and try again</>
              }
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleTest} variant="outline" disabled={testing || !key.trim()}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {testing ? 'Testing...' : 'Test Key'}
            </Button>
            <Button onClick={handleSave} disabled={saving || !key.trim() || key === savedKey}>
              {saving ? 'Saving...' : 'Save Key'}
            </Button>
            {savedKey && (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleRemove}>
                Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">AI Features</CardTitle>
          <CardDescription>Features enabled with your API key</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { name: 'AI Chat', desc: 'Ask questions about your finances in natural language' },
              { name: 'AI Insights', desc: 'Get personalized recommendations and financial analysis' },
              { name: 'Smart Categorization', desc: 'Automatically categorize expenses' },
              { name: 'Financial Health Report', desc: 'Detailed AI-powered health analysis' },
            ].map(f => (
              <div key={f.name} className="flex items-start gap-3 py-2">
                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${savedKey ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
