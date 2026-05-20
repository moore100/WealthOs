import { useState, useEffect, useRef } from 'react'
import { Loader2, AlertCircle, FileJson } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Widget {
  id: string
  title: string
  render: () => string
}

interface PluginResult {
  widgets: Widget[]
  error: string | null
}

function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '')
}

async function createPluginAPI() {
  return {
    html,
    async fetchExpenses(month?: string) {
      try { return await window.api?.expenses?.getAll(month ? { month } : {}) } catch { return [] }
    },
    async fetchIncome() {
      try { return await window.api?.income?.getAll() } catch { return [] }
    },
    async fetchCategories() {
      try { return await window.api?.categories?.getAll() } catch { return [] }
    },
    toast(message: string) {
      console.warn('[plugin toast]', message)
    },
    log: (...args: unknown[]) => console.log('[plugin]', ...args),
  }
}

export default function PluginSandbox({ fileName }: { fileName: string }) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<PluginResult>({ widgets: [], error: null })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const res = await window.api?.plugin?.getCode(fileName)
        if (!res?.ok || !res.code) {
          setResult({ widgets: [], error: res?.error || 'Could not load plugin code' })
          return
        }
        const code = res.code
        const api = await createPluginAPI()
        const widgets: Widget[] = []
        const pluginApi = {
          ...api,
          registerWidget(w: Widget) { widgets.push(w) },
        }

        // Normalize plugin code: handle both export default and module.exports
        let normalizedCode = code
        normalizedCode = normalizedCode.replace(/^\s*export\s+default\s*/, 'module.exports = ')
        normalizedCode = normalizedCode.replace(/export\s+default\s+([\w$]+)\s*;?\s*$/, '')

        const fn = new Function('module', 'api', '__html', normalizedCode)
        const mod: any = { exports: {} }
        fn(mod, pluginApi, html)

        // Call onInit if present
        const plugin = mod.exports
        if (plugin && typeof plugin.onInit === 'function') {
          plugin.onInit(pluginApi)
        }

        if (!cancelled) setResult({ widgets, error: null })
      } catch (e: any) {
        if (!cancelled) setResult({ widgets: [], error: e?.message || 'Plugin execution failed' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [fileName])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading plugin...
      </div>
    )
  }

  if (result.error) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Plugin Error</p>
          <p>{result.error}</p>
        </div>
      </div>
    )
  }

  if (result.widgets.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <FileJson className="h-4 w-4" />
        <span>Plugin loaded but registered no widgets.</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {result.widgets.map(w => (
        <Card key={w.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="px-3 py-2 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold">{w.title}</p>
            </div>
            <div
              className="plugin-widget-content"
              dangerouslySetInnerHTML={{ __html: w.render() }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
