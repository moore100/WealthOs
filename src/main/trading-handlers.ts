import { ipcMain } from 'electron'
import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv, createHmac } from 'crypto'
import { getDb } from '../db/database'

// ─── Constants ─────────────────────────────────────────────────────────
const BINANCE_BASE = 'https://api.binance.com'
const BINANCE_TESTNET = 'https://testnet.binance.vision'
const BINANCE_DEMO = 'https://demo-api.binance.com'

// ─── Encryption (same scheme as vault sync) ──────────────────────────────
function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, 100000, 32, 'sha256')
}

function encryptString(plain: string, password: string): string {
  const salt = randomBytes(16)
  const iv = randomBytes(16)
  const key = deriveKey(password, salt)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([salt, iv, authTag, encrypted]).toString('base64')
}

function decryptString(b64: string, password: string): string {
  const data = Buffer.from(b64, 'base64')
  if (data.length < 48) throw new Error('Invalid encrypted data')
  const salt = data.slice(0, 16)
  const iv = data.slice(16, 32)
  const authTag = data.slice(32, 48)
  const encrypted = data.slice(48)
  const key = deriveKey(password, salt)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

// Machine-specific encryption key derived from app path (not truly secret but better than hardcoded)
function getMachineKey(): string {
  const { app } = require('electron')
  const base = app.getPath('userData') + process.platform + process.arch
  return createHmac('sha256', 'wealthos-trading-v1').update(base).digest('hex').slice(0, 32)
}

// ─── Binance API Helpers ─────────────────────────────────────────────────
function signQuery(query: string, secret: string): string {
  return createHmac('sha256', secret).update(query).digest('hex')
}

function getBinanceBase(mode?: string): string {
  if (mode === 'demo') return BINANCE_DEMO
  if (mode === 'testnet') return BINANCE_TESTNET
  return BINANCE_BASE
}

async function binanceRequest(opts: {
  endpoint: string
  method?: 'GET' | 'POST' | 'DELETE'
  params?: Record<string, string | number | undefined>
  apiKey: string
  apiSecret: string
  mode?: string
}) {
  const base = getBinanceBase(opts.mode)
  const timestamp = Date.now()
  const params = new URLSearchParams()
  params.append('timestamp', String(timestamp))
  if (opts.params) {
    Object.entries(opts.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v))
    })
  }
  const query = params.toString()
  const signature = signQuery(query, opts.apiSecret)
  const url = `${base}${opts.endpoint}?${query}&signature=${signature}`

  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: {
      'X-MBX-APIKEY': opts.apiKey,
      'Content-Type': 'application/json',
    },
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body.msg || `HTTP ${res.status}`
    throw new Error(`${msg} (${url})`)
  }
  return body
}

// ─── Database Helpers ────────────────────────────────────────────────────
function getActiveBroker(): any {
  const db = getDb()
  return db.prepare('SELECT * FROM trading_brokers WHERE is_active = 1 LIMIT 1').get()
}

function getBrokers(): any[] {
  const db = getDb()
  return db.prepare('SELECT id, platform, label, mode, is_active, created_at FROM trading_brokers ORDER BY created_at DESC').all()
}

