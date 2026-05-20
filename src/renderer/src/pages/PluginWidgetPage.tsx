import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  ArrowLeft, Play, Edit3, ToggleLeft, ToggleRight, Loader2, AlertCircle,
  Box, FileJson
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import PluginSandbox from '@/components/PluginSandbox'

interface Plugin {
  id: number
  name: string
  description: string
  file_name: string
  enabled: number
}

export default function PluginWidgetPage() {
  const { fileName } = useParams<{ fileName: string }>()
  const navigate = useNavigate()
  const [plugin, setPlugin] = useState<Plugin | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [running, setRunning] = useState(false)
  const [runKey, setRunKey] = useState(0)

  useEffect(() => {
    load()
  }, [fileName])

  const load = async () => {
    setLoading(true)
    try {
      const res = await window.api?.plugin?.discover()
      if (res?.ok) {
        const list = (res.plugins || []) as Plugin[]
        const found = list.find(p => p.file_name === fileName)
        if (found) setPlugin(found)
      }
    } catch (e) {
      console.error('[PluginWidgetPage] load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async () => {
    if (!plugin) return
    setToggling(true)
    try {
      const res = await window.api?.plugin?.toggle(plugin.id, !plugin.enabled)
      if (res?.ok) {
        setPlugin({ ...plugin, enabled: plugin.enabled ? 0 : 1 })
        toast.success(plugin.enabled ? 'Plugin disabled' : 'Plugin enabled')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Toggle failed')
    } finally {
      setToggling(false)
    }
  }

  const handleRun = () => {
    setRunning(true)
    setRunKey(k => k + 1)
    setTimeout(() => setRunning(false), 500)
  }

  const handleDelete = async () => {
    if (!plugin) return
    const ok = confirm(`Delete "${plugin.name}"? This cannot be undone.`)
    if (!ok) return
    try {
      const res = await window.api?.plugin?.uninstall(plugin.file_name)
      if (res?.ok) {
        toast.success('Plugin deleted')
        navigate('/plugins')
      } else {
        toast.error(res?.error || 'Delete failed')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!plugin) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
        <FileJson className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Plugin not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/plugins')}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Plugins
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/plugins')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Box className="h-5 w-5 text-primary" />
              {plugin.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {plugin.description || plugin.file_name}
            </p>
          </div>
          <Badge variant="outline" className={cn(
            "text-[10px] h-5 ml-2",
            plugin.enabled ? "border-green-500/30 text-green-500" : "border-red-500/30 text-red-500"
          )}>
            {plugin.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleToggle}
            disabled={toggling}
          >
            {plugin.enabled ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
            {plugin.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleRun}
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => navigate('/plugins')}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Plugin output */}
      <Card>
        <CardContent className="p-4">
          {!plugin.enabled ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <AlertCircle className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">This plugin is disabled.</p>
              <Button variant="outline" size="sm" onClick={handleToggle}>
                <ToggleRight className="h-3.5 w-3.5 mr-1.5" /> Enable Plugin
              </Button>
            </div>
          ) : (
            <PluginSandbox key={runKey} fileName={plugin.file_name} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
