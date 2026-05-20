import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Wifi, Global, Activity, Refresh, ExportSquare, MonitorMobbile,
  ArrowDown2, ArrowUp2, Routing2, Send2, Profile, Code, Cpu,
} from 'iconsax-react'

type NetInfo = {
  ssid: string | null
  signal: number | null
  band: string | null
  bssid: string | null
  gateway: string | null
  localIp: string | null
  publicIp: string | null
  isp: string | null
  city: string | null
  country: string | null
  hostname: string
  platform: string
}

type Device = { ip: string; mac: string; vendor: string | null }
type SpeedResult = { downloadMbps: number; uploadMbps: number; pingMs: number; jitterMs: number; server: string }
type Probe = { brand: string | null; loginUrl: string; title: string | null; serverHeader: string | null }

export default function ISPPage() {
  const [info, setInfo] = useState<NetInfo | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [probe, setProbe] = useState<Probe | null>(null)
  const [speed, setSpeed] = useState<SpeedResult | null>(null)
  const [running, setRunning] = useState(false)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [loadingDevices, setLoadingDevices] = useState(false)

  // Router admin form
  const [routerUser, setRouterUser] = useState('admin')
  const [routerPass, setRouterPass] = useState('')
  const [routerResp, setRouterResp] = useState<string>('')
  const [routerStatus, setRouterStatus] = useState<number | null>(null)

  const webviewRef = useRef<any>(null)
  const [webviewUrl, setWebviewUrl] = useState<string>('')

  const loadInfo = async () => {
    setLoadingInfo(true)
    try {
      const i = await window.api?.network?.info()
      setInfo(i)
      if (i?.gateway) {
        const p = await window.api?.network?.routerProbe(i.gateway)
        setProbe(p)
        setWebviewUrl(`http://${i.gateway}/`)
      }
    } catch (e: any) {
      toast.error('Failed to read network info: ' + (e?.message || e))
    } finally {
      setLoadingInfo(false)
    }
  }

  const loadDevices = async () => {
    setLoadingDevices(true)
    try {
      const d = await window.api?.network?.devices()
      setDevices(d?.devices || [])
    } catch (e: any) {
      toast.error('ARP scan failed: ' + (e?.message || e))
    } finally {
      setLoadingDevices(false)
    }
  }

  useEffect(() => {
    loadInfo()
    loadDevices()
  }, [])

  const runSpeed = async () => {
    setRunning(true)
    setSpeed(null)
    try {
      const r = await window.api?.network?.speedtest()
      if (r?.ok && r.result) {
        setSpeed(r.result)
        toast.success(`${r.result.downloadMbps} ↓ / ${r.result.uploadMbps} ↑ Mbps`)
      } else {
        toast.error('Speed test failed: ' + (r?.error || 'unknown'))
      }
    } finally {
      setRunning(false)
    }
  }

  const openRouterExternal = async () => {
    if (!info?.gateway) return
    await window.api?.network?.openRouter(info.gateway)
  }

  const tryRouterLogin = async () => {
    if (!info?.gateway) { toast.error('No gateway detected'); return }
    setRouterResp('')
    setRouterStatus(null)
    const url = `http://${info.gateway}/`
    // Most home routers use Basic auth or a form POST. We try Basic first.
    const auth = btoa(`${routerUser}:${routerPass}`)
    const r = await window.api?.network?.routerFetch({
      url,
      method: 'GET',
      headers: { Authorization: `Basic ${auth}` },
    })
    setRouterStatus(r?.status || null)
    if (r?.ok) {
      const snippet = (r.body || '').slice(0, 800)
      setRouterResp(snippet)
      if (r.status && r.status < 400) toast.success(`Connected to router (${r.status})`)
      else toast.warning(`Router responded ${r.status} — credentials may be wrong or it needs form login`)
    } else {
      toast.error('Router fetch failed: ' + (r?.error || 'unknown'))
    }
  }

  const reloadWebview = () => {
    try { webviewRef.current?.reload?.() } catch {}
  }

  const sigColor = (s: number | null) => {
    if (s == null) return 'text-muted-foreground'
    if (s >= 70) return 'text-emerald-500'
    if (s >= 40) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Routing2 className="h-6 w-6 text-primary" /> ISP &amp; Network
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live view of your connection, gateway and devices on the LAN.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadInfo} disabled={loadingInfo}>
          <Refresh className="h-4 w-4 mr-2" />
          {loadingInfo ? 'Reading…' : 'Refresh'}
        </Button>
      </div>

      {/* Connection summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">WiFi</p>
              <Wifi className={`h-4 w-4 ${sigColor(info?.signal ?? null)}`} />
            </div>
            <p className="text-lg font-bold mt-1 truncate">{info?.ssid || 'Not connected'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {info?.signal != null ? `${info.signal}% signal` : ''}
              {info?.band ? ` • ${info.band}` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Gateway</p>
              <Routing2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold mt-1 font-mono">{info?.gateway || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{probe?.brand ? `${probe.brand} router` : probe?.title || 'Probing…'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Public IP</p>
              <Global className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold mt-1 font-mono truncate">{info?.publicIp || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{[info?.city, info?.country].filter(Boolean).join(', ') || ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">ISP</p>
              <Profile className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold mt-1 truncate">{info?.isp || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono truncate">{info?.localIp || ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Speed test */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Speed test</CardTitle>
          <Button size="sm" onClick={runSpeed} disabled={running}>
            {running ? 'Running…' : 'Run test'}
          </Button>
        </CardHeader>
        <CardContent>
          {running && !speed && (
            <p className="text-sm text-muted-foreground">Pinging Cloudflare, downloading 25 MB then uploading 5 MB… (~10-20s)</p>
          )}
          {speed && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><ArrowDown2 className="h-3 w-3" /> Download</p>
                <p className="text-2xl font-bold text-emerald-500">{speed.downloadMbps} <span className="text-sm text-muted-foreground">Mbps</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><ArrowUp2 className="h-3 w-3" /> Upload</p>
                <p className="text-2xl font-bold text-sky-500">{speed.uploadMbps} <span className="text-sm text-muted-foreground">Mbps</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Send2 className="h-3 w-3" /> Ping</p>
                <p className="text-2xl font-bold">{speed.pingMs} <span className="text-sm text-muted-foreground">ms</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Jitter</p>
                <p className="text-2xl font-bold">{speed.jitterMs} <span className="text-sm text-muted-foreground">ms</span></p>
              </div>
            </div>
          )}
          {!speed && !running && (
            <p className="text-sm text-muted-foreground">Click "Run test" to measure your current download, upload, ping &amp; jitter.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Devices on LAN */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><MonitorMobbile className="h-4 w-4" /> Devices on this network</CardTitle>
            <Button variant="outline" size="sm" onClick={loadDevices} disabled={loadingDevices}>
              <Refresh className="h-4 w-4 mr-2" />
              {loadingDevices ? 'Scanning…' : 'Rescan'}
            </Button>
          </CardHeader>
          <CardContent>
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No devices visible yet. Try pinging your network or rescan.</p>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {devices.map((d) => (
                  <div key={d.ip + d.mac} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-mono">{d.ip}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{d.mac}</p>
                      </div>
                    </div>
                    {d.vendor && <Badge variant="secondary" className="shrink-0">{d.vendor}</Badge>}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">Source: system ARP cache. Devices show up after they've talked to your router recently.</p>
          </CardContent>
        </Card>

        {/* Router admin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Code className="h-4 w-4" /> Router admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {info?.gateway ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{probe?.brand || 'Unknown brand'}</Badge>
                  <span className="text-muted-foreground font-mono">{info.gateway}</span>
                  {probe?.serverHeader && <span className="text-xs text-muted-foreground truncate">{probe.serverHeader}</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="ruser" className="text-xs">Username</Label>
                    <Input id="ruser" value={routerUser} onChange={(e) => setRouterUser(e.target.value)} placeholder="admin" />
                  </div>
                  <div>
                    <Label htmlFor="rpass" className="text-xs">Password</Label>
                    <Input id="rpass" type="password" value={routerPass} onChange={(e) => setRouterPass(e.target.value)} placeholder="••••••" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={tryRouterLogin} className="flex-1">
                    Test connection
                  </Button>
                  <Button size="sm" variant="outline" onClick={openRouterExternal}>
                    <ExportSquare className="h-4 w-4 mr-2" /> Open in browser
                  </Button>
                </div>
                {routerStatus != null && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">HTTP </span>
                    <span className={routerStatus < 400 ? 'text-emerald-500' : 'text-amber-500'}>{routerStatus}</span>
                  </div>
                )}
                {routerResp && (
                  <pre className="text-[10px] bg-muted/40 p-2 rounded max-h-32 overflow-auto font-mono whitespace-pre-wrap">{routerResp}</pre>
                )}
                <p className="text-xs text-muted-foreground">
                  Most home routers (Huawei, TP-Link, ZTE, D-Link) require a form-based login that varies by firmware. Use "Open in browser" or the embedded view below to log in manually.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No gateway detected. Are you connected to a network?</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Embedded router admin webview */}
      {info?.gateway && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Code className="h-4 w-4" /> Embedded admin page</CardTitle>
            <div className="flex gap-2">
              <Input
                value={webviewUrl}
                onChange={(e) => setWebviewUrl(e.target.value)}
                className="w-80 font-mono text-xs"
              />
              <Button size="sm" variant="outline" onClick={reloadWebview}><Refresh className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* @ts-expect-error webview is a built-in Electron element */}
            <webview
              ref={webviewRef}
              src={webviewUrl}
              style={{ width: '100%', height: '600px', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
              allowpopups="true"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Loads your router's admin page directly. Log in with your router credentials to manage WiFi, devices, port forwarding, etc.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