// ─── IPC Handlers ────────────────────────────────────────────────────────
export function setupTradingHandlers(): void {
  const machineKey = getMachineKey()

  // ── CRUD Brokers ──────────────────────────────────────────────────────
  ipcMain.handle('trading:getBrokers', () => getBrokers())

  ipcMain.handle('trading:addBroker', (_e, data: any) => {
    const db = getDb()
    const keyEnc = data.apiKey ? encryptString(data.apiKey, machineKey) : null
    const secretEnc = data.apiSecret ? encryptString(data.apiSecret, machineKey) : null
    const r = db.prepare(`
      INSERT INTO trading_brokers (platform, label, api_key_encrypted, api_secret_encrypted, mode, is_active, config)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.platform || 'binance',
      data.label || 'Binance Account',
      keyEnc,
      secretEnc,
      data.mode || 'testnet',
      data.isActive ? 1 : 0,
      JSON.stringify(data.config || {})
    )
    return db.prepare('SELECT id, platform, label, mode, is_active, created_at FROM trading_brokers WHERE id = ?').get(r.lastInsertRowid)
  })

  ipcMain.handle('trading:updateBroker', (_e, id: number, data: any) => {
    const db = getDb()
    const sets: string[] = []
    const vals: any[] = []
    if (data.label !== undefined) { sets.push('label = ?'); vals.push(data.label) }
    if (data.mode !== undefined) { sets.push('mode = ?'); vals.push(data.mode) }
    if (data.isActive !== undefined) { sets.push('is_active = ?'); vals.push(data.isActive ? 1 : 0) }
    if (data.apiKey) { sets.push('api_key_encrypted = ?'); vals.push(encryptString(data.apiKey, machineKey)) }
    if (data.apiSecret) { sets.push('api_secret_encrypted = ?'); vals.push(encryptString(data.apiSecret, machineKey)) }
    if (data.config) { sets.push('config = ?'); vals.push(JSON.stringify(data.config)) }
    if (sets.length === 0) return null
    vals.push(id)
    db.prepare(`UPDATE trading_brokers SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

    // Ensure only one active broker
    if (data.isActive) {
      db.prepare('UPDATE trading_brokers SET is_active = 0 WHERE id != ?').run(id)
    }
    return db.prepare('SELECT id, platform, label, mode, is_active, created_at FROM trading_brokers WHERE id = ?').get(id)
  })

  ipcMain.handle('trading:deleteBroker', (_e, id: number) => {
    const db = getDb()
    db.prepare('DELETE FROM trading_brokers WHERE id = ?').run(id)
    return true
  })

  // ── Connection Test ───────────────────────────────────────────────────
  ipcMain.handle('trading:testConnection', async (_e, brokerId?: number) => {
    const db = getDb()
    const broker = brokerId
      ? db.prepare('SELECT * FROM trading_brokers WHERE id = ?').get(brokerId)
      : getActiveBroker()
    if (!broker) throw new Error('No broker configured')
    if (!broker.api_key_encrypted || !broker.api_secret_encrypted) throw new Error('Missing API credentials')

    const apiKey = decryptString(broker.api_key_encrypted, machineKey)
    const apiSecret = decryptString(broker.api_secret_encrypted, machineKey)

    try {
      const account = await binanceRequest({
        endpoint: '/api/v3/account',
        apiKey,
        apiSecret,
        mode: broker.mode,
      })
      return { ok: true, account: { canTrade: account.canTrade, balances: account.balances?.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0).slice(0, 10) } }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })

  // ── Place Order ───────────────────────────────────────────────────────
  ipcMain.handle('trading:placeOrder', async (_e, order: any) => {
    const broker = getActiveBroker()
    if (!broker) throw new Error('No active broker. Please connect a trading account first.')
    if (!broker.api_key_encrypted || !broker.api_secret_encrypted) throw new Error('Missing API credentials')

    const apiKey = decryptString(broker.api_key_encrypted, machineKey)
    const apiSecret = decryptString(broker.api_secret_encrypted, machineKey)

    const symbol = order.symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase() // robust normalize
    const side = order.side.toUpperCase() // BUY or SELL
    const type = (order.type || 'MARKET').toUpperCase()

    const params: Record<string, any> = { symbol, side, type }
    if (type === 'MARKET' && order.quoteOrderQty) {
      params.quoteOrderQty = order.quoteOrderQty
    } else {
      params.quantity = order.quantity
    }
    if (type === 'LIMIT') {
      params.timeInForce = 'GTC'
      params.price = order.price
    }

    const result = await binanceRequest({
      endpoint: '/api/v3/order',
      method: 'POST',
      params,
      apiKey,
      apiSecret,
      mode: broker.mode,
    })

    // Record in local DB
    const db = getDb()
    db.prepare(`
      INSERT INTO trading_trades (broker_id, symbol, side, quantity, entry_price, stop_loss, take_profit, status, external_order_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      broker.id,
      order.symbol,
      order.side,
      order.quantity || order.quoteOrderQty || 0,
      order.price || result.fills?.[0]?.price || 0,
      order.stopLoss || null,
      order.takeProfit || null,
      'open',
      String(result.orderId)
    )

    return { ok: true, orderId: result.orderId, status: result.status }
  })

  // ── Get Open Orders ───────────────────────────────────────────────────
  ipcMain.handle('trading:getOpenOrders', async (_e, symbol?: string) => {
    const broker = getActiveBroker()
    if (!broker) return { ok: false, error: 'No active broker' }

    const apiKey = decryptString(broker.api_key_encrypted, machineKey)
    const apiSecret = decryptString(broker.api_secret_encrypted, machineKey)

    const result = await binanceRequest({
      endpoint: '/api/v3/openOrders',
      apiKey,
      apiSecret,
      mode: broker.mode,
      params: symbol ? { symbol: symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase() } : {},
    })
    return { ok: true, orders: result }
  })

  // ── Cancel Order ──────────────────────────────────────────────────────
  ipcMain.handle('trading:cancelOrder', async (_e, symbol: string, orderId: string) => {
    const broker = getActiveBroker()
    if (!broker) throw new Error('No active broker')

    const apiKey = decryptString(broker.api_key_encrypted, machineKey)
    const apiSecret = decryptString(broker.api_secret_encrypted, machineKey)

    const result = await binanceRequest({
      endpoint: '/api/v3/order',
      method: 'DELETE',
      apiKey,
      apiSecret,
      mode: broker.mode,
      params: { symbol: symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase(), orderId },
    })

    // Update local DB
    const db = getDb()
    db.prepare("UPDATE trading_trades SET status = 'cancelled', closed_at = datetime('now') WHERE external_order_id = ?").run(orderId)

    return { ok: true, result }
  })

  // ── Local Trades ──────────────────────────────────────────────────────
  ipcMain.handle('trading:getTrades', () => {
    const db = getDb()
    return db.prepare('SELECT * FROM trading_trades ORDER BY created_at DESC').all()
  })

  ipcMain.handle('trading:getTradesBySymbol', (_e, symbol: string) => {
    const db = getDb()
    const clean = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    return db.prepare(
      "SELECT * FROM trading_trades WHERE REPLACE(REPLACE(symbol, '/', ''), '-', '') = ? ORDER BY created_at DESC"
    ).all(clean)
  })

  ipcMain.handle('trading:closeTrade', (_e, tradeId: number, pnl?: number) => {
    const db = getDb()
    db.prepare("UPDATE trading_trades SET status = 'closed', pnl = ?, closed_at = datetime('now') WHERE id = ?").run(pnl ?? null, tradeId)
    return true
  })

  // ═══════════════════════════════════════════════════════════════════════
  //  AUTO-TRADE ENGINE
  // ═══════════════════════════════════════════════════════════════════════

  let autoTradeInterval: ReturnType<typeof setInterval> | null = null
  let isAutoTrading = false

  async function fetchBinancePrice(symbol: string, mode?: string): Promise<number | null> {
    try {
      const base = getBinanceBase(mode)
      const clean = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      const res = await fetch(`${base}/api/v3/ticker/price?symbol=${clean}`)
      const data = await res.json()
      return parseFloat(data.price)
    } catch {
      return null
    }
  }

  async function getAccountBalance(broker: any): Promise<{ asset: string; free: number }[] | null> {
    try {
      const apiKey = decryptString(broker.api_key_encrypted, machineKey)
      const apiSecret = decryptString(broker.api_secret_encrypted, machineKey)
      const account = await binanceRequest({
        endpoint: '/api/v3/account',
        apiKey,
        apiSecret,
        mode: broker.mode,
      })
      return account.balances
        ?.filter((b: any) => parseFloat(b.free) > 0)
        ?.map((b: any) => ({ asset: b.asset, free: parseFloat(b.free) })) || []
    } catch {
      return null
    }
  }

  function getDailyLoss(db: any, brokerId: number): number {
    const today = new Date().toISOString().split('T')[0]
    const rows = db.prepare(`
      SELECT COALESCE(SUM(ABS(pnl)), 0) as loss
      FROM trading_trades
      WHERE broker_id = ? AND status = 'closed' AND pnl < 0
      AND date(created_at) = date(?)
    `).get(brokerId, today) as any
    return rows?.loss || 0
  }

  async function evaluateAndExecuteSignals() {
    if (!isAutoTrading) return
    const db = getDb()

    // Find active brokers with auto-trade enabled in config
    const brokers = db.prepare('SELECT * FROM trading_brokers WHERE is_active = 1').all() as any[]
    for (const broker of brokers) {
      const config = JSON.parse(broker.config || '{}')
      if (!config.autoTradeEnabled) continue

      const maxPositionPct = config.maxPositionPct || 10
      const dailyLossLimit = config.dailyLossLimit || 100
      const minConfidence = config.minConfidence || 60

      // Check daily loss limit
      const dailyLoss = getDailyLoss(db, broker.id)
      if (dailyLoss >= dailyLossLimit) {
        console.log(`[AutoTrade] Broker ${broker.id} daily loss limit reached: ${dailyLoss}`)
        continue
      }

      // Get pending signals
      const signals = db.prepare(`
        SELECT * FROM trading_signals
        WHERE broker_id = ? AND status = 'pending'
        ORDER BY created_at DESC
      `).all(broker.id) as any[]

      if (signals.length === 0) continue

      // Get account balance
      const balances = await getAccountBalance(broker)
      if (!balances) continue

      // Find USDT or base currency balance
      const usdtBalance = balances.find((b) => b.asset === 'USDT')?.free || 0
      const totalBalance = usdtBalance

      for (const signal of signals) {
        if (signal.confidence < minConfidence) continue

        // Fetch current price
        const currentPrice = await fetchBinancePrice(signal.symbol, broker.mode)
        if (!currentPrice) continue

        // Check if entry price is within 0.5% of current price
        const entryDiff = Math.abs(currentPrice - signal.entry_price) / signal.entry_price
        if (entryDiff > 0.005) continue

        // Calculate position size (maxPositionPct of total balance)
        const positionValue = Math.min((totalBalance * maxPositionPct) / 100, totalBalance * 0.1)
        if (positionValue <= 0) continue

        try {
          const apiKey = decryptString(broker.api_key_encrypted, machineKey)
          const apiSecret = decryptString(broker.api_secret_encrypted, machineKey)

          const result = await binanceRequest({
            endpoint: '/api/v3/order',
            method: 'POST',
            params: {
              symbol: signal.symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
              side: signal.direction.toUpperCase() === 'LONG' ? 'BUY' : 'SELL',
              type: 'MARKET',
              quoteOrderQty: positionValue.toFixed(2),
            },
            apiKey,
            apiSecret,
            mode: broker.mode,
          })

          // Record trade (estimated qty from quoteOrderQty / price)
          const estQty = positionValue / currentPrice
          db.prepare(`
            INSERT INTO trading_trades (broker_id, symbol, side, quantity, entry_price, stop_loss, take_profit, status, external_order_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            broker.id,
            signal.symbol,
            signal.direction,
            estQty,
            currentPrice,
            signal.stop_loss || null,
            signal.take_profit || null,
            'open',
            String(result.orderId)
          )

          // Mark signal as executed
          db.prepare("UPDATE trading_signals SET status = 'executed', external_order_id = ? WHERE id = ?")
            .run(String(result.orderId), signal.id)

          console.log(`[AutoTrade] Executed ${signal.symbol} ${signal.direction} @ ${currentPrice} qty≈${estQty.toFixed(6)}`)
        } catch (e: any) {
          console.error(`[AutoTrade] Execution failed for ${signal.symbol}:`, e.message)
          // Mark as failed but don't retry immediately
          db.prepare("UPDATE trading_signals SET status = 'failed' WHERE id = ?").run(signal.id)
        }
      }
    }
  }

  function startAutoTradeEngine() {
    if (autoTradeInterval) return
    isAutoTrading = true
    autoTradeInterval = setInterval(evaluateAndExecuteSignals, 15000) // Check every 15s
    console.log('[AutoTrade] Engine started')
  }

  function stopAutoTradeEngine() {
    if (autoTradeInterval) {
      clearInterval(autoTradeInterval)
      autoTradeInterval = null
    }
    isAutoTrading = false
    console.log('[AutoTrade] Engine stopped')
  }

  // ── Signal Management ─────────────────────────────────────────────────
  ipcMain.handle('trading:submitSignals', (_e, signals: any[]) => {
    const db = getDb()
    const broker = getActiveBroker()
    if (!broker) throw new Error('No active broker')

    const inserted: any[] = []
    const stmt = db.prepare(`
      INSERT INTO trading_signals (broker_id, symbol, direction, entry_price, take_profit, stop_loss, strategy, confidence, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `)

    for (const sig of signals) {
      const r = stmt.run(
        broker.id,
        sig.symbol,
        sig.direction,
        sig.entry_price,
        sig.take_profit || null,
        sig.stop_loss || null,
        sig.strategy || 'day_trade',
        sig.confidence || 50
      )
      inserted.push({ id: r.lastInsertRowid, ...sig, status: 'pending' })
    }

    // Auto-start engine if not running and broker has auto-trade enabled
    const config = JSON.parse(broker.config || '{}')
    if (config.autoTradeEnabled && !isAutoTrading) {
      startAutoTradeEngine()
    }

    return { ok: true, inserted }
  })

  ipcMain.handle('trading:getPendingSignals', () => {
    const db = getDb()
    const broker = getActiveBroker()
    if (!broker) return []
    return db.prepare('SELECT * FROM trading_signals WHERE broker_id = ? AND status = ? ORDER BY created_at DESC')
      .all(broker.id, 'pending')
  })

  ipcMain.handle('trading:cancelSignal', (_e, signalId: number) => {
    const db = getDb()
    db.prepare("UPDATE trading_signals SET status = 'cancelled' WHERE id = ?").run(signalId)
    return true
  })

  // ── Auto-Trade Settings ───────────────────────────────────────────────
  ipcMain.handle('trading:setAutoTrade', (_e, brokerId: number, enabled: boolean, settings?: any) => {
    const db = getDb()
    const broker = db.prepare('SELECT * FROM trading_brokers WHERE id = ?').get(brokerId) as any
    if (!broker) throw new Error('Broker not found')

    const config = JSON.parse(broker.config || '{}')
    config.autoTradeEnabled = enabled
    if (settings) {
      config.maxPositionPct = settings.maxPositionPct ?? config.maxPositionPct ?? 10
      config.dailyLossLimit = settings.dailyLossLimit ?? config.dailyLossLimit ?? 100
      config.minConfidence = settings.minConfidence ?? config.minConfidence ?? 60
    }

    db.prepare('UPDATE trading_brokers SET config = ? WHERE id = ?').run(JSON.stringify(config), brokerId)

    if (enabled) {
      startAutoTradeEngine()
    } else {
      // Check if any other broker has auto-trade enabled
      const others = db.prepare('SELECT * FROM trading_brokers WHERE id != ?').all(brokerId) as any[]
      const anyEnabled = others.some((b) => JSON.parse(b.config || '{}').autoTradeEnabled)
      if (!anyEnabled) stopAutoTradeEngine()
    }

    return { ok: true, enabled, config }
  })

  ipcMain.handle('trading:getAutoTradeSettings', (_e, brokerId?: number) => {
    const db = getDb()
    let broker: any
    if (brokerId && brokerId > 0) {
      broker = db.prepare('SELECT config FROM trading_brokers WHERE id = ?').get(brokerId) as any
    } else {
      broker = getActiveBroker()
    }
    if (!broker) return null
    const config = JSON.parse(broker.config || '{}')
    return {
      enabled: !!config.autoTradeEnabled,
      maxPositionPct: config.maxPositionPct || 10,
      dailyLossLimit: config.dailyLossLimit || 100,
      minConfidence: config.minConfidence || 60,
    }
  })

  ipcMain.handle('trading:getEngineStatus', () => {
    return { running: isAutoTrading }
  })

  // Start engine on init if any broker has auto-trade enabled
  try {
    const db = getDb()
    const brokers = db.prepare('SELECT config FROM trading_brokers').all() as any[]
    const anyAuto = brokers.some((b) => JSON.parse(b.config || '{}').autoTradeEnabled)
    if (anyAuto) startAutoTradeEngine()
  } catch { /* ignore */ }
}
