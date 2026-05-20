import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { getDb } from '../db/database'
import { chatComplete, isLLMConfigured } from './llm'

function ensureTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS savings_intentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      period_type TEXT NOT NULL DEFAULT 'month',
      start_date TEXT NOT NULL DEFAULT (date('now')),
      end_date TEXT,
      target_amount REAL,
      status TEXT NOT NULL DEFAULT 'active',
      ai_plan TEXT NOT NULL DEFAULT '{}',
      plan_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS intention_checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intention_id INTEGER NOT NULL REFERENCES savings_intentions(id) ON DELETE CASCADE,
      scheduled_at TEXT NOT NULL,
      prompt TEXT NOT NULL DEFAULT '',
      amount REAL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

export function setupSavingsIntentionHandlers(): void {
  // ─── CRUD ──────────────────────────────────────────────────────────────
  ipcMain.handle('intentions:getAll', () => {
    const db = getDb()
    ensureTables(db)
    return db.prepare('SELECT * FROM savings_intentions ORDER BY created_at DESC').all()
  })

  ipcMain.handle('intentions:getById', (_e, id: number) => {
    const db = getDb()
    ensureTables(db)
    const intention = db.prepare('SELECT * FROM savings_intentions WHERE id = ?').get(id)
    if (!intention) return null
    const checkpoints = db.prepare('SELECT * FROM intention_checkpoints WHERE intention_id = ? ORDER BY scheduled_at ASC').all(id)
    return { ...intention, checkpoints }
  })

  ipcMain.handle('intentions:add', (_e, data: any) => {
    const db = getDb()
    ensureTables(db)
    const r = db.prepare(`
      INSERT INTO savings_intentions (description, period_type, start_date, end_date, target_amount, status, plan_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(data.description, data.period_type || 'month', data.start_date || new Date().toISOString().split('T')[0], data.end_date || null, data.target_amount || null, 'active', data.plan_name || null)
    return db.prepare('SELECT * FROM savings_intentions WHERE id = ?').get(r.lastInsertRowid)
  })

  ipcMain.handle('intentions:update', (_e, id: number, data: any) => {
    const db = getDb()
    db.prepare(`
      UPDATE savings_intentions SET description=?, period_type=?, start_date=?, end_date=?, target_amount=?, status=?, ai_plan=?, plan_name=? WHERE id=?
    `).run(data.description, data.period_type, data.start_date, data.end_date, data.target_amount, data.status, JSON.stringify(data.ai_plan || {}), data.plan_name, id)
    return db.prepare('SELECT * FROM savings_intentions WHERE id = ?').get(id)
  })

  ipcMain.handle('intentions:delete', (_e, id: number) => {
    const db = getDb()
    db.prepare('DELETE FROM savings_intentions WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('intentions:toggleStatus', (_e, id: number) => {
    const db = getDb()
    const row = db.prepare('SELECT status FROM savings_intentions WHERE id = ?').get(id) as any
    if (!row) return null
    const newStatus = row.status === 'active' ? 'paused' : 'active'
    db.prepare('UPDATE savings_intentions SET status = ? WHERE id = ?').run(newStatus, id)
    return newStatus
  })

  // ─── Checkpoints ─────────────────────────────────────────────────────
  ipcMain.handle('intentions:completeCheckpoint', (_e, checkpointId: number) => {
    const db = getDb()
    db.prepare('UPDATE intention_checkpoints SET completed = 1 WHERE id = ?').run(checkpointId)
    return db.prepare('SELECT * FROM intention_checkpoints WHERE id = ?').get(checkpointId)
  })

  ipcMain.handle('intentions:getActiveCheckpoints', () => {
    const db = getDb()
    ensureTables(db)
    const now = new Date().toISOString()
    return db.prepare(`
      SELECT c.*, i.description as intention_description, i.plan_name
      FROM intention_checkpoints c
      JOIN savings_intentions i ON i.id = c.intention_id
      WHERE c.completed = 0 AND c.scheduled_at <= ? AND i.status = 'active'
      ORDER BY c.scheduled_at ASC
    `).all(now)
  })

  // ─── AI Plan Generation ────────────────────────────────────────────────
  ipcMain.handle('intentions:generatePlan', async (_e, data: any) => {
    if (!isLLMConfigured()) throw new Error('AI not configured. Set your OpenAI key in Settings.')

    const { description, period_type, target_amount, income, expenses } = data
    const systemPrompt = `You are a savings planner AI. Given a user's financial intention, create a structured savings plan with daily/interval checkpoints.

Respond ONLY with valid JSON in this exact format:
{
  "plan_name": "Short catchy name for the plan",
  "strategy_summary": "1-2 sentence summary of the approach",
  "checkpoints": [
    {
      "scheduled_at": "ISO datetime string",
      "prompt": "Friendly reminder message to the user",
      "amount": number (optional savings amount for this checkpoint)
    }
  ]
}

Rules:
- Create between 5 and 15 checkpoints depending on the period
- scheduled_at should be realistic intervals (daily for short periods, every few days for longer)
- Use ISO 8601 format for datetimes
- prompt should be encouraging but specific
- amount is optional; only include if a specific savings target makes sense for that checkpoint
- Consider the user's income and expenses to make targets realistic`

    const userPrompt = `My intention: "${description}"
Period: ${period_type}
${target_amount ? `Target amount to save: ${target_amount}` : 'No specific target amount set'}
${income ? `Monthly income: ${income}` : ''}
${expenses ? `Monthly expenses: ${expenses}` : ''}

Generate a savings plan with checkpoints.`

    const response = await chatComplete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      jsonResponse: true,
      temperature: 0.7,
      maxTokens: 2000,
    })

    let plan: any
    try {
      plan = JSON.parse(response)
    } catch {
      // Try to extract JSON from markdown code block
      const match = response.match(/```json\n?([\s\S]*?)\n?```/)
      if (match) plan = JSON.parse(match[1])
      else throw new Error('AI returned invalid JSON')
    }

    // Save plan to intention if intention_id provided
    if (data.intention_id) {
      const db = getDb()
      db.prepare('UPDATE savings_intentions SET ai_plan = ?, plan_name = ? WHERE id = ?').run(JSON.stringify(plan), plan.plan_name || 'Savings Plan', data.intention_id)

      // Insert checkpoints
      const insert = db.prepare(`
        INSERT INTO intention_checkpoints (intention_id, scheduled_at, prompt, amount)
        VALUES (?, ?, ?, ?)
      `)
      for (const cp of plan.checkpoints || []) {
        insert.run(data.intention_id, cp.scheduled_at, cp.prompt, cp.amount || null)
      }
    }

    return plan
  })
}
