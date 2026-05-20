import { ipcMain, shell, net as electronNet } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'

const execAsync = promisify(exec)

// ---------- Helpers ----------

function isWindows() { return process.platform === 'win32' }

async function runCmd(cmd: string, timeoutMs = 5000): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: timeoutMs, windowsHide: true })
    return stdout
  } catch (e: any) {
    return e?.stdout || ''
  }
}

async function getSsid(): Promise<string | null> {
  if (!isWindows()) {
    // macOS: airport; Linux: iwgetid -r. Best-effort.
    if (process.platform === 'darwin') {
      const out = await runCmd('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I')
      const m = out.match(/\s+SSID:\s*(.+)/)
      return m ? m[1].trim() : null
    }
    const out = await runCmd('iwgetid -r')
    return out.trim() || null
  }
  const out = await runCmd('netsh wlan show interfaces')
  // Match "SSID                   : MyWifi" but NOT "BSSID"
  const lines = out.split(/\r?\n/)
  for (const line of lines) {
    const m = line.match(/^\s*SSID\s*:\s*(.+)$/)
    if (m && !/BSSID/i.test(line)) return m[1].trim()
  }
  return null
}

async function getSignalAndBand(): Promise<{ signal: number | null; band: string | null; bssid: string | null }> {
  if (!isWindows()) return { signal: null, band: null, bssid: null }
  const out = await runCmd('netsh wlan show interfaces')
  const signal = out.match(/Signal\s*:\s*(\d+)%/i)
  const band = out.match(/Radio type\s*:\s*([^\r\n]+)/i)
  const bssid = out.match(/^\s*BSSID\s*:\s*([0-9a-f:]+)/im)
  return {
    signal: signal ? parseInt(signal[1], 10) : null,
    band: band ? band[1].trim() : null,
    bssid: bssid ? bssid[1].trim() : null,
  }
}

async function getGateway(): Promise<string | null> {
  if (isWindows()) {
    // Use PowerShell which is reliable on modern Windows
    const out = await runCmd('powershell -NoProfile -Command "(Get-NetRoute -DestinationPrefix 0.0.0.0/0 -ErrorAction SilentlyContinue | Sort-Object -Property RouteMetric | Select-Object -First 1).NextHop"')
    const ip = out.trim().split(/\r?\n/).filter(Boolean)[0]
    if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip
    // Fallback to ipconfig
    const out2 = await runCmd('ipconfig')
    const m = out2.match(/Default Gateway[^\d]+(\d+\.\d+\.\d+\.\d+)/)
    return m ? m[1] : null
  }
  const out = await runCmd("ip route | awk '/default/ {print $3; exit}'")
  return out.trim() || null
}

function getLocalIpv4(): string | null {
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return null
}

async function getPublicInfo(): Promise<{ ip: string | null; isp: string | null; city: string | null; country: string | null }> {
  return new Promise((resolve) => {
    try {
      const req = electronNet.request({ url: 'https://ipwho.is/', method: 'GET' })
      let data = ''
      const timer = setTimeout(() => { try { req.abort() } catch {}; resolve({ ip: null, isp: null, city: null, country: null }) }, 6000)
      req.on('response', (resp) => {
        resp.on('data', (chunk) => { data += chunk.toString() })
        resp.on('end', () => {
          clearTimeout(timer)
          try {
            const j = JSON.parse(data)
            resolve({
              ip: j.ip || null,
              isp: j.connection?.isp || j.connection?.org || j.org || null,
              city: j.city || null,
              country: j.country || null,
            })
          } catch { resolve({ ip: null, isp: null, city: null, country: null }) }
        })
      })
      req.on('error', () => { clearTimeout(timer); resolve({ ip: null, isp: null, city: null, country: null }) })
      req.end()
    } catch {
      resolve({ ip: null, isp: null, city: null, country: null })
    }
  })
}

async function getArpDevices(): Promise<Array<{ ip: string; mac: string; vendor: string | null }>> {
  const out = await runCmd(isWindows() ? 'arp -a' : 'arp -n', 8000)
  const devices: Array<{ ip: string; mac: string; vendor: string | null }> = []
  const seen = new Set<string>()
  const re = /(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f:-]{17})/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(out)) !== null) {
    const ip = m[1]
    const mac = m[2].toLowerCase().replace(/-/g, ':')
    if (mac === '00:00:00:00:00:00' || mac === 'ff:ff:ff:ff:ff:ff') continue
    if (ip.endsWith('.255') || ip.startsWith('224.') || ip.startsWith('239.')) continue
    const key = ip + mac
    if (seen.has(key)) continue
    seen.add(key)
    devices.push({ ip, mac, vendor: macVendor(mac) })
  }
  return devices
}

