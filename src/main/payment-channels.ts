import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { getDb } from '../db/database'

// PayHero API endpoints
const PAYMENT_URL = 'https://api.payhero.africa/api/v2/payments'
const WITHDRAW_URL = 'https://backend.payhero.co.ke/api/v2/withdraw'

function ensureTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'payhero',
      enabled INTEGER NOT NULL DEFAULT 0,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER REFERENCES payment_channels(id) ON DELETE SET NULL,
      type TEXT NOT NULL DEFAULT 'payment',
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      reference TEXT,
      external_reference TEXT,
      phone_number TEXT,
      provider TEXT,
      response TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

export function setupPaymentChannelHandlers(): void {
  // ─── Payment Channels CRUD ───────────────────────────────────────────
  ipcMain.handle('paymentChannels:getAll', () => {
    const db = getDb()
    ensureTables(db)
    return db.prepare('SELECT * FROM payment_channels ORDER BY created_at DESC').all()
  })

  ipcMain.handle('paymentChannels:getById', (_e, id: number) => {
    const db = getDb()
    return db.prepare('SELECT * FROM payment_channels WHERE id = ?').get(id)
  })

  ipcMain.handle('paymentChannels:add', (_e, data: any) => {
    try {
      const db = getDb()
      ensureTables(db)
      const r = db.prepare(`
        INSERT INTO payment_channels (name, provider, enabled, config)
        VALUES (?, ?, ?, ?)
      `).run(data.name, data.provider || 'payhero', data.enabled ? 1 : 0, JSON.stringify(data.config || {}))
      return db.prepare('SELECT * FROM payment_channels WHERE id = ?').get(r.lastInsertRowid)
    } catch (err: any) {
      console.error('paymentChannels:add error:', err?.message || err)
      throw err
    }
  })

  ipcMain.handle('paymentChannels:update', (_e, id: number, data: any) => {
    const db = getDb()
    db.prepare(`
      UPDATE payment_channels SET name=?, provider=?, enabled=?, config=? WHERE id=?
    `).run(data.name, data.provider, data.enabled ? 1 : 0, JSON.stringify(data.config || {}), id)
    return db.prepare('SELECT * FROM payment_channels WHERE id = ?').get(id)
  })

  ipcMain.handle('paymentChannels:delete', (_e, id: number) => {
    const db = getDb()
    db.prepare('DELETE FROM payment_channels WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('paymentChannels:toggle', (_e, id: number) => {
    const db = getDb()
    const ch = db.prepare('SELECT enabled FROM payment_channels WHERE id = ?').get(id) as any
    if (!ch) return false
    const newState = ch.enabled ? 0 : 1
    db.prepare('UPDATE payment_channels SET enabled = ? WHERE id = ?').run(newState, id)
    return newState === 1
  })

  // ─── PayHero Payment (Top-up / Save) ─────────────────────────────────
  ipcMain.handle('paymentChannels:pay', async (_e, data: any) => {
    const db = getDb()
    const channel = db.prepare('SELECT * FROM payment_channels WHERE id = ?').get(data.channel_id) as any
    if (!channel) throw new Error('Payment channel not found')
    if (!channel.enabled) throw new Error('Payment channel is disabled')

    const config = JSON.parse(channel.config || '{}')
    const apiKey = config.api_key || ''
    const accountId = config.account_id || data.account_id
    const channelId = config.channel_id || data.channel_id_val
    const networkCode = config.network_code || data.network_code
    const callbackUrl = config.callback_url || data.callback_url

    if (!apiKey) throw new Error('API key not configured')

    const payload = {
      amount: data.amount,
      phone_number: data.phone_number,
      provider: data.provider || 'm-pesa',
      network_code: String(networkCode || '63902'),
      channel_id: Number(channelId),
      account_id: Number(accountId),
      external_reference: data.external_reference || `WOS_${Date.now()}`,
      callback_url: callbackUrl || '',
    }

    try {
      const response = await fetch(PAYMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      // Log transaction
      db.prepare(`
        INSERT INTO payment_transactions (channel_id, type, amount, status, reference, external_reference, phone_number, provider, response)
        VALUES (?, 'payment', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.channel_id,
        data.amount,
        result.status || (result.success ? 'QUEUED' : 'FAILED'),
        result.reference || result.CheckoutRequestID || '',
        payload.external_reference,
        data.phone_number,
        data.provider || 'm-pesa',
        JSON.stringify(result)
      )

      return result
    } catch (err: any) {
      db.prepare(`
        INSERT INTO payment_transactions (channel_id, type, amount, status, external_reference, phone_number, provider, error)
        VALUES (?, 'payment', ?, 'failed', ?, ?, ?, ?)
      `).run(data.channel_id, data.amount, payload.external_reference, data.phone_number, data.provider || 'm-pesa', err.message)
      throw err
    }
  })

  // ─── PayHero Withdrawal ──────────────────────────────────────────────
  ipcMain.handle('paymentChannels:withdraw', async (_e, data: any) => {
    const db = getDb()
    const channel = db.prepare('SELECT * FROM payment_channels WHERE id = ?').get(data.channel_id) as any
    if (!channel) throw new Error('Payment channel not found')
    if (!channel.enabled) throw new Error('Payment channel is disabled')

    const config = JSON.parse(channel.config || '{}')
    const apiKey = config.api_key || ''
    const accountId = config.account_id || data.account_id
    const channelId = config.withdrawal_channel_id || data.channel_id_val
    const networkCode = config.network_code || data.network_code
    const callbackUrl = config.callback_url || data.callback_url

    if (!apiKey) throw new Error('API key not configured')

    const payload = {
      external_reference: data.external_reference || `WOS_WD_${Date.now()}`,
      account_id: Number(accountId),
      channel_id: Number(channelId),
      amount: data.amount,
      phone_number: data.phone_number,
      account_number: data.account_number || '',
      network_code: String(networkCode || '63902'),
      channel: data.channel || 'mobile',
      callback_url: callbackUrl || '',
    }

    try {
      const response = await fetch(WITHDRAW_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      db.prepare(`
        INSERT INTO payment_transactions (channel_id, type, amount, status, reference, external_reference, phone_number, provider, response)
        VALUES (?, 'withdrawal', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.channel_id,
        data.amount,
        result.status || (result.success ? 'QUEUED' : 'FAILED'),
        result.merchant_reference || result.checkout_request_id || '',
        payload.external_reference,
        data.phone_number,
        data.channel || 'mobile',
        JSON.stringify(result)
      )

      return result
    } catch (err: any) {
      db.prepare(`
        INSERT INTO payment_transactions (channel_id, type, amount, status, external_reference, phone_number, provider, error)
        VALUES (?, 'withdrawal', ?, 'failed', ?, ?, ?, ?)
      `).run(data.channel_id, data.amount, payload.external_reference, data.phone_number, data.channel || 'mobile', err.message)
      throw err
    }
  })

  // ─── Transaction History ───────────────────────────────────────────────
  ipcMain.handle('paymentChannels:getTransactions', (_e, channelId?: number) => {
    const db = getDb()
    if (channelId) {
      return db.prepare('SELECT * FROM payment_transactions WHERE channel_id = ? ORDER BY created_at DESC').all(channelId)
    }
    return db.prepare('SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 100').all()
  })

  // ─── Update savings goal amount (manual top-up tracking) ────────────────
  ipcMain.handle('paymentChannels:addToGoal', (_e, goalId: number, amount: number) => {
    const db = getDb()
    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(goalId) as any
    if (!goal) throw new Error('Goal not found')
    const newAmount = (goal.current_amount || 0) + amount
    db.prepare('UPDATE savings_goals SET current_amount = ? WHERE id = ?').run(newAmount, goalId)
    return { current_amount: newAmount, target_amount: goal.target_amount }
  })
}