// Tiny built-in OUI lookup — covers the most common consumer vendors.
function macVendor(mac: string): string | null {
  const prefix = mac.replace(/:/g, '').toUpperCase().slice(0, 6)
  const ouis: Record<string, string> = {
    'F4F5DB': 'Google', '3C5AB4': 'Google', '6CADF8': 'Google',
    'A45E60': 'Apple', '3C0754': 'Apple', 'F0B479': 'Apple', '8C8590': 'Apple', '40A6D9': 'Apple',
    'B827EB': 'Raspberry Pi', 'DCA632': 'Raspberry Pi', 'E45F01': 'Raspberry Pi',
    '001A11': 'Google', '54E061': 'Samsung', '5C0A5B': 'Samsung', '8C77F7': 'Samsung',
    'F0272D': 'Xiaomi', '64B473': 'Xiaomi', '00EC0A': 'Xiaomi',
    '00037F': 'Huawei', '001882': 'Huawei', '283152': 'Huawei', '4C5499': 'Huawei',
    '50C7BF': 'TP-Link', '14CC20': 'TP-Link', 'A0F3C1': 'TP-Link', 'B0BE76': 'TP-Link',
    '00904C': 'Epigram', '0050BA': 'D-Link', '0017A4': 'D-Link', '14D64D': 'D-Link',
    '00248C': 'ASUSTek', '04D9F5': 'ASUSTek', '1C872C': 'ASUSTek',
    '001731': 'Cisco-Linksys', '6038E0': 'Belkin', '94103E': 'Belkin',
    '00226B': 'Cisco-Linksys', 'C0C1C0': 'Cisco-Linksys',
    'F8632E': 'Sony', '7CDD90': 'Shenzhen Bilian', '001A6C': 'Comcast',
    '742F68': 'Azurewave', 'BC8385': 'Roku',
    '0CC47E': 'Intel', '94659C': 'Intel', '5CE0C5': 'Intel',
    '0026B9': 'Dell', 'F8B156': 'Dell', '8030DC': 'Dell',
    'D094660': 'OnePlus', 'C40BCB': 'OnePlus',
  }
  return ouis[prefix] || null
}

// ---------- Speed test ----------

async function speedTest(): Promise<{ downloadMbps: number; uploadMbps: number; pingMs: number; jitterMs: number; server: string }> {
  // Cloudflare Speed Test — no auth, no rate limits, very fast.
  const downloadBytes = 25_000_000 // 25 MB
  const uploadBytes = 5_000_000 // 5 MB
  const server = 'speed.cloudflare.com'

  // Ping (10 samples)
  const pings: number[] = []
  for (let i = 0; i < 10; i++) {
    const t0 = Date.now()
    await new Promise<void>((resolve) => {
      try {
        const req = electronNet.request({ url: 'https://speed.cloudflare.com/__down?bytes=0', method: 'GET' })
        const timer = setTimeout(() => { try { req.abort() } catch {}; resolve() }, 3000)
        req.on('response', (r) => { r.on('data', () => {}); r.on('end', () => { clearTimeout(timer); resolve() }) })
        req.on('error', () => { clearTimeout(timer); resolve() })
        req.end()
      } catch { resolve() }
    })
    pings.push(Date.now() - t0)
  }
  pings.sort((a, b) => a - b)
  const pingMs = pings[Math.floor(pings.length / 2)]
  const jitterMs = Math.max(0, pings[pings.length - 1] - pings[0])

  // Download
  const dlStart = Date.now()
  let dlBytes = 0
  await new Promise<void>((resolve) => {
    try {
      const req = electronNet.request({ url: `https://speed.cloudflare.com/__down?bytes=${downloadBytes}`, method: 'GET' })
      const timer = setTimeout(() => { try { req.abort() } catch {}; resolve() }, 20000)
      req.on('response', (resp) => {
        resp.on('data', (chunk: Buffer) => { dlBytes += chunk.length })
        resp.on('end', () => { clearTimeout(timer); resolve() })
      })
      req.on('error', () => { clearTimeout(timer); resolve() })
      req.end()
    } catch { resolve() }
  })
  const dlSeconds = (Date.now() - dlStart) / 1000
  const downloadMbps = dlSeconds > 0 ? (dlBytes * 8) / 1_000_000 / dlSeconds : 0

  // Upload
  const upBuf = Buffer.alloc(uploadBytes, 'a')
  const upStart = Date.now()
  await new Promise<void>((resolve) => {
    try {
      const req = electronNet.request({ url: 'https://speed.cloudflare.com/__up', method: 'POST' })
      req.setHeader('Content-Type', 'application/octet-stream')
      const timer = setTimeout(() => { try { req.abort() } catch {}; resolve() }, 20000)
      req.on('response', (resp) => { resp.on('data', () => {}); resp.on('end', () => { clearTimeout(timer); resolve() }) })
      req.on('error', () => { clearTimeout(timer); resolve() })
      req.write(upBuf)
      req.end()
    } catch { resolve() }
  })
  const upSeconds = (Date.now() - upStart) / 1000
  const uploadMbps = upSeconds > 0 ? (uploadBytes * 8) / 1_000_000 / upSeconds : 0

  return {
    downloadMbps: Math.round(downloadMbps * 10) / 10,
    uploadMbps: Math.round(uploadMbps * 10) / 10,
    pingMs,
    jitterMs,
    server,
  }
}

// ---------- Router proxy fetch ----------

/**
 * Proxy HTTP requests to the LAN router. This bypasses CORS and lets
 * the renderer talk to 192.168.x.x admin pages.
 *
 * SECURITY: only allows private RFC1918 IP ranges.
 */
function isPrivateIp(host: string): boolean {
  return (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^127\./.test(host) ||
    host === 'localhost'
  )
}

async function routerFetch(opts: { url: string; method?: string; headers?: Record<string, string>; body?: string }): Promise<{ ok: boolean; status?: number; body?: string; headers?: Record<string, string>; error?: string }> {
  try {
    const u = new URL(opts.url)
    if (!isPrivateIp(u.hostname)) {
      return { ok: false, error: 'Only private LAN IPs are allowed for router fetches' }
    }
    return await new Promise((resolve) => {
      const req = electronNet.request({ url: opts.url, method: opts.method || 'GET' })
      if (opts.headers) for (const [k, v] of Object.entries(opts.headers)) req.setHeader(k, v)
      let body = ''
      const respHeaders: Record<string, string> = {}
      const timer = setTimeout(() => { try { req.abort() } catch {}; resolve({ ok: false, error: 'Timeout' }) }, 8000)
      req.on('response', (resp) => {
        const h = resp.headers as Record<string, string | string[]>
        for (const [k, v] of Object.entries(h)) respHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v)
        resp.on('data', (chunk: Buffer) => { body += chunk.toString() })
        resp.on('end', () => {
          clearTimeout(timer)
          resolve({ ok: true, status: resp.statusCode, body, headers: respHeaders })
        })
      })
      req.on('error', (e: any) => { clearTimeout(timer); resolve({ ok: false, error: e?.message || String(e) }) })
      if (opts.body) req.write(opts.body)
      req.end()
    })
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) }
  }
}

async function routerProbe(gateway: string): Promise<{ brand: string | null; loginUrl: string; title: string | null; serverHeader: string | null }> {
  const url = `http://${gateway}/`
  const r = await routerFetch({ url })
  if (!r.ok || !r.body) return { brand: null, loginUrl: url, title: null, serverHeader: r.headers?.server || null }
  const body = r.body.toLowerCase()
  const server = (r.headers?.server || '').toLowerCase()
  const titleMatch = r.body.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch ? titleMatch[1].trim() : null

  let brand: string | null = null
  if (body.includes('huawei') || server.includes('huawei')) brand = 'Huawei'
  else if (body.includes('tp-link') || body.includes('tplink') || body.includes('archer')) brand = 'TP-Link'
  else if (body.includes('mikrotik')) brand = 'MikroTik'
  else if (body.includes('asus') || body.includes('asuswrt')) brand = 'ASUS'
  else if (body.includes('netgear')) brand = 'Netgear'
  else if (body.includes('linksys')) brand = 'Linksys'
  else if (body.includes('d-link') || body.includes('dlink')) brand = 'D-Link'
  else if (body.includes('zte')) brand = 'ZTE'
  else if (body.includes('xfinity') || body.includes('comcast')) brand = 'Xfinity'
  else if (body.includes('safaricom')) brand = 'Safaricom'

  return { brand, loginUrl: url, title, serverHeader: r.headers?.server || null }
}

// ---------- Setup ----------

export function setupNetworkHandlers() {
  ipcMain.handle('network:info', async () => {
    const [ssid, sig, gateway, pub] = await Promise.all([
      getSsid(),
      getSignalAndBand(),
      getGateway(),
      getPublicInfo(),
    ])
    return {
      ssid,
      signal: sig.signal,
      band: sig.band,
      bssid: sig.bssid,
      gateway,
      localIp: getLocalIpv4(),
      publicIp: pub.ip,
      isp: pub.isp,
      city: pub.city,
      country: pub.country,
      hostname: os.hostname(),
      platform: process.platform,
    }
  })

  ipcMain.handle('network:devices', async () => {
    const devices = await getArpDevices()
    return { devices }
  })

  ipcMain.handle('network:speedtest', async () => {
    try {
      return { ok: true, result: await speedTest() }
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) }
    }
  })

  ipcMain.handle('network:routerFetch', async (_e, opts) => {
    return await routerFetch(opts)
  })

  ipcMain.handle('network:routerProbe', async (_e, gateway: string) => {
    return await routerProbe(gateway)
  })

  ipcMain.handle('network:openRouter', async (_e, gateway: string) => {
    try {
      await shell.openExternal(`http://${gateway}/`)
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message || String(e) }
    }
  })
}
