import { IpcMain, app, dialog } from 'electron'
import { join } from 'path'
import { createHash, randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'crypto'
import { writeFileSync, unlinkSync, createReadStream, readFileSync, copyFileSync, renameSync, readdirSync, mkdirSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { initDatabase, getDb } from '../db/database'
import OpenAI from 'openai'
import { chatComplete, isLLMConfigured, listOllamaModels, testOllama, getLLMSettings } from './llm'

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(salt + password).digest('hex')
}

export function setupIpcHandlers(ipcMain: IpcMain, store: any, themeStore: any): void {
  // Initialize database
  const dbPath = join(app.getPath('userData'), 'wealthos.db')
  initDatabase(dbPath)

  // ─── Store / Settings ───────────────────────────────────────────────────
  ipcMain.handle('store:get', (_e, key: string) => store.get(key))
  ipcMain.handle('store:set', (_e, key: string, value: unknown) => store.set(key, value))
  ipcMain.handle('store:delete', (_e, key: string) => store.delete(key))

  // ─── Theme ───────────────────────────────────────────────────────────────
  ipcMain.handle('theme:get', () => themeStore.store || {})
  ipcMain.handle('theme:set', (_e, theme: Record<string, unknown>) => {
    themeStore.clear()
    Object.entries(theme).forEach(([k, v]) => themeStore.set(k, v))
    return true
  })
  ipcMain.handle('theme:update', (_e, key: string, value: unknown) => {
    themeStore.set(key, value)
    return true
  })

  // ─── Income Sources ──────────────────────────────────────────────────────
  ipcMain.handle('income:getAll', () => getDb().prepare('SELECT * FROM income_sources ORDER BY created_at DESC').all())
  ipcMain.handle('income:add', (_e, data: any) => {
    const stmt = getDb().prepare(`INSERT INTO income_sources (name, type, amount, frequency, currency, active) VALUES (?, ?, ?, ?, ?, ?)`)
    const res = stmt.run(data.name, data.type, data.amount, data.frequency, data.currency || 'USD', data.active ?? 1)
    return getDb().prepare('SELECT * FROM income_sources WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('income:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE income_sources SET name=?, type=?, amount=?, frequency=?, currency=?, active=? WHERE id=?`).run(data.name, data.type, data.amount, data.frequency, data.currency, data.active, id)
    return getDb().prepare('SELECT * FROM income_sources WHERE id = ?').get(id)
  })
  ipcMain.handle('income:delete', (_e, id: number) => getDb().prepare('DELETE FROM income_sources WHERE id = ?').run(id))

  // ─── Categories ──────────────────────────────────────────────────────────
  ipcMain.handle('categories:getAll', () => getDb().prepare('SELECT * FROM categories ORDER BY name').all())
  ipcMain.handle('categories:add', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO categories (name, icon, color, monthly_budget, type) VALUES (?, ?, ?, ?, ?)`).run(data.name, data.icon, data.color, data.monthly_budget || 0, data.type || 'expense')
    return getDb().prepare('SELECT * FROM categories WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('categories:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE categories SET name=?, icon=?, color=?, monthly_budget=?, type=? WHERE id=?`).run(data.name, data.icon, data.color, data.monthly_budget, data.type, id)
    return getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id)
  })
  ipcMain.handle('categories:delete', (_e, id: number) => getDb().prepare('DELETE FROM categories WHERE id = ?').run(id))

  // ─── Expenses ────────────────────────────────────────────────────────────
  ipcMain.handle('expenses:getAll', (_e, filters?: any) => {
    let sql = 'SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color FROM expenses e LEFT JOIN categories c ON e.category_id = c.id'
    const params: any[] = []
    if (filters?.startDate && filters?.endDate) {
      sql += ' WHERE e.date BETWEEN ? AND ?'
      params.push(filters.startDate, filters.endDate)
    } else if (filters?.month) {
      sql += ' WHERE strftime(\'%Y-%m\', e.date) = ?'
      params.push(filters.month)
    }
    sql += ' ORDER BY e.date DESC'
    if (filters?.limit) { sql += ' LIMIT ?'; params.push(filters.limit) }
    return getDb().prepare(sql).all(...params)
  })
  ipcMain.handle('expenses:add', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO expenses (category_id, name, amount, date, type, is_recurring, recurrence_interval, notes, merchant, payment_method, is_bad_habit) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(data.category_id, data.name, data.amount, data.date, data.type || 'variable', data.is_recurring || 0, data.recurrence_interval, data.notes, data.merchant, data.payment_method, data.is_bad_habit || 0)
    return getDb().prepare('SELECT e.*, c.name as category_name FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('expenses:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE expenses SET category_id=?, name=?, amount=?, date=?, type=?, is_recurring=?, recurrence_interval=?, notes=?, merchant=?, payment_method=?, is_bad_habit=? WHERE id=?`).run(data.category_id, data.name, data.amount, data.date, data.type, data.is_recurring, data.recurrence_interval, data.notes, data.merchant, data.payment_method, data.is_bad_habit, id)
    return getDb().prepare('SELECT * FROM expenses WHERE id = ?').get(id)
  })
  ipcMain.handle('expenses:delete', (_e, id: number) => getDb().prepare('DELETE FROM expenses WHERE id = ?').run(id))
  ipcMain.handle('expenses:getByCategory', (_e, month: string) => {
    return getDb().prepare(`SELECT c.name, c.color, c.icon, COALESCE(SUM(e.amount), 0) as total FROM categories c LEFT JOIN expenses e ON e.category_id = c.id AND strftime('%Y-%m', e.date) = ? WHERE c.type = 'expense' GROUP BY c.id ORDER BY total DESC`).all(month)
  })

  // ─── Regret Tracker ──────────────────────────────────────────────────────
  ipcMain.handle('regret:toggle', (_e, id: number, regret: 0 | 1, note?: string) => {
    getDb().prepare('UPDATE expenses SET regret=?, regret_note=? WHERE id=?').run(regret, note || null, id)
    return getDb().prepare('SELECT * FROM expenses WHERE id = ?').get(id)
  })
  ipcMain.handle('regret:list', () => {
    return getDb().prepare(`SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.regret = 1 ORDER BY e.date DESC`).all()
  })
  ipcMain.handle('regret:stats', () => {
    const db = getDb()
    const totalRegret = (db.prepare('SELECT COALESCE(SUM(amount),0) as t, COUNT(*) as c FROM expenses WHERE regret = 1').get() as any)
    const totalAll = (db.prepare('SELECT COALESCE(SUM(amount),0) as t, COUNT(*) as c FROM expenses').get() as any)
    const byCategory = db.prepare(`
      SELECT c.name, c.icon, c.color,
             COUNT(e.id) as regret_count,
             COALESCE(SUM(e.amount), 0) as regret_total,
             (SELECT COUNT(*) FROM expenses WHERE category_id = c.id) as total_count
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c.id AND e.regret = 1
      WHERE c.type = 'expense'
      GROUP BY c.id
      HAVING regret_count > 0
      ORDER BY regret_total DESC
    `).all() as any[]
    const byMood = db.prepare(`SELECT mood_at_purchase as mood, COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM expenses WHERE regret = 1 AND mood_at_purchase IS NOT NULL GROUP BY mood_at_purchase ORDER BY count DESC`).all() as any[]
    const byDayOfWeek = db.prepare(`SELECT strftime('%w', date) as dow, COUNT(*) as count FROM expenses WHERE regret = 1 GROUP BY dow ORDER BY count DESC`).all() as any[]
    const byHour = db.prepare(`SELECT strftime('%H', created_at) as hour, COUNT(*) as count FROM expenses WHERE regret = 1 GROUP BY hour`).all() as any[]
    return {
      totalRegretAmount: totalRegret.t,
      totalRegretCount: totalRegret.c,
      regretRate: totalAll.c > 0 ? Math.round((totalRegret.c / totalAll.c) * 100) : 0,
      regretAmountRate: totalAll.t > 0 ? Math.round((totalRegret.t / totalAll.t) * 100) : 0,
      byCategory,
      byMood,
      byDayOfWeek,
      byHour,
    }
  })

  // ─── Time Machine ────────────────────────────────────────────────────────
  ipcMain.handle('timeMachine:snapshot', (_e, dateStr: string) => {
    const db = getDb()
    const monthStr = dateStr.slice(0, 7)
    const expenses = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t, COUNT(*) as c FROM expenses WHERE strftime('%Y-%m', date) = ?`).get(monthStr) as any)
    const income = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM income_sources WHERE active = 1 AND date(created_at) <= ?`).get(dateStr) as any)
    const savings = income.t - expenses.t
    const savingsRate = income.t > 0 ? Math.round((savings / income.t) * 100) : 0
    const topCategories = db.prepare(`
      SELECT c.name, c.icon, c.color, COALESCE(SUM(e.amount),0) as total
      FROM expenses e LEFT JOIN categories c ON e.category_id = c.id
      WHERE strftime('%Y-%m', e.date) = ?
      GROUP BY c.id ORDER BY total DESC LIMIT 5
    `).all(monthStr)
    const snap = (db.prepare(`SELECT * FROM net_worth_snapshots WHERE snapshot_date <= ? ORDER BY snapshot_date DESC LIMIT 1`).get(dateStr) as any)
    const netWorth = snap ? (snap.total_assets - snap.total_liabilities) : 0
    const regretCount = (db.prepare(`SELECT COUNT(*) as c FROM expenses WHERE regret = 1 AND strftime('%Y-%m', date) = ?`).get(monthStr) as any).c
    return { date: dateStr, monthExpenses: expenses.t, monthExpenseCount: expenses.c, monthIncome: income.t, savings, savingsRate, topCategories, netWorth, regretCount }
  })
  // ─── Couple Sync Mode ────────────────────────────────────────────────────
  ipcMain.handle('couple:getPartner', () => {
    return getDb().prepare('SELECT * FROM couple_partner ORDER BY id DESC LIMIT 1').get() || null
  })
  ipcMain.handle('couple:setPartner', (_e, data: any) => {
    const db = getDb()
    const existing = db.prepare('SELECT id FROM couple_partner LIMIT 1').get() as any
    if (existing) {
      db.prepare(`UPDATE couple_partner SET name=?, monthly_income=?, net_worth=?, avatar=?, relationship_start=? WHERE id=?`).run(data.name, data.monthly_income || 0, data.net_worth || 0, data.avatar || null, data.relationship_start || null, existing.id)
      return db.prepare('SELECT * FROM couple_partner WHERE id=?').get(existing.id)
    } else {
      const r = db.prepare(`INSERT INTO couple_partner (name, monthly_income, net_worth, avatar, relationship_start) VALUES (?,?,?,?,?)`).run(data.name, data.monthly_income || 0, data.net_worth || 0, data.avatar || null, data.relationship_start || null)
      return db.prepare('SELECT * FROM couple_partner WHERE id=?').get(r.lastInsertRowid)
    }
  })
  ipcMain.handle('couple:removePartner', () => {
    getDb().prepare('DELETE FROM couple_partner').run()
    return true
  })
  ipcMain.handle('couple:listShared', () => {
    return getDb().prepare('SELECT * FROM shared_expenses ORDER BY date DESC').all()
  })
  ipcMain.handle('couple:addShared', (_e, data: any) => {
    const r = getDb().prepare(`INSERT INTO shared_expenses (name, amount, date, paid_by, split_ratio, category, notes) VALUES (?,?,?,?,?,?,?)`).run(data.name, data.amount, data.date, data.paid_by || 'me', data.split_ratio ?? 0.5, data.category || null, data.notes || null)
    return getDb().prepare('SELECT * FROM shared_expenses WHERE id=?').get(r.lastInsertRowid)
  })
  ipcMain.handle('couple:settleShared', (_e, id: number) => {
    getDb().prepare('UPDATE shared_expenses SET settled=1 WHERE id=?').run(id)
    return true
  })
  ipcMain.handle('couple:deleteShared', (_e, id: number) => {
    getDb().prepare('DELETE FROM shared_expenses WHERE id=?').run(id)
    return true
  })
  ipcMain.handle('couple:summary', () => {
    const db = getDb()
    const partner = db.prepare('SELECT * FROM couple_partner LIMIT 1').get() as any
    if (!partner) return null
    const myIncome = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM income_sources WHERE active = 1`).get() as any).t
    const monthStr = new Date().toISOString().slice(0, 7)
    const myExpenses = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE strftime('%Y-%m',date)=?`).get(monthStr) as any).t
    const sharedTotal = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM shared_expenses WHERE strftime('%Y-%m',date)=?`).get(monthStr) as any).t
    const owedToMe = (db.prepare(`SELECT COALESCE(SUM(amount * split_ratio),0) as t FROM shared_expenses WHERE paid_by='me' AND settled=0`).get() as any).t
    const owedToPartner = (db.prepare(`SELECT COALESCE(SUM(amount * (1 - split_ratio)),0) as t FROM shared_expenses WHERE paid_by='partner' AND settled=0`).get() as any).t
    const combinedIncome = myIncome + (partner.monthly_income || 0)
    return { partner, myIncome, partnerIncome: partner.monthly_income || 0, combinedIncome, myExpenses, sharedTotal, owedToMe, owedToPartner, balance: owedToMe - owedToPartner }
  })

  // ─── Loans ───────────────────────────────────────────────────────────────
  ipcMain.handle('loans:getAll', () => getDb().prepare('SELECT * FROM loans ORDER BY created_at DESC').all())
  ipcMain.handle('loans:add', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO loans (name, lender, principal_amount, remaining_balance, interest_rate, monthly_payment, payment_day, start_date, end_date, type, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(data.name, data.lender, data.principal_amount, data.remaining_balance ?? data.principal_amount, data.interest_rate, data.monthly_payment, data.payment_day, data.start_date, data.end_date, data.type || 'personal', data.notes)
    return getDb().prepare('SELECT * FROM loans WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('loans:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE loans SET name=?, lender=?, principal_amount=?, remaining_balance=?, interest_rate=?, monthly_payment=?, payment_day=?, start_date=?, end_date=?, type=?, notes=? WHERE id=?`).run(data.name, data.lender, data.principal_amount, data.remaining_balance, data.interest_rate, data.monthly_payment, data.payment_day, data.start_date, data.end_date, data.type, data.notes, id)
    return getDb().prepare('SELECT * FROM loans WHERE id = ?').get(id)
  })
  ipcMain.handle('loans:delete', (_e, id: number) => getDb().prepare('DELETE FROM loans WHERE id = ?').run(id))
  ipcMain.handle('loans:logPayment', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO loan_payments (loan_id, amount, date, notes) VALUES (?,?,?,?)`).run(data.loan_id, data.amount, data.date, data.notes)
    getDb().prepare(`UPDATE loans SET remaining_balance = remaining_balance - ? WHERE id = ?`).run(data.amount, data.loan_id)
    return res
  })
  ipcMain.handle('loans:getPayments', (_e, loanId: number) => getDb().prepare('SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY date DESC').all(loanId))

  // ─── Savings Goals ───────────────────────────────────────────────────────
  ipcMain.handle('goals:getAll', () => getDb().prepare('SELECT * FROM savings_goals ORDER BY priority ASC, created_at DESC').all())
  ipcMain.handle('goals:getById', (_e, id: number) => getDb().prepare('SELECT * FROM savings_goals WHERE id = ?').get(id))
  ipcMain.handle('goals:add', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO savings_goals (name, icon, target_amount, current_amount, target_date, monthly_contribution, priority, color, notes) VALUES (?,?,?,?,?,?,?,?,?)`).run(data.name, data.icon || '🎯', data.target_amount, data.current_amount || 0, data.target_date, data.monthly_contribution || 0, data.priority || 3, data.color || '#10b981', data.notes)
    return getDb().prepare('SELECT * FROM savings_goals WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('goals:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE savings_goals SET name=?, icon=?, target_amount=?, current_amount=?, target_date=?, monthly_contribution=?, priority=?, color=?, notes=? WHERE id=?`).run(data.name, data.icon, data.target_amount, data.current_amount, data.target_date, data.monthly_contribution, data.priority, data.color, data.notes, id)
    return getDb().prepare('SELECT * FROM savings_goals WHERE id = ?').get(id)
  })
  ipcMain.handle('goals:logContribution', (_e, id: number, amount: number) => {
    getDb().prepare(`UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ?`).run(amount, id)
    const goal = getDb().prepare('SELECT * FROM savings_goals WHERE id = ?').get(id) as any
    if (goal && goal.current_amount >= goal.target_amount && !goal.completed_at) {
      getDb().prepare(`UPDATE savings_goals SET completed_at = ? WHERE id = ?`).run(new Date().toISOString(), id)
    }
    return getDb().prepare('SELECT * FROM savings_goals WHERE id = ?').get(id)
  })
  ipcMain.handle('goals:delete', (_e, id: number) => getDb().prepare('DELETE FROM savings_goals WHERE id = ?').run(id))

  // ─── Investments ─────────────────────────────────────────────────────────
  ipcMain.handle('investments:getAll', () => getDb().prepare('SELECT * FROM investments ORDER BY created_at DESC').all())
  ipcMain.handle('investments:add', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO investments (name, type, ticker_symbol, amount_invested, current_value, purchase_date, platform, notes) VALUES (?,?,?,?,?,?,?,?)`).run(data.name, data.type, data.ticker_symbol, data.amount_invested, data.current_value ?? data.amount_invested, data.purchase_date, data.platform, data.notes)
    return getDb().prepare('SELECT * FROM investments WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('investments:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE investments SET name=?, type=?, ticker_symbol=?, amount_invested=?, current_value=?, purchase_date=?, platform=?, notes=? WHERE id=?`).run(data.name, data.type, data.ticker_symbol, data.amount_invested, data.current_value, data.purchase_date, data.platform, data.notes, id)
    return getDb().prepare('SELECT * FROM investments WHERE id = ?').get(id)
  })
  ipcMain.handle('investments:delete', (_e, id: number) => getDb().prepare('DELETE FROM investments WHERE id = ?').run(id))

  // ─── People (owe/owed) ───────────────────────────────────────────────────
  ipcMain.handle('people:getAll', () => getDb().prepare('SELECT * FROM people_owed ORDER BY created_at DESC').all())
  ipcMain.handle('people:add', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO people_owed (name, phone, amount, direction, description, due_date, paid) VALUES (?,?,?,?,?,?,?)`).run(data.name, data.phone, data.amount, data.direction || 'i_owe', data.description, data.due_date, data.paid || 0)
    return getDb().prepare('SELECT * FROM people_owed WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('people:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE people_owed SET name=?, phone=?, amount=?, direction=?, description=?, due_date=?, paid=? WHERE id=?`).run(data.name, data.phone, data.amount, data.direction, data.description, data.due_date, data.paid, id)
    return getDb().prepare('SELECT * FROM people_owed WHERE id = ?').get(id)
  })
  ipcMain.handle('people:delete', (_e, id: number) => getDb().prepare('DELETE FROM people_owed WHERE id = ?').run(id))
  ipcMain.handle('people:markPaid', (_e, id: number) => {
    getDb().prepare(`UPDATE people_owed SET paid = 1 WHERE id = ?`).run(id)
    return true
  })

  // ─── Subscriptions ───────────────────────────────────────────────────────
  ipcMain.handle('subscriptions:getAll', () => getDb().prepare('SELECT * FROM subscriptions ORDER BY next_billing_date ASC').all())
  ipcMain.handle('subscriptions:add', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO subscriptions (name, amount, frequency, next_billing_date, category, active, notes) VALUES (?,?,?,?,?,?,?)`).run(data.name, data.amount, data.frequency || 'monthly', data.next_billing_date, data.category, data.active ?? 1, data.notes)
    return getDb().prepare('SELECT * FROM subscriptions WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('subscriptions:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE subscriptions SET name=?, amount=?, frequency=?, next_billing_date=?, category=?, active=?, notes=? WHERE id=?`).run(data.name, data.amount, data.frequency, data.next_billing_date, data.category, data.active, data.notes, id)
    return getDb().prepare('SELECT * FROM subscriptions WHERE id = ?').get(id)
  })
  ipcMain.handle('subscriptions:delete', (_e, id: number) => getDb().prepare('DELETE FROM subscriptions WHERE id = ?').run(id))

  // ─── Bad Habits ──────────────────────────────────────────────────────────
  ipcMain.handle('habits:getAll', () => getDb().prepare('SELECT * FROM bad_habits ORDER BY created_at DESC').all())
  ipcMain.handle('habits:add', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO bad_habits (name, category, avg_weekly_spend, times_per_week, notes) VALUES (?,?,?,?,?)`).run(data.name, data.category, data.avg_weekly_spend || 0, data.times_per_week || 0, data.notes)
    return getDb().prepare('SELECT * FROM bad_habits WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('habits:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE bad_habits SET name=?, category=?, avg_weekly_spend=?, times_per_week=?, notes=? WHERE id=?`).run(data.name, data.category, data.avg_weekly_spend || 0, data.times_per_week || 0, data.notes, id)
    return getDb().prepare('SELECT * FROM bad_habits WHERE id = ?').get(id)
  })
  ipcMain.handle('habits:logEntry', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO bad_habit_log (habit_id, amount, date, notes) VALUES (?,?,?,?)`).run(data.habit_id, data.amount, data.date, data.notes)
    return res
  })
  ipcMain.handle('habits:getLogs', (_e, habitId: number) => getDb().prepare('SELECT * FROM bad_habit_log WHERE habit_id = ? ORDER BY date DESC').all(habitId))
  ipcMain.handle('habits:delete', (_e, id: number) => getDb().prepare('DELETE FROM bad_habits WHERE id = ?').run(id))

  // ─── Budget ───────────────────────────────────────────────────────────────
  ipcMain.handle('budget:getForMonth', (_e, month: string) => {
    return getDb().prepare(`SELECT c.id, c.name, c.icon, c.color, c.monthly_budget as budget, COALESCE(SUM(e.amount), 0) as spent FROM categories c LEFT JOIN expenses e ON e.category_id = c.id AND strftime('%Y-%m', e.date) = ? WHERE c.type = 'expense' GROUP BY c.id ORDER BY budget DESC`).all(month)
  })
  ipcMain.handle('budget:getByMonth', (_e, month: string) => getDb().prepare('SELECT * FROM budgets WHERE month = ? ORDER BY category').all(month))
  ipcMain.handle('budget:add', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO budgets (category, budgeted, spent, month) VALUES (?,?,?,?)`).run(data.category, data.budgeted, data.spent || 0, data.month)
    return getDb().prepare('SELECT * FROM budgets WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('budget:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE budgets SET category=?, budgeted=?, spent=?, month=? WHERE id=?`).run(data.category, data.budgeted, data.spent, data.month, id)
    return getDb().prepare('SELECT * FROM budgets WHERE id = ?').get(id)
  })
  ipcMain.handle('budget:delete', (_e, id: number) => getDb().prepare('DELETE FROM budgets WHERE id = ?').run(id))
  ipcMain.handle('budget:updateCategoryBudget', (_e, categoryId: number, budget: number) => {
    getDb().prepare(`UPDATE categories SET monthly_budget = ? WHERE id = ?`).run(budget, categoryId)
    return true
  })

  // ─── Net Worth Snapshots ─────────────────────────────────────────────────
  ipcMain.handle('networth:getHistory', () => getDb().prepare('SELECT * FROM net_worth_snapshots ORDER BY snapshot_date ASC').all())
  ipcMain.handle('networth:saveSnapshot', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO net_worth_snapshots (total_assets, total_liabilities, net_worth, snapshot_date) VALUES (?,?,?,?)`).run(data.total_assets, data.total_liabilities, data.net_worth, data.snapshot_date || new Date().toISOString().split('T')[0])
    return res
  })
  ipcMain.handle('networth:delete', (_e, id: number) => getDb().prepare('DELETE FROM net_worth_snapshots WHERE id = ?').run(id))

  // ─── Tax Records ──────────────────────────────────────────────────────────
  ipcMain.handle('tax:getAll', () => getDb().prepare('SELECT * FROM tax_records ORDER BY tax_year DESC').all())
  ipcMain.handle('tax:add', (_e, data: any) => {
    const stmt = getDb().prepare(`INSERT INTO tax_records (tax_year, total_income, taxable_income, deductions, credits, tax_paid, estimated_tax_due, filing_status, notes) VALUES (?,?,?,?,?,?,?,?,?)`)
    const res = stmt.run(data.tax_year, data.total_income, data.taxable_income, data.deductions, data.credits, data.tax_paid, data.estimated_tax_due, data.filing_status, data.notes)
    return getDb().prepare('SELECT * FROM tax_records WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('tax:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE tax_records SET tax_year=?, total_income=?, taxable_income=?, deductions=?, credits=?, tax_paid=?, estimated_tax_due=?, filing_status=?, notes=? WHERE id=?`).run(data.tax_year, data.total_income, data.taxable_income, data.deductions, data.credits, data.tax_paid, data.estimated_tax_due, data.filing_status, data.notes, id)
    return getDb().prepare('SELECT * FROM tax_records WHERE id = ?').get(id)
  })
  ipcMain.handle('tax:delete', (_e, id: number) => getDb().prepare('DELETE FROM tax_records WHERE id = ?').run(id))

  // ─── Documents ────────────────────────────────────────────────────────────
  ipcMain.handle('documents:getAll', () => getDb().prepare('SELECT * FROM documents ORDER BY uploaded_at DESC').all())
  ipcMain.handle('documents:add', (_e, data: any) => {
    const stmt = getDb().prepare(`INSERT INTO documents (name, type, file_path, tags, related_entity, related_id, notes) VALUES (?,?,?,?,?,?,?)`)
    const res = stmt.run(data.name, data.type, data.file_path, data.tags, data.related_entity, data.related_id, data.notes)
    return getDb().prepare('SELECT * FROM documents WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('documents:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE documents SET name=?, type=?, file_path=?, tags=?, related_entity=?, related_id=?, notes=? WHERE id=?`).run(data.name, data.type, data.file_path, data.tags, data.related_entity, data.related_id, data.notes, id)
    return getDb().prepare('SELECT * FROM documents WHERE id = ?').get(id)
  })
  ipcMain.handle('documents:delete', (_e, id: number) => getDb().prepare('DELETE FROM documents WHERE id = ?').run(id))

  // ─── Wishlist ───────────────────────────────────────────────────────────────
  ipcMain.handle('wishlist:getAll', () => getDb().prepare('SELECT * FROM wishlist WHERE purchased = 0 ORDER BY priority ASC, created_at DESC').all())
  ipcMain.handle('wishlist:getPurchased', () => getDb().prepare('SELECT * FROM wishlist WHERE purchased = 1 ORDER BY purchased_at DESC').all())
  ipcMain.handle('wishlist:add', (_e, data: any) => {
    const stmt = getDb().prepare(`INSERT INTO wishlist (name, price, priority, category, target_date, savings_allocated, notes) VALUES (?,?,?,?,?,?,?)`)
    const res = stmt.run(data.name, data.price, data.priority, data.category, data.target_date, data.savings_allocated || 0, data.notes)
    return getDb().prepare('SELECT * FROM wishlist WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('wishlist:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE wishlist SET name=?, price=?, priority=?, category=?, target_date=?, savings_allocated=?, notes=? WHERE id=?`).run(data.name, data.price, data.priority, data.category, data.target_date, data.savings_allocated, data.notes, id)
    return getDb().prepare('SELECT * FROM wishlist WHERE id = ?').get(id)
  })
  ipcMain.handle('wishlist:delete', (_e, id: number) => getDb().prepare('DELETE FROM wishlist WHERE id = ?').run(id))
  ipcMain.handle('wishlist:markPurchased', (_e, id: number) => {
    getDb().prepare(`UPDATE wishlist SET purchased=1, purchased_at=datetime('now') WHERE id=?`).run(id)
    return getDb().prepare('SELECT * FROM wishlist WHERE id = ?').get(id)
  })

  // ─── Cash Flow Events ────────────────────────────────────────────────────
  ipcMain.handle('cashflow:getAll', () => getDb().prepare('SELECT * FROM cash_flow_events WHERE active = 1 ORDER BY start_date DESC').all())
  ipcMain.handle('cashflow:add', (_e, data: any) => {
    const stmt = getDb().prepare(`INSERT INTO cash_flow_events (name, type, amount, frequency, start_date, end_date, source_id, source_table, notes) VALUES (?,?,?,?,?,?,?,?,?)`)
    const res = stmt.run(data.name, data.type, data.amount, data.frequency, data.start_date, data.end_date || null, data.source_id || null, data.source_table || null, data.notes)
    return getDb().prepare('SELECT * FROM cash_flow_events WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('cashflow:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE cash_flow_events SET name=?, type=?, amount=?, frequency=?, start_date=?, end_date=?, notes=?, active=? WHERE id=?`).run(data.name, data.type, data.amount, data.frequency, data.start_date, data.end_date, data.notes, data.active ?? 1, id)
    return getDb().prepare('SELECT * FROM cash_flow_events WHERE id = ?').get(id)
  })
  ipcMain.handle('cashflow:delete', (_e, id: number) => getDb().prepare('DELETE FROM cash_flow_events WHERE id = ?').run(id))

  // ─── Sinking Funds ───────────────────────────────────────────────────────
  ipcMain.handle('sinkingFunds:getAll', () => getDb().prepare('SELECT * FROM sinking_funds ORDER BY created_at DESC').all())
  ipcMain.handle('sinkingFunds:add', (_e, data: any) => {
    const stmt = getDb().prepare(`INSERT INTO sinking_funds (name, target_amount, current_amount, monthly_contribution, category, icon, color, notes) VALUES (?,?,?,?,?,?,?,?)`)
    const res = stmt.run(data.name, data.target_amount, data.current_amount || 0, data.monthly_contribution, data.category, data.icon, data.color, data.notes)
    return getDb().prepare('SELECT * FROM sinking_funds WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('sinkingFunds:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE sinking_funds SET name=?, target_amount=?, current_amount=?, monthly_contribution=?, category=?, icon=?, color=?, notes=? WHERE id=?`).run(data.name, data.target_amount, data.current_amount, data.monthly_contribution, data.category, data.icon, data.color, data.notes, id)
    return getDb().prepare('SELECT * FROM sinking_funds WHERE id = ?').get(id)
  })
  ipcMain.handle('sinkingFunds:delete', (_e, id: number) => getDb().prepare('DELETE FROM sinking_funds WHERE id = ?').run(id))
  ipcMain.handle('sinkingFunds:contribute', (_e, id: number, amount: number) => {
    getDb().prepare('UPDATE sinking_funds SET current_amount = current_amount + ? WHERE id = ?').run(amount, id)
    return getDb().prepare('SELECT * FROM sinking_funds WHERE id = ?').get(id)
  })

  // ─── Health Scores ───────────────────────────────────────────────────────
  ipcMain.handle('healthScore:getHistory', () => getDb().prepare('SELECT * FROM health_scores ORDER BY recorded_at DESC LIMIT 24').all())
  ipcMain.handle('healthScore:save', (_e, data: any) => {
    const stmt = getDb().prepare(`INSERT INTO health_scores (score, savings_rate, debt_to_income, budget_adherence, emergency_fund_months, investment_ratio, breakdown) VALUES (?,?,?,?,?,?,?)`)
    const res = stmt.run(data.score, data.savings_rate, data.debt_to_income, data.budget_adherence, data.emergency_fund_months, data.investment_ratio, JSON.stringify(data.breakdown || {}))
    return getDb().prepare('SELECT * FROM health_scores WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('healthScore:delete', (_e, id: number) => getDb().prepare('DELETE FROM health_scores WHERE id = ?').run(id))

  // ─── Date Budgets ────────────────────────────────────────────────────────
  ipcMain.handle('dateBudgets:getAll', () => getDb().prepare('SELECT * FROM date_budgets ORDER BY date DESC').all())
  ipcMain.handle('dateBudgets:add', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO date_budgets (name, date, total_budget, spent, venue, notes, rating) VALUES (?,?,?,?,?,?,?)`).run(data.name, data.date, data.total_budget, data.spent || 0, data.venue, data.notes, data.rating || 0)
    return getDb().prepare('SELECT * FROM date_budgets WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('dateBudgets:getItems', (_e, budgetId: number) => getDb().prepare('SELECT * FROM date_budget_items WHERE date_budget_id = ?').all(budgetId))
  ipcMain.handle('dateBudgets:addItem', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO date_budget_items (date_budget_id, item, estimated_cost, actual_cost) VALUES (?,?,?,?)`).run(data.date_budget_id, data.item, data.estimated_cost, data.actual_cost)
    getDb().prepare(`UPDATE date_budgets SET spent = (SELECT COALESCE(SUM(actual_cost),0) FROM date_budget_items WHERE date_budget_id = ?) WHERE id = ?`).run(data.date_budget_id, data.date_budget_id)
    return res
  })
  ipcMain.handle('dateBudgets:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE date_budgets SET name=?, date=?, total_budget=?, spent=?, venue=?, notes=?, rating=? WHERE id=?`).run(data.name, data.date, data.total_budget, data.spent, data.venue, data.notes, data.rating, id)
    return getDb().prepare('SELECT * FROM date_budgets WHERE id = ?').get(id)
  })
  ipcMain.handle('dateBudgets:delete', (_e, id: number) => getDb().prepare('DELETE FROM date_budgets WHERE id = ?').run(id))

  // ─── Financial Mood ──────────────────────────────────────────────────────
  ipcMain.handle('mood:getAll', (_e, limit?: number) => {
    const sql = 'SELECT * FROM financial_mood_log ORDER BY date DESC' + (limit ? ' LIMIT ?' : '')
    return limit ? getDb().prepare(sql).all(limit) : getDb().prepare(sql).all()
  })
  ipcMain.handle('mood:log', (_e, data: any) => {
    const existing = getDb().prepare('SELECT id FROM financial_mood_log WHERE date = ?').get(data.date)
    if (existing) {
      getDb().prepare('UPDATE financial_mood_log SET mood=?, note=? WHERE date=?').run(data.mood, data.note, data.date)
    } else {
      getDb().prepare(`INSERT INTO financial_mood_log (mood, note, date) VALUES (?,?,?)`).run(data.mood, data.note || '', data.date)
    }
    return true
  })
  ipcMain.handle('mood:delete', (_e, id: number) => getDb().prepare('DELETE FROM financial_mood_log WHERE id = ?').run(id))

  // ─── AI Insights ─────────────────────────────────────────────────────────
  ipcMain.handle('insights:getAll', () => getDb().prepare('SELECT * FROM ai_insights ORDER BY created_at DESC').all())
  ipcMain.handle('insights:add', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO ai_insights (type, content, action_taken) VALUES (?,?,?)`).run(data.type, data.content, data.action_taken || 0)
    return getDb().prepare('SELECT * FROM ai_insights WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('insights:dismiss', (_e, id: number) => getDb().prepare('DELETE FROM ai_insights WHERE id = ?').run(id))
  ipcMain.handle('insights:markActioned', (_e, id: number) => {
    getDb().prepare('UPDATE ai_insights SET action_taken = 1 WHERE id = ?').run(id)
    return true
  })

  // ─── Paying People ───────────────────────────────────────────────────────
  ipcMain.handle('payingPeople:getAll', () => getDb().prepare('SELECT * FROM people_payments ORDER BY next_payment_date ASC').all())
  ipcMain.handle('payingPeople:add', (_e, data: any) => {
    const res = getDb().prepare(`INSERT INTO people_payments (person_name, phone, amount, payment_method, frequency, next_payment_date, notes) VALUES (?,?,?,?,?,?,?)`).run(data.person_name, data.phone, data.amount, data.payment_method, data.frequency, data.next_payment_date, data.notes)
    return getDb().prepare('SELECT * FROM people_payments WHERE id = ?').get(res.lastInsertRowid)
  })
  ipcMain.handle('payingPeople:update', (_e, id: number, data: any) => {
    getDb().prepare(`UPDATE people_payments SET person_name=?, phone=?, amount=?, payment_method=?, frequency=?, next_payment_date=?, notes=? WHERE id=?`).run(data.person_name, data.phone, data.amount, data.payment_method, data.frequency, data.next_payment_date, data.notes, id)
    return getDb().prepare('SELECT * FROM people_payments WHERE id = ?').get(id)
  })
  ipcMain.handle('payingPeople:delete', (_e, id: number) => getDb().prepare('DELETE FROM people_payments WHERE id = ?').run(id))

  // ─── Settings ────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', (_e, key: string) => {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as any
    if (!row) return null
    try { return JSON.parse(row.value) } catch { return row.value }
  })
  ipcMain.handle('settings:set', (_e, key: string, value: unknown) => {
    const existing = getDb().prepare('SELECT key FROM settings WHERE key = ?').get(key)
    if (existing) {
      getDb().prepare('UPDATE settings SET value = ? WHERE key = ?').run(JSON.stringify(value), key)
    } else {
      getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value))
    }
    return true
  })
  ipcMain.handle('settings:getAll', () => {
    const rows = getDb().prepare('SELECT key, value FROM settings').all() as any[]
    return rows.reduce((acc, r) => {
      try { acc[r.key] = JSON.parse(r.value) } catch { acc[r.key] = r.value }
      return acc
    }, {} as Record<string, any>)
  })
  ipcMain.handle('settings:save', (_e, obj: Record<string, unknown>) => {
    console.log('[Settings Save] Saving:', obj)
    const db = getDb()
    const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    for (const [key, value] of Object.entries(obj)) {
      insert.run(key, JSON.stringify(value))
    }
    return true
  })

  // ─── Dashboard Summary ───────────────────────────────────────────────────
  ipcMain.handle('dashboard:getSummary', (_e, month: string) => {
    const db = getDb()
    const income = db.prepare(`SELECT COALESCE(SUM(CASE WHEN frequency='monthly' THEN amount WHEN frequency='weekly' THEN amount*4 WHEN frequency='biweekly' THEN amount*2 WHEN frequency='yearly' THEN amount/12 ELSE amount END), 0) as total FROM income_sources WHERE active = 1`).get() as any
    const expenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE strftime('%Y-%m', date) = ?`).get(month) as any
    const loans = db.prepare(`SELECT COALESCE(SUM(remaining_balance), 0) as total_debt, COALESCE(SUM(monthly_payment), 0) as monthly_payments FROM loans`).get() as any
    const assets = db.prepare(`SELECT COALESCE(SUM(current_value), 0) as total FROM investments`).get() as any
    const goals = db.prepare(`SELECT COALESCE(SUM(current_amount), 0) as total_saved FROM savings_goals WHERE completed_at IS NULL`).get() as any
    const activeLoans = db.prepare(`SELECT COUNT(*) as count FROM loans WHERE remaining_balance > 0`).get() as any
    const subsCount = db.prepare(`SELECT COUNT(*) as count FROM subscriptions WHERE active = 1`).get() as any
    const peopleCount = db.prepare(`SELECT COUNT(*) as count FROM people_owed WHERE paid = 0`).get() as any
    const habitsCost = db.prepare(`SELECT COALESCE(SUM(avg_weekly_spend * 4), 0) as total FROM bad_habits`).get() as any
    const goalsCount = db.prepare(`SELECT COUNT(*) as count FROM savings_goals WHERE completed_at IS NULL`).get() as any
    return {
      income: income.total, expenses: expenses.total, loans, assets: assets.total, goalsSaved: goals.total_saved,
      activeLoans: activeLoans.count, subscriptionsCount: subsCount.count, peopleOwed: peopleCount.count,
      habitsMonthly: habitsCost.total, goalsCount: goalsCount.count,
    }
  })

  ipcMain.handle('dashboard:getTrends', (_e, range: string) => {
    const db = getDb()
    const months = range === '1y' ? 12 : range === 'all' ? 24 : 6
    const monthLabels: string[] = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      monthLabels.push(d.toLocaleString('en-US', { month: 'short' }))
    }

    // Income vs Expenses per month
    const areaData = monthLabels.map((label, i) => {
      const targetMonth = new Date(); targetMonth.setMonth(targetMonth.getMonth() - (months - 1 - i))
      const ym = targetMonth.toISOString().slice(0, 7)
      const inc = db.prepare(`SELECT COALESCE(SUM(CASE WHEN frequency='monthly' THEN amount WHEN frequency='weekly' THEN amount*4 WHEN frequency='biweekly' THEN amount*2 WHEN frequency='yearly' THEN amount/12 ELSE amount END), 0) as total FROM income_sources WHERE active = 1`).get() as any
      const exp = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE strftime('%Y-%m', date) = ?`).get(ym) as any
      return { month: label, income: Math.round(inc.total || 0), expenses: Math.round(exp.total || 0) }
    })

    // Category breakdown for current month
    const catData = db.prepare(`SELECT COALESCE(c.name, 'Uncategorized') as name, SUM(e.amount) as value FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE strftime('%Y-%m', e.date) = strftime('%Y-%m', 'now') GROUP BY c.name ORDER BY value DESC LIMIT 6`).all() as any[]
    const donutData = catData.map((c, i) => ({ name: c.name, value: Math.round(c.value || 0), key: `cat${i}` }))
    if (donutData.length === 0) {
      donutData.push({ name: 'No Data', value: 1, key: 'cat0' })
    }

    // Monthly savings
    const barData = monthLabels.map((label, i) => {
      const targetMonth = new Date(); targetMonth.setMonth(targetMonth.getMonth() - (months - 1 - i))
      const ym = targetMonth.toISOString().slice(0, 7)
      const inc = db.prepare(`SELECT COALESCE(SUM(CASE WHEN frequency='monthly' THEN amount WHEN frequency='weekly' THEN amount*4 WHEN frequency='biweekly' THEN amount*2 WHEN frequency='yearly' THEN amount/12 ELSE amount END), 0) as total FROM income_sources WHERE active = 1`).get() as any
      const exp = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE strftime('%Y-%m', date) = ?`).get(ym) as any
      return { month: label, savings: Math.round((inc.total || 0) - (exp.total || 0)) }
    })

    return { areaData, donutData, barData }
  })

  // ─── Auth ────────────────────────────────────────────────────────────────
  ipcMain.handle('auth:register', (_e, data: { username: string; displayName: string; password: string }) => {
    const { username, displayName, password } = data
    if (!username || username.length < 3) throw new Error('Username must be at least 3 characters')
    if (!password || password.length < 4) throw new Error('Password must be at least 4 characters')
    const salt = randomBytes(16).toString('hex')
    const passwordHash = `${salt}:${hashPassword(password, salt)}`
    try {
      const res = getDb().prepare(
        'INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)'
      ).run(username.trim(), (displayName || username).trim(), passwordHash)
      const user = getDb().prepare('SELECT id, username, display_name FROM users WHERE id = ?').get(res.lastInsertRowid) as any
      const session = { id: user.id, username: user.username, displayName: user.display_name }
      store.set('currentUser', session)
      return session
    } catch (e: any) {
      if (e.message?.includes('UNIQUE')) throw new Error('Username already taken')
      throw e
    }
  })

  ipcMain.handle('auth:login', (_e, data: { username: string; password: string }) => {
    const { username, password } = data
    const user = getDb().prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username?.trim()) as any
    if (!user) throw new Error('Invalid username or password')
    const [salt, hash] = user.password_hash.split(':')
    if (hashPassword(password, salt) !== hash) throw new Error('Invalid username or password')
    const session = { id: user.id, username: user.username, displayName: user.display_name }
    store.set('currentUser', session)
    return session
  })

  ipcMain.handle('auth:logout', () => {
    store.delete('currentUser')
    return true
  })

  ipcMain.handle('auth:getSession', () => store.get('currentUser', null))

  ipcMain.handle('auth:listUsers', () =>
    getDb().prepare('SELECT id, username, display_name as displayName FROM users ORDER BY created_at ASC').all()
  )

  // ─── Reminders ───────────────────────────────────────────────────────────
  ipcMain.handle('reminders:getAll', () =>
    getDb().prepare('SELECT * FROM reminders ORDER BY scheduled_at ASC').all()
  )

  ipcMain.handle('reminders:add', (_e, data: { title: string; body?: string; scheduledAt: string; repeat?: string; category?: string }) => {
    const { title, body, scheduledAt, repeat = 'none', category = 'custom' } = data
    if (!title) throw new Error('Title is required')
    const res = getDb().prepare(
      'INSERT INTO reminders (title, body, scheduled_at, repeat, category) VALUES (?, ?, ?, ?, ?)'
    ).run(title, body || '', scheduledAt, repeat, category)
    return getDb().prepare('SELECT * FROM reminders WHERE id = ?').get(res.lastInsertRowid)
  })

  ipcMain.handle('reminders:update', (_e, id: number, data: Record<string, unknown>) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ')
    const values = Object.values(data)
    getDb().prepare(`UPDATE reminders SET ${fields} WHERE id = ?`).run(...values, id)
    return getDb().prepare('SELECT * FROM reminders WHERE id = ?').get(id)
  })

  ipcMain.handle('reminders:delete', (_e, id: number) => {
    getDb().prepare('DELETE FROM reminders WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('reminders:fireNow', (_e, id: number) => {
    const r = getDb().prepare('SELECT * FROM reminders WHERE id = ?').get(id) as any
    if (r) {
      const { sendNotification } = require('./notifications')
      sendNotification(`⏰ ${r.title}`, r.body || '')
    }
    return true
  })

  ipcMain.handle('notifications:send', (_e, title: string, body: string) => {
    const { sendCustomNotification } = require('./notifications')
    sendCustomNotification(title, body)
    return true
  })

  // ─── Export / Import ─────────────────────────────────────────────────────
  ipcMain.handle('export:json', () => {
    const db = getDb()
    return {
      income_sources: db.prepare('SELECT * FROM income_sources').all(),
      expenses: db.prepare('SELECT * FROM expenses').all(),
      categories: db.prepare('SELECT * FROM categories').all(),
      loans: db.prepare('SELECT * FROM loans').all(),
      loan_payments: db.prepare('SELECT * FROM loan_payments').all(),
      savings_goals: db.prepare('SELECT * FROM savings_goals').all(),
      investments: db.prepare('SELECT * FROM investments').all(),
      people_owed: db.prepare('SELECT * FROM people_owed').all(),
      bad_habits: db.prepare('SELECT * FROM bad_habits').all(),
      bad_habit_log: db.prepare('SELECT * FROM bad_habit_log').all(),
      subscriptions: db.prepare('SELECT * FROM subscriptions').all(),
      date_budgets: db.prepare('SELECT * FROM date_budgets').all(),
      financial_mood_log: db.prepare('SELECT * FROM financial_mood_log').all(),
      settings: db.prepare('SELECT * FROM settings').all(),
    }
  })

  // ─── AI / OpenAI ─────────────────────────────────────────────────────────
  ipcMain.handle('ai:testKey', async (_e, apiKey: string) => {
    try {
      const client = new OpenAI({ apiKey })
      await client.models.list()
      return true
    } catch {
      return false
    }
  })

  // ─── LLM Provider Management ──────────────────────────────────────────
  ipcMain.handle('llm:getSettings', () => getLLMSettings())
  ipcMain.handle('llm:listOllamaModels', async (_e, url: string) => {
    try {
      const models = await listOllamaModels(url)
      return { ok: true, models }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Failed to reach Ollama' }
    }
  })
  ipcMain.handle('llm:testOllama', async (_e, url: string, model: string) => testOllama(url, model))

  function buildDatabaseContext(currencySymbol: string = '$'): string {
    const db = getDb()
    const incomeSources = db.prepare('SELECT name, type, amount, frequency, active FROM income_sources').all() as any[]
    const expenses = db.prepare('SELECT name, amount, date, type, merchant, payment_method FROM expenses ORDER BY date DESC LIMIT 50').all() as any[]
    const categories = db.prepare('SELECT name, color, monthly_budget, type FROM categories').all() as any[]
    const loans = db.prepare('SELECT name, lender, principal_amount, remaining_balance, interest_rate, monthly_payment, end_date FROM loans').all() as any[]
    const goals = db.prepare('SELECT name, target_amount, current_amount, target_date, monthly_contribution FROM savings_goals WHERE completed_at IS NULL').all() as any[]
    const investments = db.prepare('SELECT name, type, ticker_symbol, amount_invested, current_value, purchase_date FROM investments').all() as any[]
    const people = db.prepare('SELECT name, amount, direction, description, due_date, paid FROM people_owed').all() as any[]
    const habits = db.prepare('SELECT name, category, avg_weekly_spend, times_per_week FROM bad_habits').all() as any[]
    const subscriptions = db.prepare('SELECT name, amount, frequency, next_billing_date, active FROM subscriptions').all() as any[]
    const payingPeople = db.prepare('SELECT person_name, amount, payment_method, frequency, next_payment_date FROM people_payments').all() as any[]
    const dateBudgets = db.prepare('SELECT name, date, total_budget, spent, venue FROM date_budgets').all() as any[]
    const reminders = db.prepare('SELECT title, scheduled_at, repeat, category, active FROM reminders').all() as any[]
    const moodLog = db.prepare('SELECT mood, note, date FROM financial_mood_log ORDER BY date DESC LIMIT 10').all() as any[]
    const kbRow = db.prepare('SELECT content FROM knowledge_base ORDER BY id DESC LIMIT 1').get() as any
    const netWorthSnapshots = db.prepare('SELECT snapshot_date, net_worth, total_assets, total_liabilities FROM net_worth_snapshots ORDER BY snapshot_date DESC LIMIT 10').all() as any[]
    const taxRecords = db.prepare('SELECT tax_year, total_income, taxable_income, deductions, credits, tax_paid, estimated_tax_due, filing_status FROM tax_records ORDER BY tax_year DESC').all() as any[]
    const documents = db.prepare('SELECT name, type, tags, related_entity, notes FROM documents ORDER BY uploaded_at DESC LIMIT 20').all() as any[]
    const wishlist = db.prepare('SELECT name, price, priority, category, target_date, savings_allocated FROM wishlist WHERE purchased = 0 ORDER BY priority ASC').all() as any[]
    const cashFlowEvents = db.prepare('SELECT name, type, amount, frequency, start_date, end_date, active FROM cash_flow_events WHERE active = 1').all() as any[]
    const sinkingFunds = db.prepare('SELECT name, target_amount, current_amount, monthly_contribution, category FROM sinking_funds').all() as any[]
    const healthScores = db.prepare('SELECT score, savings_rate, debt_to_income, budget_adherence, emergency_fund_months, recorded_at FROM health_scores ORDER BY recorded_at DESC LIMIT 5').all() as any[]

    const totalIncome = incomeSources.reduce((s, i) => s + (i.active ? i.amount : 0), 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const latestNetWorth = netWorthSnapshots.length > 0 ? netWorthSnapshots[0].net_worth : 0

    return `USER FINANCIAL DATA (read-only context):
=== INCOME SOURCES (${incomeSources.length}) ===
${incomeSources.map(i => `- ${i.name}: ${currencySymbol}${i.amount} (${i.frequency}) [${i.active ? 'active' : 'inactive'}]`).join('\n') || 'None'}

=== EXPENSES (last 50) ===
${expenses.map(e => `- ${e.name}: ${currencySymbol}${e.amount} on ${e.date} [${e.merchant || 'no merchant'}]`).join('\n') || 'None'}

=== CATEGORIES ===
${categories.map(c => `- ${c.name}: budget ${currencySymbol}${c.monthly_budget} [${c.type}]`).join('\n') || 'None'}

=== LOANS ===
${loans.map(l => `- ${l.name}: ${currencySymbol}${l.remaining_balance} remaining of ${currencySymbol}${l.principal_amount} at ${l.interest_rate}%`).join('\n') || 'None'}

=== SAVINGS GOALS ===
${goals.map(g => `- ${g.name}: ${currencySymbol}${g.current_amount} / ${currencySymbol}${g.target_amount} (due ${g.target_date || 'no date'})`).join('\n') || 'None'}

=== INVESTMENTS ===
${investments.map(i => `- ${i.name} (${i.ticker_symbol || i.type}): ${currencySymbol}${i.amount_invested} → ${currencySymbol}${i.current_value}`).join('\n') || 'None'}

=== PEOPLE OWED ===
${people.map(p => `- ${p.name}: ${currencySymbol}${p.amount} [${p.direction}] ${p.paid ? '(paid)' : '(unpaid)'}`).join('\n') || 'None'}

=== BAD HABITS ===
${habits.map(h => `- ${h.name}: ~${currencySymbol}${h.avg_weekly_spend}/week, ${h.times_per_week}x/week`).join('\n') || 'None'}

=== SUBSCRIPTIONS ===
${subscriptions.map(s => `- ${s.name}: ${currencySymbol}${s.amount} (${s.frequency}) [${s.active ? 'active' : 'inactive'}]`).join('\n') || 'None'}

=== PAYING PEOPLE ===
${payingPeople.map(p => `- ${p.person_name}: ${currencySymbol}${p.amount} (${p.frequency})`).join('\n') || 'None'}

=== DATE BUDGETS ===
${dateBudgets.map(d => `- ${d.name}: ${currencySymbol}${d.spent} / ${currencySymbol}${d.total_budget}`).join('\n') || 'None'}

=== REMINDERS ===
${reminders.map(r => `- ${r.title}: ${r.scheduled_at} [${r.repeat}]`).join('\n') || 'None'}

=== MOOD LOG (last 10) ===
${moodLog.map(m => `- ${m.date}: ${m.mood} - ${m.note}`).join('\n') || 'None'}

=== NET WORTH SNAPSHOTS (last 10) ===
${netWorthSnapshots.map(n => `- ${n.snapshot_date}: Assets ${currencySymbol}${n.total_assets}, Liabilities ${currencySymbol}${n.total_liabilities}, Net ${currencySymbol}${n.net_worth}`).join('\n') || 'None'}

=== TAX RECORDS ===
${taxRecords.map(t => `- ${t.tax_year} (${t.filing_status}): Income ${currencySymbol}${t.total_income}, Taxable ${currencySymbol}${t.taxable_income}, Deductions ${currencySymbol}${t.deductions}, Est. Due ${currencySymbol}${t.estimated_tax_due}, Paid ${currencySymbol}${t.tax_paid}`).join('\n') || 'None'}

=== DOCUMENTS ===
${documents.map(d => `- ${d.name} [${d.type}]${d.tags ? ' tags: ' + d.tags : ''}${d.related_entity ? ' linked to: ' + d.related_entity : ''}`).join('\n') || 'None'}

=== WISHLIST ===
${wishlist.map(w => `- ${w.name}: ${currencySymbol}${w.price} (${w.category}) priority ${w.priority}${w.target_date ? ' target: ' + w.target_date : ''} allocated: ${currencySymbol}${w.savings_allocated}`).join('\n') || 'None'}

=== CASH FLOW EVENTS ===
${cashFlowEvents.map(c => `- ${c.name}: ${currencySymbol}${c.amount} (${c.type}, ${c.frequency}) starting ${c.start_date}`).join('\n') || 'None'}

=== SINKING FUNDS ===
${sinkingFunds.map(s => `- ${s.name}: ${currencySymbol}${s.current_amount} / ${currencySymbol}${s.target_amount} (${s.category}) +${currencySymbol}${s.monthly_contribution}/mo`).join('\n') || 'None'}

=== HEALTH SCORE HISTORY (last 5) ===
${healthScores.map(h => `- ${h.recorded_at?.split('T')[0]}: ${h.score}/100 (savings ${h.savings_rate}%, DTI ${h.debt_to_income}%)`).join('\n') || 'None'}

=== USER KNOWLEDGE BASE ===
${kbRow?.content?.trim() || 'No knowledge base entries yet. The user can add personal details about rent, income, goals, habits, etc.'}

=== SUMMARY ===
Total tracked income: ${currencySymbol}${totalIncome}
Recent expenses total: ${currencySymbol}${totalExpenses}
Latest net worth: ${currencySymbol}${latestNetWorth}
`.trim()
  }

  ipcMain.handle('ai:chat', async (_e, message: string, memory: string[] = []) => {
    try {
      if (!isLLMConfigured()) throw new Error('No LLM provider configured')

      // Load user currency/locale FIRST (needed by buildDatabaseContext)
      const userCurrency = getDb().prepare("SELECT value FROM settings WHERE key = 'currency'").get() as any
      const userSymbol = getDb().prepare("SELECT value FROM settings WHERE key = 'currencySymbol'").get() as any
      const userLocale = getDb().prepare("SELECT value FROM settings WHERE key = 'locale'").get() as any
      const userCountry = getDb().prepare("SELECT value FROM settings WHERE key = 'country'").get() as any
      const uCurrency = userCurrency ? JSON.parse(userCurrency.value) : 'USD'
      const uSymbol = userSymbol ? JSON.parse(userSymbol.value) : '$'
      const uLocale = userLocale ? JSON.parse(userLocale.value) : 'en-US'
      const uCountry = userCountry ? JSON.parse(userCountry.value) : 'US'

      const dbContext = buildDatabaseContext(uSymbol)

      // Load AI personality settings
      const aiName = getDb().prepare("SELECT value FROM settings WHERE key = 'ai_name'").get() as any
      const aiGender = getDb().prepare("SELECT value FROM settings WHERE key = 'ai_gender'").get() as any
      const aiPersonality = getDb().prepare("SELECT value FROM settings WHERE key = 'ai_personality'").get() as any
      const aiInstructions = getDb().prepare("SELECT value FROM settings WHERE key = 'ai_instructions'").get() as any

      const name = aiName ? JSON.parse(aiName.value) : 'WealthOS AI'
      const gender = aiGender ? JSON.parse(aiGender.value) : 'neutral'
      const personality = aiPersonality ? JSON.parse(aiPersonality.value) : 'friendly'
      const instructions = aiInstructions ? JSON.parse(aiInstructions.value) : ''

      const personalityTraits: Record<string, string> = {
        professional: 'You are formal, precise, and data-driven. Use clear analysis and structured recommendations. Avoid casual language.',
        friendly: 'You are warm, encouraging, and supportive. Use conversational language, cheer the user on, and celebrate wins.',
        witty: 'You are humorous and playful. Use light jokes, occasional puns, and emojis. Keep finance fun but still accurate.',
        strict: 'You are direct, no-nonsense, and accountability-focused. Challenge excuses, give tough love when needed, and push for action.',
        zen: 'You are calm, philosophical, and mindful. Use reflective language, encourage balance, and avoid urgency.',
      }

      const memorySection = memory.length > 0 ? `\n=== CONVERSATION MEMORY ===\n${memory.map((m, i) => `${i + 1}. ${m}`).join('\n')}` : ''

      const systemPrompt = `You are ${name}, a personalized AI financial assistant. Your gender identity is ${gender}. ${personalityTraits[personality] || personalityTraits.friendly}
${instructions ? `\nADDITIONAL INSTRUCTIONS FROM USER:\n${instructions}` : ''}

You have FULL READ ACCESS to the user's financial records across every module.

USER REGIONAL CONTEXT:
- Base currency: ${uCurrency} (${uSymbol})
- Locale: ${uLocale}
- Country: ${uCountry}
All monetary values in this conversation should be formatted and expressed using the user's base currency (${uSymbol} / ${uCurrency}) and local conventions. Never default to USD unless explicitly asked.

CONTEXT:\n${dbContext}${memorySection}

RESPONSE FORMATTING RULES:
1. Use Markdown formatting: **bold** for key numbers and emphasis, *italics* for definitions, bullet points for lists, ### headers for sections.
2. Highlight important financial terms like budget, savings, debt, income, expense, goal, investment, loan, interest, rate, warning, alert, critical, urgent.
3. Structure responses with clear sections, numbered lists for actionable steps, and bullet points for analysis.
4. Keep responses concise but insightful (3-8 sentences for simple questions, longer for deep analysis).
5. Use actual monetary amounts in the user's base currency and percentages from their data. Never assume USD.

KNOWLEDGE BASE USAGE:
The user has provided personal knowledge base entries (rent, job, lifestyle, preferences, constraints, goals, etc.). Use this information FIRST AND FOREMOST when crafting ALL advice. These entries represent the user's explicit instructions about their life situation. When you see entries like rent amounts, job titles, or savings goals, tailor every recommendation around these facts.

DECISION CONTROL & PROACTIVE GUIDANCE:
You are not just a passive responder — you actively guide the user's financial decisions. Based on their knowledge base + actual financial data:
1. Calculate what they can realistically afford to save/invest monthly after fixed expenses from knowledge base.
2. Suggest specific monthly spending limits per category based on their income and stated priorities.
3. Proactively flag when their actual spending conflicts with their knowledge base goals (e.g., "You said you want to save ${uSymbol}500/month but your dining out is ${uSymbol}600 — let's adjust").
4. Create concrete savings plans and investment suggestions tied to their stated goals.
5. When they ask about a purchase, USE the knowledge base to say yes/no with reasoning based on their budget.

MEMORY MANAGEMENT:
You have a conversation memory system. The memory above contains facts from previous conversations. Use these memories to maintain continuity. When the user mentions a goal, decision, or fact, remember it for future conversations.
At the end of each response, include a hidden memory block with new facts to remember:
\`\`\`memory
- User's goal: save ${uSymbol}500/month for emergency fund
- User prefers aggressive debt payoff
- User is planning a trip to Japan in 2027
\`\`\`
Only include genuinely new facts. If nothing new was learned, omit the block.

AGENT MODE — YOU CAN TAKE ACTIONS:
You are an AGENT, not just a chat. When the user asks you to do something, propose actions as JSON blocks. The user will confirm before they run. You may include MULTIPLE action blocks in one response — they become a multi-step plan.

Each action is fenced like this:
\`\`\`action
{"type": "ACTION_TYPE", ...fields}
\`\`\`

AVAILABLE ACTIONS:
- add_expense: {"type":"add_expense","name":"Coffee","amount":4.5,"category":"Food & Dining","merchant":"Starbucks","date":"2026-05-16"}
- delete_expense: {"type":"delete_expense","id":123}
- add_income: {"type":"add_income","name":"Salary","amount":5000,"frequency":"monthly","income_type":"salary"}
- add_subscription: {"type":"add_subscription","name":"Netflix","amount":15.99,"frequency":"monthly","category":"entertainment"}
- cancel_subscription: {"type":"cancel_subscription","name":"Netflix"}  (or use id)
- update_category_budget: {"type":"update_category_budget","category":"Food & Dining","monthly_budget":250}
- transfer_to_goal: {"type":"transfer_to_goal","goal_name":"Emergency Fund","amount":200}
- log_loan_payment: {"type":"log_loan_payment","loan_name":"Car Loan","amount":350}
- create_goal: {"type":"create_goal","name":"Emergency Fund","target_amount":5000,"target_date":"2026-12-31","monthly_contribution":400,"reason":"3-month buffer"}
- create_reminder: {"type":"create_reminder","title":"Pay rent","scheduledAt":"2026-06-01T09:00:00","repeat":"monthly","category":"finance"}
- snooze_reminder: {"type":"snooze_reminder","id":12,"scheduledAt":"2026-06-05T09:00:00"}
- add_kb_entry: {"type":"add_kb_entry","content":"Spends ~$200/month on coffee"}
- add_tax_record: {"type":"add_tax_record","tax_year":2026,"total_income":75000,"taxable_income":60000,"deductions":13850,"credits":2000,"tax_paid":12000,"estimated_tax_due":9500,"filing_status":"single","notes":"W-2 income"}
- add_wishlist_item: {"type":"add_wishlist_item","name":"New Laptop","price":1200,"priority":2,"category":"electronics","target_date":"2026-12-01","savings_allocated":400,"notes":"For work"}
- add_document: {"type":"add_document","name":"January Receipt","type":"receipt","file_path":"/docs/receipt_jan.pdf","tags":"tax, deductible","related_entity":"expense","related_id":45,"notes":"Business dinner"}
- save_net_worth_snapshot: {"type":"save_net_worth_snapshot","total_assets":150000,"total_liabilities":45000,"snapshot_date":"2026-05-16"}
- add_cash_flow_event: {"type":"add_cash_flow_event","name":"Freelance Payment","type":"income","amount":1200,"frequency":"monthly","start_date":"2026-05-01","notes":"Client retainer"}
- add_sinking_fund: {"type":"add_sinking_fund","name":"Car Maintenance","target_amount":1200,"current_amount":400,"monthly_contribution":100,"category":"vehicle","icon":"🚗","color":"#3b82f6","notes":"Oil changes, tires, repairs"}
- contribute_to_sinking_fund: {"type":"contribute_to_sinking_fund","fund_name":"Car Maintenance","amount":150}
- save_health_score: {"type":"save_health_score","score":72,"savings_rate":18.5,"debt_to_income":12,"budget_adherence":85,"emergency_fund_months":4.2,"investment_ratio":35}

DETECTING USER INTENT TO CREATE RECORDS — THIS IS CRITICAL:
When the user says ANYTHING that implies they want to save, add, log, track, or record financial data, you MUST emit action blocks. Do NOT just say "I can help with that" without showing the action blocks. Examples of trigger phrases:
- "Save this expense" / "add this expense" / "log my spending" / "I spent $X on Y"
- "Add income" / "I got paid" / "my salary is" / "I earned"
- "Create a goal" / "I want to save for" / "set a target"
- "Add a subscription" / "track my Netflix" / "I pay monthly for"
- "Log a loan payment" / "I paid off" / "contribution to"
- "Update my budget" / "change category limit"
- "Add to knowledge base" / "remember that I"

If you are unsure whether the user wants you to act, ASSUME YES and emit the action blocks. The user can decline by not clicking Run.

PROACTIVE RECORD CREATION — LISTEN FOR HIDDEN TRANSACTIONS:
The user may casually mention activities that IMPLY financial transactions. When they do, you MUST proactively detect and propose the appropriate action blocks. Examples:
- "I went on a trip to Paris last weekend, spent about $800 on flights and hotels" → propose add_expense for flights, hotels, and any mentioned meals/activities.
- "I sold my old bike for $150 yesterday" → propose add_income.
- "I paid $200 for car repairs on Tuesday" → propose add_expense.
- "I bought groceries at Whole Foods for $95" → propose add_expense with merchant.
- "My Netflix subscription renewed today for $15.99" → propose add_expense or add_subscription.
- "I got my paycheck today, $4,200" → propose add_income.
- "I transferred $300 into my emergency fund" → propose transfer_to_goal.
- "I paid off $500 of my student loan" → propose log_loan_payment.

When the user describes multiple things in one message, extract ALL of them. Don't wait for explicit commands.

RULES FOR ACTIONS:
1. Propose actions BOTH when explicitly asked AND when the user casually describes financial activities.
2. NEVER fabricate IDs — use names; the system looks them up.
3. You may propose 1-N actions per response. Combine related steps (e.g. cancel sub + transfer the savings to a goal).
4. Always explain in plain text what each action does and why, before/after the JSON blocks.
5. Use the user's knowledge base + actual data to set realistic amounts.
6. After proposing, ALWAYS end with a sentence asking the user to confirm, e.g. "Would you like me to save these records? Click Run to confirm."
7. If you detect spending or income from a casual story, say something like "I noticed you mentioned spending $X on Y — should I log that?" then show the action blocks.
8. NEVER silently skip action blocks. If the user mentions any amount + category/merchant, emit an action block.

Be proactive — suggest goals, budget tweaks, subscription cancellations the user might want based on their data AND knowledge base. Sign off casually with your name (${name}) only when concluding.`

      const content = await chatComplete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        maxTokens: 1200,
      })
      return content || 'No response'
    } catch (e: any) {
      console.error('[ai:chat] error:', e)
      const detail = e?.cause?.code || e?.code || e?.status || ''
      const msg = e?.message || 'AI request failed'
      throw new Error(detail ? `${msg} (${detail})` : msg)
    }
  })

  ipcMain.handle('ai:createGoal', (_e, data: { name: string; target_amount: number; target_date?: string; monthly_contribution?: number; notes?: string }) => {
    const db = getDb()
    const res = db.prepare('INSERT INTO savings_goals (name, target_amount, current_amount, target_date, monthly_contribution, notes, color) VALUES (?, ?, 0, ?, ?, ?, ?)').run(
      data.name, data.target_amount, data.target_date || null, data.monthly_contribution || 0, data.notes || '', '#10b981'
    )
    return db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(res.lastInsertRowid)
  })

  ipcMain.handle('ai:createReminder', (_e, data: { title: string; body?: string; scheduledAt: string; repeat?: string; category?: string }) => {
    const db = getDb()
    const res = db.prepare('INSERT INTO reminders (title, body, scheduled_at, repeat, category) VALUES (?, ?, ?, ?, ?)').run(
      data.title, data.body || '', data.scheduledAt, data.repeat || 'none', data.category || 'custom'
    )
    return db.prepare('SELECT * FROM reminders WHERE id = ?').get(res.lastInsertRowid)
  })

  // ─── AI Agent Action Executor ──────────────────────────────────────────
  ipcMain.handle('agent:execute', (_e, action: any) => {
    const db = getDb()
    try {
      const t = action?.type
      const today = new Date().toISOString().slice(0, 10)
      switch (t) {
        case 'add_expense': {
          const cat = action.category
            ? (db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)').get(action.category) as any)
            : null
          const res = db.prepare(`INSERT INTO expenses (category_id, name, amount, date, type, merchant, payment_method, notes) VALUES (?,?,?,?,?,?,?,?)`).run(
            cat?.id || null, action.name, Number(action.amount), action.date || today,
            action.type || 'variable', action.merchant || null, action.payment_method || 'cash', action.notes || null
          )
          return { ok: true, id: res.lastInsertRowid, summary: `Added expense "${action.name}" $${action.amount}` }
        }
        case 'delete_expense': {
          db.prepare('DELETE FROM expenses WHERE id = ?').run(action.id)
          return { ok: true, summary: `Deleted expense #${action.id}` }
        }
        case 'add_income': {
          const res = db.prepare(`INSERT INTO income_sources (name, type, amount, frequency, currency, active) VALUES (?,?,?,?,?,?)`).run(
            action.name, action.income_type || 'salary', Number(action.amount), action.frequency || 'monthly', action.currency || 'USD', 1
          )
          return { ok: true, id: res.lastInsertRowid, summary: `Added income "${action.name}" $${action.amount}/${action.frequency || 'monthly'}` }
        }
        case 'add_subscription': {
          const res = db.prepare(`INSERT INTO subscriptions (name, amount, frequency, next_billing_date, category, active) VALUES (?,?,?,?,?,?)`).run(
            action.name, Number(action.amount), action.frequency || 'monthly', action.next_billing_date || today, action.category || 'other', 1
          )
          return { ok: true, id: res.lastInsertRowid, summary: `Tracking subscription "${action.name}" $${action.amount}` }
        }
        case 'cancel_subscription': {
          // by id or name
          let target: any
          if (action.id) target = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(action.id)
          else target = db.prepare('SELECT * FROM subscriptions WHERE LOWER(name) = LOWER(?)').get(action.name)
          if (!target) return { ok: false, summary: `Subscription "${action.name || action.id}" not found` }
          db.prepare('UPDATE subscriptions SET active = 0 WHERE id = ?').run(target.id)
          return { ok: true, summary: `Cancelled "${target.name}" — saves $${target.amount}/${target.frequency}` }
        }
        case 'update_category_budget': {
          const cat = db.prepare('SELECT * FROM categories WHERE LOWER(name) = LOWER(?)').get(action.category) as any
          if (!cat) return { ok: false, summary: `Category "${action.category}" not found` }
          db.prepare('UPDATE categories SET monthly_budget = ? WHERE id = ?').run(Number(action.monthly_budget), cat.id)
          return { ok: true, summary: `Budget for "${cat.name}" → $${action.monthly_budget}/mo` }
        }
        case 'transfer_to_goal': {
          let goal: any
          if (action.goal_id) goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(action.goal_id)
          else goal = db.prepare('SELECT * FROM savings_goals WHERE LOWER(name) = LOWER(?)').get(action.goal_name)
          if (!goal) return { ok: false, summary: `Goal "${action.goal_name}" not found` }
          db.prepare('UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ?').run(Number(action.amount), goal.id)
          return { ok: true, summary: `Added $${action.amount} to goal "${goal.name}"` }
        }
        case 'log_loan_payment': {
          let loan: any
          if (action.loan_id) loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(action.loan_id)
          else loan = db.prepare('SELECT * FROM loans WHERE LOWER(name) = LOWER(?)').get(action.loan_name)
          if (!loan) return { ok: false, summary: `Loan "${action.loan_name}" not found` }
          db.prepare('INSERT INTO loan_payments (loan_id, amount, date, notes) VALUES (?,?,?,?)').run(loan.id, Number(action.amount), action.date || today, action.notes || null)
          db.prepare('UPDATE loans SET remaining_balance = remaining_balance - ? WHERE id = ?').run(Number(action.amount), loan.id)
          return { ok: true, summary: `Logged $${action.amount} payment on "${loan.name}"` }
        }
        case 'create_goal': {
          const res = db.prepare(`INSERT INTO savings_goals (name, target_amount, current_amount, target_date, monthly_contribution, notes, color) VALUES (?,?,0,?,?,?,?)`).run(
            action.name, Number(action.target_amount), action.target_date || null, Number(action.monthly_contribution) || 0, action.reason || action.notes || '', '#10b981'
          )
          return { ok: true, id: res.lastInsertRowid, summary: `Created goal "${action.name}" $${action.target_amount}` }
        }
        case 'create_reminder': {
          const res = db.prepare('INSERT INTO reminders (title, body, scheduled_at, repeat, category) VALUES (?,?,?,?,?)').run(
            action.title, action.body || '', action.scheduledAt, action.repeat || 'none', action.category || 'custom'
          )
          return { ok: true, id: res.lastInsertRowid, summary: `Reminder "${action.title}" set` }
        }
        case 'snooze_reminder': {
          db.prepare('UPDATE reminders SET scheduled_at = ? WHERE id = ?').run(action.scheduledAt, action.id)
          return { ok: true, summary: `Reminder #${action.id} snoozed to ${action.scheduledAt}` }
        }
        case 'add_kb_entry': {
          const existing = db.prepare('SELECT * FROM knowledge_base ORDER BY id DESC LIMIT 1').get() as any
          const newLine = `- ${action.content}`
          if (existing) {
            const updated = existing.content ? `${existing.content}\n${newLine}` : newLine
            db.prepare('UPDATE knowledge_base SET content = ?, updated_at = datetime(\'now\') WHERE id = ?').run(updated, existing.id)
          } else {
            db.prepare('INSERT INTO knowledge_base (content) VALUES (?)').run(newLine)
          }
          return { ok: true, summary: `Knowledge base updated` }
        }
        case 'add_tax_record': {
          const res = db.prepare(`INSERT INTO tax_records (tax_year, total_income, taxable_income, deductions, credits, tax_paid, estimated_tax_due, filing_status, notes) VALUES (?,?,?,?,?,?,?,?,?)`).run(
            action.tax_year || new Date().getFullYear(), Number(action.total_income) || 0, Number(action.taxable_income) || 0,
            Number(action.deductions) || 0, Number(action.credits) || 0, Number(action.tax_paid) || 0,
            Number(action.estimated_tax_due) || 0, action.filing_status || 'single', action.notes || ''
          )
          return { ok: true, id: res.lastInsertRowid, summary: `Added tax record for ${action.tax_year}` }
        }
        case 'add_wishlist_item': {
          const res = db.prepare(`INSERT INTO wishlist (name, price, priority, category, target_date, savings_allocated, notes) VALUES (?,?,?,?,?,?,?)`).run(
            action.name, Number(action.price) || 0, Number(action.priority) || 3, action.category || 'general',
            action.target_date || null, Number(action.savings_allocated) || 0, action.notes || ''
          )
          return { ok: true, id: res.lastInsertRowid, summary: `Added "${action.name}" to wishlist ($${action.price})` }
        }
        case 'add_document': {
          const res = db.prepare(`INSERT INTO documents (name, type, file_path, tags, related_entity, related_id, notes) VALUES (?,?,?,?,?,?,?)`).run(
            action.name, action.type || 'receipt', action.file_path || '', action.tags || '',
            action.related_entity || '', Number(action.related_id) || 0, action.notes || ''
          )
          return { ok: true, id: res.lastInsertRowid, summary: `Document "${action.name}" added to vault` }
        }
        case 'save_net_worth_snapshot': {
          const assets = Number(action.total_assets) || 0
          const liabilities = Number(action.total_liabilities) || 0
          const res = db.prepare(`INSERT INTO net_worth_snapshots (total_assets, total_liabilities, net_worth, snapshot_date) VALUES (?,?,?,?)`).run(
            assets, liabilities, assets - liabilities, action.snapshot_date || today
          )
          return { ok: true, id: res.lastInsertRowid, summary: `Net worth snapshot saved: $${assets - liabilities}` }
        }
        case 'add_cash_flow_event': {
          const res = db.prepare(`INSERT INTO cash_flow_events (name, type, amount, frequency, start_date, end_date, notes) VALUES (?,?,?,?,?,?,?)`).run(
            action.name, action.type, Number(action.amount), action.frequency || 'monthly', action.start_date || today,
            action.end_date || null, action.notes || ''
          )
          return { ok: true, id: res.lastInsertRowid, summary: `Added cash flow event "${action.name}" ($${action.amount}, ${action.type})` }
        }
        case 'add_sinking_fund': {
          const res = db.prepare(`INSERT INTO sinking_funds (name, target_amount, current_amount, monthly_contribution, category, icon, color, notes) VALUES (?,?,?,?,?,?,?,?)`).run(
            action.name, Number(action.target_amount), Number(action.current_amount) || 0, Number(action.monthly_contribution),
            action.category || 'general', action.icon || '🪣', action.color || '#3b82f6', action.notes || ''
          )
          return { ok: true, id: res.lastInsertRowid, summary: `Created sinking fund "${action.name}"` }
        }
        case 'contribute_to_sinking_fund': {
          let fund: any
          if (action.fund_id) fund = db.prepare('SELECT * FROM sinking_funds WHERE id = ?').get(action.fund_id)
          else fund = db.prepare('SELECT * FROM sinking_funds WHERE LOWER(name) = LOWER(?)').get(action.fund_name)
          if (!fund) return { ok: false, summary: `Sinking fund "${action.fund_name}" not found` }
          db.prepare('UPDATE sinking_funds SET current_amount = current_amount + ? WHERE id = ?').run(Number(action.amount), fund.id)
          return { ok: true, summary: `Added $${action.amount} to "${fund.name}"` }
        }
        case 'save_health_score': {
          const res = db.prepare(`INSERT INTO health_scores (score, savings_rate, debt_to_income, budget_adherence, emergency_fund_months, investment_ratio, breakdown) VALUES (?,?,?,?,?,?,?)`).run(
            Number(action.score), Number(action.savings_rate), Number(action.debt_to_income),
            Number(action.budget_adherence), Number(action.emergency_fund_months), Number(action.investment_ratio),
            JSON.stringify(action.breakdown || {})
          )
          return { ok: true, id: res.lastInsertRowid, summary: `Health score ${action.score}/100 recorded` }
        }
        default:
          return { ok: false, summary: `Unknown action type: ${t}` }
      }
    } catch (e: any) {
      console.error('[agent:execute] error:', e)
      return { ok: false, summary: e?.message || 'Action failed' }
    }
  })

  // ─── Daily Money Briefing ──────────────────────────────────────────────
  ipcMain.handle('briefing:get', async (_e, force?: boolean) => {
    try {
      const db = getDb()
      const today = new Date().toISOString().slice(0, 10)
      const cacheKey = `briefing_${today}`
      if (!force) {
        const cached = db.prepare('SELECT value FROM settings WHERE key = ?').get(cacheKey) as any
        if (cached) return { ok: true, content: JSON.parse(cached.value), cached: true, date: today }
      }

      if (!isLLMConfigured()) return { ok: false, error: 'No LLM provider configured' }

      // Gather today's data
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      const monthStart = today.slice(0, 7) + '-01'

      const yesterdaySpend = (db.prepare("SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses WHERE date = ?").get(yesterday) as any)
      const monthSpend = (db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date >= ?").get(monthStart) as any).total
      const todaySpend = (db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date = ?").get(today) as any).total

      const incomeMonthly = (db.prepare("SELECT COALESCE(SUM(CASE frequency WHEN 'yearly' THEN amount/12 WHEN 'weekly' THEN amount*4.33 WHEN 'biweekly' THEN amount*2.17 WHEN 'quarterly' THEN amount/3 ELSE amount END),0) as total FROM income_sources WHERE active=1").get() as any).total

      const upcomingBills = db.prepare(`SELECT name, amount, next_billing_date FROM subscriptions WHERE active=1 AND next_billing_date BETWEEN date('now') AND date('now','+7 days') ORDER BY next_billing_date`).all() as any[]
      const upcomingReminders = db.prepare(`SELECT title, scheduled_at FROM reminders WHERE scheduled_at BETWEEN datetime('now') AND datetime('now','+3 days') ORDER BY scheduled_at`).all() as any[]

      const goals = db.prepare('SELECT name, current_amount, target_amount FROM savings_goals ORDER BY priority ASC LIMIT 3').all() as any[]

      const overBudget = db.prepare(`
        SELECT c.name, c.monthly_budget, COALESCE(SUM(e.amount),0) as spent
        FROM categories c
        LEFT JOIN expenses e ON e.category_id = c.id AND e.date >= ?
        WHERE c.type='expense' AND c.monthly_budget > 0
        GROUP BY c.id
        HAVING spent > c.monthly_budget * 0.8
        ORDER BY (spent / c.monthly_budget) DESC
        LIMIT 3
      `).all(monthStart) as any[]

      const aiName = db.prepare("SELECT value FROM settings WHERE key = 'ai_name'").get() as any
      const name = aiName ? JSON.parse(aiName.value) : 'WealthOS AI'

      const dataBlock = {
        today, yesterday,
        yesterdaySpend: yesterdaySpend.total, yesterdayCount: yesterdaySpend.count,
        todaySpend, monthSpend, incomeMonthly,
        upcomingBills, upcomingReminders, goals, overBudget,
      }

      const sys = `You are ${name}, a personal finance assistant. Write a punchy DAILY MORNING BRIEFING for the user — 30 seconds spoken, ~80-120 words. Tone: warm, direct, actionable.

Structure:
1. Greeting + headline figure (yesterday's spend or today's status)
2. One concrete observation (over-budget category, or "on track")
3. Heads-up about anything in next 3 days (bill, reminder)
4. ONE specific tiny action (no more than one)

Use real numbers from the JSON. Use **bold** for key numbers. Skip empty sections gracefully. NEVER mention the JSON itself or use technical jargon.`

      const content = await chatComplete({
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: JSON.stringify(dataBlock) },
        ],
        maxTokens: 300,
      }) || 'No briefing available.'
      // Cache for today
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(cacheKey, JSON.stringify(content))
      // Cleanup old briefings
      db.prepare("DELETE FROM settings WHERE key LIKE 'briefing_%' AND key != ?").run(cacheKey)
      return { ok: true, content, cached: false, date: today }
    } catch (e: any) {
      console.error('[briefing:get] error:', e)
      return { ok: false, error: e?.message || 'Failed to generate briefing' }
    }
  })

  // ─── Subscription Killer ───────────────────────────────────────────────
  ipcMain.handle('subkiller:scan', () => {
    const db = getDb()
    // Find merchants with recurring patterns in last 6 months
    const expenses = db.prepare(`
      SELECT name, merchant, amount, date
      FROM expenses
      WHERE date >= date('now', '-6 months')
      ORDER BY date DESC
    `).all() as any[]

    // Group by merchant/name + amount-bucket
    const groups: Record<string, { name: string; merchant: string | null; amount: number; dates: string[]; count: number }> = {}
    for (const e of expenses) {
      const key = `${(e.merchant || e.name).toLowerCase().trim()}|${Math.round(e.amount * 100) / 100}`
      if (!groups[key]) groups[key] = { name: e.name, merchant: e.merchant, amount: e.amount, dates: [], count: 0 }
      groups[key].dates.push(e.date)
      groups[key].count++
    }

    // Get already-tracked subscriptions to exclude
    const tracked = db.prepare('SELECT LOWER(name) as name FROM subscriptions').all() as any[]
    const trackedSet = new Set(tracked.map(t => t.name))

    // Detect recurring: at least 3 occurrences in 6 months with consistent ~monthly spacing
    const recurring = Object.values(groups)
      .filter(g => g.count >= 3)
      .filter(g => !trackedSet.has((g.merchant || g.name).toLowerCase().trim()))
      .map(g => {
        const sorted = g.dates.slice().sort()
        const intervals: number[] = []
        for (let i = 1; i < sorted.length; i++) {
          const d1 = new Date(sorted[i - 1]).getTime()
          const d2 = new Date(sorted[i]).getTime()
          intervals.push(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24))
        }
        const avgInterval = intervals.reduce((s, i) => s + i, 0) / (intervals.length || 1)
        let frequency: string = 'monthly'
        if (avgInterval < 10) frequency = 'weekly'
        else if (avgInterval < 20) frequency = 'biweekly'
        else if (avgInterval < 45) frequency = 'monthly'
        else if (avgInterval < 100) frequency = 'quarterly'
        else frequency = 'yearly'

        const monthlyEquivalent =
          frequency === 'weekly' ? g.amount * 4.33 :
          frequency === 'biweekly' ? g.amount * 2.17 :
          frequency === 'quarterly' ? g.amount / 3 :
          frequency === 'yearly' ? g.amount / 12 :
          g.amount

        return {
          name: g.name,
          merchant: g.merchant,
          amount: g.amount,
          count: g.count,
          frequency,
          avg_interval_days: Math.round(avgInterval),
          monthly_equivalent: Math.round(monthlyEquivalent * 100) / 100,
          last_date: sorted[sorted.length - 1],
        }
      })
      .sort((a, b) => b.monthly_equivalent - a.monthly_equivalent)

    const activeSubs = db.prepare('SELECT * FROM subscriptions WHERE active = 1').all() as any[]
    const totalMonthlyTracked = activeSubs.reduce((s, sub) => {
      const a = sub.amount
      if (sub.frequency === 'weekly') return s + a * 4.33
      if (sub.frequency === 'biweekly') return s + a * 2.17
      if (sub.frequency === 'quarterly') return s + a / 3
      if (sub.frequency === 'yearly') return s + a / 12
      return s + a
    }, 0)

    const totalMonthlyDetected = recurring.reduce((s, r) => s + r.monthly_equivalent, 0)

    return {
      ok: true,
      detected: recurring,
      tracked: activeSubs,
      totals: {
        monthlyTracked: Math.round(totalMonthlyTracked * 100) / 100,
        monthlyDetected: Math.round(totalMonthlyDetected * 100) / 100,
        yearlyTracked: Math.round(totalMonthlyTracked * 12 * 100) / 100,
        yearlyDetected: Math.round(totalMonthlyDetected * 12 * 100) / 100,
      },
    }
  })

  ipcMain.handle('subkiller:draftCancelEmail', async (_e, subscription: any) => {
    try {
      if (!isLLMConfigured()) return { ok: false, error: 'No LLM provider configured' }
      const sys = `You are a customer service correspondence assistant. Write a polite but firm subscription cancellation email. The user wants to cancel their subscription. Output ONLY the email body (no subject line, no signoff placeholders like [Your Name] — use "the customer" or omit). Keep it concise (3-5 sentences). Mention you want immediate cancellation, ask for confirmation, and request no further charges.`
      const userPrompt = `Service: ${subscription.name}
Amount: $${subscription.amount} / ${subscription.frequency || 'monthly'}
Reason: ${subscription.reason || 'No longer needed'}`
      const body = await chatComplete({
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 400,
      })
      const subject = `Request to Cancel My ${subscription.name} Subscription`
      return { ok: true, subject, body }
    } catch (e: any) {
      console.error('[subkiller:draftCancelEmail] error:', e)
      return { ok: false, error: e?.message || 'Failed to draft email' }
    }
  })

  // ─── Bank Statement Importer ───────────────────────────────────────────
  ipcMain.handle('import:pickFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Bank Statement',
      filters: [
        { name: 'Statements', extensions: ['pdf', 'csv', 'txt'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'CSV', extensions: ['csv', 'txt'] },
      ],
      properties: ['openFile'],
    })
    if (result.canceled || !result.filePaths[0]) return { canceled: true }
    return { canceled: false, path: result.filePaths[0] }
  })

  ipcMain.handle('import:parseStatement', async (_e, filePath: string) => {
    try {
      const ext = filePath.toLowerCase().split('.').pop()
      let rawText = ''
      if (ext === 'pdf') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse')
        const buffer = readFileSync(filePath)
        const data = await pdfParse(buffer)
        rawText = data.text
      } else {
        rawText = readFileSync(filePath, 'utf-8')
      }
      if (!rawText.trim()) return { ok: false, error: 'File is empty or unreadable' }

      // Truncate very large statements to keep token usage reasonable
      const MAX_CHARS = 35000
      const text = rawText.length > MAX_CHARS ? rawText.slice(0, MAX_CHARS) : rawText

      if (!isLLMConfigured()) return { ok: false, error: 'No LLM provider configured' }

      const categories = getDb().prepare("SELECT name FROM categories WHERE type='expense' ORDER BY name").all() as any[]
      const categoryNames = categories.map(c => c.name)

      const sys = `You are a financial transaction parser. Extract all expense/debit transactions from the bank statement text below. Return ONLY a valid JSON object with a "transactions" array, where each item has:
{
  "date": "YYYY-MM-DD",
  "name": "Short merchant or description",
  "amount": number (positive, in dollars),
  "merchant": "Merchant name if identifiable",
  "category": "Best fit from this list: ${categoryNames.join(', ') || 'Uncategorized'}",
  "raw": "Original line from statement"
}

Rules:
- Only include DEBITS / WITHDRAWALS / PURCHASES (money leaving the account). IGNORE deposits, transfers in, refunds, interest credits.
- Amount must be positive.
- Skip headers, balances, totals, fees you can't identify as transactions.
- If you can't determine a category, use "Uncategorized".
- If unsure about a date, use the most recent likely date in the statement.
- Return an empty array [] if no expenses found.`

      const content = await chatComplete({
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: text },
        ],
        maxTokens: 4000,
        jsonResponse: true,
      }) || '{}'
      let parsed: any
      try {
        parsed = JSON.parse(content)
      } catch { parsed = {} }
      // Accept either {transactions:[...]} or raw array — normalize
      let transactions: any[] = []
      if (Array.isArray(parsed)) transactions = parsed
      else if (Array.isArray(parsed.transactions)) transactions = parsed.transactions
      else if (Array.isArray(parsed.expenses)) transactions = parsed.expenses
      else {
        // try to find any array property
        const arr = Object.values(parsed).find(v => Array.isArray(v)) as any[] | undefined
        if (arr) transactions = arr
      }

      // Validate and clean
      transactions = transactions
        .filter(t => t && typeof t === 'object' && t.amount)
        .map(t => ({
          date: t.date || new Date().toISOString().slice(0, 10),
          name: String(t.name || t.description || 'Unknown').slice(0, 100),
          amount: Math.abs(Number(t.amount)) || 0,
          merchant: t.merchant || null,
          category: t.category || 'Uncategorized',
          raw: t.raw || '',
        }))
        .filter(t => t.amount > 0)

      return { ok: true, transactions, totalChars: rawText.length, truncated: rawText.length > MAX_CHARS }
    } catch (e: any) {
      console.error('[import:parseStatement] error:', e)
      return { ok: false, error: e?.message || 'Failed to parse statement' }
    }
  })

  ipcMain.handle('import:parseReceipt', async (_e, ocrText: string) => {
    try {
      if (!isLLMConfigured()) return { ok: false, error: 'No LLM provider configured' }
      if (!ocrText || ocrText.trim().length < 5) return { ok: false, error: 'OCR text is empty or too short' }
      const categories = getDb().prepare("SELECT name FROM categories WHERE type='expense' ORDER BY name").all() as any[]
      const categoryNames = categories.map((c: any) => c.name)

      const sys = `You are a receipt parser. Given raw OCR text from a receipt photo, extract the purchase details and return ONLY a JSON object:
{
  "name": "Short description of the purchase (e.g. 'Lunch at Chipotle', 'Groceries')",
  "amount": number (the total/grand total in dollars),
  "date": "YYYY-MM-DD (use today's date if unclear)",
  "merchant": "Merchant/store name",
  "category": "Best fit from: ${categoryNames.join(', ') || 'Uncategorized'}",
  "items": ["item 1", "item 2"] (optional, top 3 line items),
  "confidence": "high" | "medium" | "low" (how sure you are about the parse)
}

Rules:
- Use ONLY the TOTAL/GRAND TOTAL/AMOUNT DUE — not subtotals, not tax alone.
- If multiple amounts appear, pick the largest that looks like a final total.
- Strip currency symbols from amount.
- If confidence is low, still return your best guess.`

      const today = new Date().toISOString().slice(0, 10)
      const content = await chatComplete({
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: `Today is ${today}. OCR text:\n\n${ocrText.slice(0, 6000)}` },
        ],
        maxTokens: 500,
        jsonResponse: true,
      }) || '{}'
      let parsed: any = {}
      try { parsed = JSON.parse(content) } catch {
        const m = content.match(/\{[\s\S]*\}/)
        if (m) try { parsed = JSON.parse(m[0]) } catch { parsed = {} }
      }
      if (!parsed.amount) return { ok: false, error: 'Could not detect a total amount in the receipt' }
      return {
        ok: true,
        receipt: {
          name: String(parsed.name || 'Receipt purchase').slice(0, 120),
          amount: Math.abs(Number(parsed.amount)) || 0,
          date: parsed.date || today,
          merchant: parsed.merchant || null,
          category: parsed.category || 'Uncategorized',
          items: Array.isArray(parsed.items) ? parsed.items.slice(0, 5) : [],
          confidence: parsed.confidence || 'medium',
        },
      }
    } catch (e: any) {
      console.error('[import:parseReceipt] error:', e)
      return { ok: false, error: e?.message || 'Failed to parse receipt' }
    }
  })

  ipcMain.handle('import:commit', (_e, transactions: any[]) => {
    const db = getDb()
    const insert = db.prepare(`INSERT INTO expenses (category_id, name, amount, date, type, merchant, payment_method) VALUES (?,?,?,?,?,?,?)`)
    const getCat = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)')
    const tx = db.transaction((items: any[]) => {
      let count = 0
      for (const t of items) {
        const cat = getCat.get(t.category) as any
        insert.run(cat?.id || null, t.name, Number(t.amount), t.date, 'variable', t.merchant || null, 'bank')
        count++
      }
      return count
    })
    const inserted = tx(transactions)
    return { ok: true, inserted }
  })

  // ─── Encrypted Vault Sync ──────────────────────────────────────────────
  function deriveKey(password: string, salt: Buffer): Buffer {
    return pbkdf2Sync(password, salt, 100000, 32, 'sha256')
  }

  function encryptBuffer(plain: Buffer, password: string): Buffer {
    const salt = randomBytes(16)
    const iv = randomBytes(16)
    const key = deriveKey(password, salt)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()])
    const authTag = cipher.getAuthTag()
    // Format: salt (16) + iv (16) + authTag (16) + ciphertext
    return Buffer.concat([salt, iv, authTag, encrypted])
  }

  function decryptBuffer(data: Buffer, password: string): Buffer {
    if (data.length < 48) throw new Error('Invalid vault file (too small)')
    const salt = data.slice(0, 16)
    const iv = data.slice(16, 32)
    const authTag = data.slice(32, 48)
    const encrypted = data.slice(48)
    const key = deriveKey(password, salt)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()])
  }

  ipcMain.handle('vault:export', async (_e, password: string) => {
    try {
      if (!password || password.length < 6) return { ok: false, error: 'Password must be at least 6 characters' }
      const result = await dialog.showSaveDialog({
        defaultPath: 'wealthos-vault.wealth',
        filters: [{ name: 'WealthOS Vault', extensions: ['wealth'] }],
      })
      if (result.canceled || !result.filePath) return { ok: false, cancelled: true }
      const plain = readFileSync(dbPath)
      const encrypted = encryptBuffer(plain, password)
      writeFileSync(result.filePath, encrypted)
      const ts = new Date().toISOString()
      getDb().prepare(`INSERT INTO settings (key, value) VALUES ('vault_last_backup', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(ts)
      return { ok: true, path: result.filePath, timestamp: ts }
    } catch (e: any) {
      console.error('[vault:export] error:', e)
      return { ok: false, error: e?.message || 'Export failed' }
    }
  })

  ipcMain.handle('vault:import', async (_e, password: string) => {
    try {
      if (!password || password.length < 6) return { ok: false, error: 'Password must be at least 6 characters' }
      const result = await dialog.showOpenDialog({
        filters: [{ name: 'WealthOS Vault', extensions: ['wealth'] }],
        properties: ['openFile'],
      })
      if (result.canceled || !result.filePaths.length) return { ok: false, cancelled: true }
      const filePath = result.filePaths[0]
      const encrypted = readFileSync(filePath)
      const plain = decryptBuffer(encrypted, password)
      // Validate SQLite header
      const header = plain.slice(0, 16).toString('ascii')
      if (!header.includes('SQLite format')) return { ok: false, error: 'Decrypted file is not a valid WealthOS database' }
      // Safe restore: backup current, write new, keep backup
      const backupPath = dbPath + '.backup-' + Date.now()
      copyFileSync(dbPath, backupPath)
      const tempPath = join(tmpdir(), 'wealthos-restore-' + Date.now() + '.db')
      writeFileSync(tempPath, plain)
      renameSync(tempPath, dbPath)
      // Update timestamp
      const ts = new Date().toISOString()
      getDb().prepare(`INSERT INTO settings (key, value) VALUES ('vault_last_restore', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(ts)
      return { ok: true, path: filePath, backupPath, timestamp: ts }
    } catch (e: any) {
      console.error('[vault:import] error:', e)
      return { ok: false, error: e?.message || 'Import failed. Wrong password or corrupted file.' }
    }
  })

  ipcMain.handle('vault:info', () => {
    try {
      const db = getDb()
      const lastBackup = db.prepare("SELECT value FROM settings WHERE key = 'vault_last_backup'").get() as any
      const lastRestore = db.prepare("SELECT value FROM settings WHERE key = 'vault_last_restore'").get() as any
      return {
        ok: true,
        lastBackup: lastBackup?.value || null,
        lastRestore: lastRestore?.value || null,
      }
    } catch (e: any) {
      return { ok: false, error: e?.message }
    }
  })

  // ─── Plugin System ─────────────────────────────────────────────────────
  const pluginsDir = join(app.getPath('userData'), 'plugins')
  if (!existsSync(pluginsDir)) mkdirSync(pluginsDir)

  ipcMain.handle('plugin:discover', () => {
    try {
      const db = getDb()
      const files = readdirSync(pluginsDir).filter(f => f.endsWith('.plugin.js'))
      const rows = db.prepare('SELECT * FROM plugins ORDER BY created_at DESC').all() as any[]
      const dbMap = new Map(rows.map(r => [r.file_name, r]))
      const plugins = files.map(file => {
        const row = dbMap.get(file)
        if (row) return { ...row, installed: true }
        // Auto-register unknown files
        const res = db.prepare('INSERT INTO plugins (name, file_name, enabled) VALUES (?, ?, 1)').run(file, file)
        return { id: res.lastInsertRowid, name: file, description: '', version: '1.0.0', author: '', file_name: file, enabled: 1, created_at: new Date().toISOString(), installed: true }
      })
      return { ok: true, plugins }
    } catch (e: any) {
      console.error('[plugin:discover] error:', e)
      return { ok: false, error: e?.message }
    }
  })

  ipcMain.handle('plugin:install', async (_e, fileName: string, code: string) => {
    try {
      if (!fileName.endsWith('.plugin.js')) fileName += '.plugin.js'
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '')
      if (!safeName) return { ok: false, error: 'Invalid file name' }
      const filePath = join(pluginsDir, safeName)
      writeFileSync(filePath, code, 'utf-8')
      const db = getDb()
      const existing = db.prepare('SELECT id FROM plugins WHERE file_name = ?').get(safeName) as any
      if (!existing) {
        db.prepare('INSERT INTO plugins (name, file_name, enabled) VALUES (?, ?, 1)').run(safeName, safeName)
      }
      return { ok: true, fileName: safeName }
    } catch (e: any) {
      console.error('[plugin:install] error:', e)
      return { ok: false, error: e?.message }
    }
  })

  ipcMain.handle('plugin:uninstall', (_e, fileName: string) => {
    try {
      const filePath = join(pluginsDir, fileName)
      if (existsSync(filePath)) unlinkSync(filePath)
      const db = getDb()
      db.prepare('DELETE FROM plugins WHERE file_name = ?').run(fileName)
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message }
    }
  })

  ipcMain.handle('plugin:toggle', (_e, id: number, enabled: boolean) => {
    try {
      const db = getDb()
      db.prepare('UPDATE plugins SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id)
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message }
    }
  })

  ipcMain.handle('plugin:getCode', (_e, fileName: string) => {
    try {
      const filePath = join(pluginsDir, fileName)
      if (!existsSync(filePath)) return { ok: false, error: 'Plugin file not found' }
      const code = readFileSync(filePath, 'utf-8')
      return { ok: true, code }
    } catch (e: any) {
      return { ok: false, error: e?.message }
    }
  })

  // ─── Knowledge Base ────────────────────────────────────────────────────
  ipcMain.handle('kb:get', () => {
    const db = getDb()
    const row = db.prepare('SELECT * FROM knowledge_base ORDER BY id DESC LIMIT 1').get() as any
    return row || { id: null, content: '', updated_at: '' }
  })

  ipcMain.handle('kb:save', (_e, content: string) => {
    const db = getDb()
    const existing = db.prepare('SELECT id FROM knowledge_base ORDER BY id DESC LIMIT 1').get() as any
    if (existing) {
      db.prepare('UPDATE knowledge_base SET content = ?, updated_at = datetime(\'now\') WHERE id = ?').run(content, existing.id)
      return db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(existing.id)
    } else {
      const res = db.prepare('INSERT INTO knowledge_base (content) VALUES (?)').run(content)
      return db.prepare('SELECT * FROM knowledge_base WHERE id = ?').get(res.lastInsertRowid)
    }
  })

  ipcMain.handle('ai:getVoices', async (_e, apiKey?: string) => {
    try {
      let key = apiKey
      if (!key) {
        const settings = getDb().prepare('SELECT value FROM settings WHERE key = ?').get('elevenlabs_key') as any
        key = settings ? JSON.parse(settings.value) : null
      }
      if (!key) throw new Error('No ElevenLabs API key configured')
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': key },
      })
      if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`)
      const data = await response.json() as any
      return (data.voices || []).map((v: any) => ({ id: v.voice_id, name: v.name, gender: v.labels?.gender || 'unknown', preview: v.preview_url }))
    } catch (e: any) {
      throw new Error(e.message || 'Failed to fetch voices')
    }
  })

  ipcMain.handle('ai:speak', async (_e, text: string, voiceId?: string, apiKey?: string) => {
    try {
      let key = apiKey
      if (!key) {
        const settings = getDb().prepare('SELECT value FROM settings WHERE key = ?').get('elevenlabs_key') as any
        key = settings ? JSON.parse(settings.value) : null
      }
      if (!key) throw new Error('No ElevenLabs API key configured')

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || '21m00Tcm4TlvDq8ikWAM'}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': key,
        },
        body: JSON.stringify({
          text: text.slice(0, 2500),
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.5 },
        }),
      })
      if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      return { audio: `data:audio/mpeg;base64,${base64}` }
    } catch (e: any) {
      throw new Error(e.message || 'Voice synthesis failed')
    }
  })

  ipcMain.handle('ai:transcribe', async (_e, audioBase64: string) => {
    let tmpPath = ''
    try {
      const settings = getDb().prepare('SELECT value FROM settings WHERE key = ?').get('openai_key') as any
      const apiKey = settings ? JSON.parse(settings.value) : null
      if (!apiKey) throw new Error('No OpenAI API key configured')

      const buffer = Buffer.from(audioBase64.split(',')[1] || audioBase64, 'base64')
      tmpPath = join(tmpdir(), `voice-${Date.now()}.webm`)
      writeFileSync(tmpPath, buffer)

      const client = new OpenAI({ apiKey })
      const transcription = await client.audio.transcriptions.create({
        file: createReadStream(tmpPath),
        model: 'whisper-1',
      })
      return { text: transcription.text || '' }
    } catch (e: any) {
      throw new Error(e.message || 'Transcription failed')
    } finally {
      if (tmpPath) { try { unlinkSync(tmpPath) } catch {} }
    }
  })

  ipcMain.handle('ai:generateTheme', async (_e, description: string) => {
    try {
      if (!isLLMConfigured()) throw new Error('No LLM provider configured')

      const prompt = `You are a UI/UX theme designer. Generate a complete theme configuration for a personal finance app based on this user description: "${description}".

Respond ONLY with a valid JSON object matching this TypeScript interface (all values must be strings unless boolean):
{
  "preset": string,
  "mode": "dark" | "light" | "system",
  "primary": "H S% L%",
  "secondary": "H S% L%",
  "accent": "H S% L%",
  "background": "H S% L%",
  "card": "H S% L%",
  "muted": "H S% L%",
  "border": "H S% L%",
  "radius": "0.5rem" | "0.75rem" | "1rem",
  "font": "Inter" | "DM Sans" | "Sora",
  "fontSize": "14px" | "16px" | "18px",
  "sidebarStyle": "floating" | "flush" | "mini",
  "chartPalette": "vivid" | "pastel" | "monochrome" | "neon" | "earth" | "ocean",
  "cardStyle": "default" | "elevated" | "glass" | "flat",
  "density": "compact" | "comfortable" | "spacious",
  "motion": boolean,
  "sidebarColor": string (HSL or transparent),
  "topbarColor": string (HSL),
  "cardHoverAnimation": "none" | "lift" | "glow" | "scale" | "shine" | "border-glow",
  "cardBorderStyle": "default" | "glow" | "gradient" | "neon",
  "lightDirection": "top" | "bottom" | "left" | "right" | "center" | "radial",
  "glassMorphism": boolean,
  "glassBlur": "sm" | "md" | "lg" | "xl" | "2xl",
  "glassOpacity": "0.05" | "0.1" | "0.15" | "0.2",
  "backgroundImage": string (empty or image URL),
  "backgroundOverlay": "0.3" | "0.5" | "0.7" | "0.9",
  "backgroundSize": "cover" | "contain" | "auto",
  "appBlur": "none" | "sm" | "md" | "lg",
  "animationSpeed": "slow" | "normal" | "fast",
  "hoverIntensity": "subtle" | "medium" | "strong",
  "shadowIntensity": "none" | "soft" | "medium" | "strong" | "neon",
  "borderWidth": "thin" | "normal" | "thick",
  "iconStyle": "outline" | "filled" | "duotone",
  "scrollbarStyle": "default" | "thin" | "hidden" | "rounded",
  "gradientOverlay": boolean,
  "noiseTexture": boolean,
  "ambientGlow": boolean,
  "sidebarGlow": boolean
}

Design a cohesive, visually stunning theme. Be creative but ensure all colors work together. For dark themes use low lightness backgrounds (5-15%). For light themes use high lightness (90-98%). Only output the JSON object, no markdown, no explanation.`

      const text = await chatComplete({
        messages: [
          { role: 'system', content: 'You are a UI theme generator. Respond ONLY with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        maxTokens: 1200,
        jsonResponse: true,
      }) || '{}'
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch (e: any) {
      throw new Error(e.message || 'Failed to generate theme')
    }
  })

  ipcMain.handle('ai:generateInsights', async () => {
    try {
      if (!isLLMConfigured()) throw new Error('No LLM provider configured')

      const db = getDb()
      const income = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM income_sources WHERE active = 1`).get() as any
      const expenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')`).get() as any
      const topCategories = db.prepare(`SELECT c.name, SUM(e.amount) as total FROM expenses e JOIN categories c ON e.category_id = c.id WHERE strftime('%Y-%m', e.date) = strftime('%Y-%m', 'now') GROUP BY c.name ORDER BY total DESC LIMIT 5`).all() as any[]
      const goals = db.prepare(`SELECT name, target_amount, current_amount FROM savings_goals WHERE completed_at IS NULL`).all() as any[]
      const subscriptions = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM subscriptions WHERE active = 1`).get() as any

      const prompt = `Analyze this financial data and return 4 insights as a JSON array with objects shaped like {"type": "tip|warning|positive|negative", "title": "...", "content": "..."}. Keep titles under 40 chars and content under 120 chars. Data: Monthly income ${income.total}, expenses ${expenses.total}, subscriptions ${subscriptions.total}. Top categories: ${topCategories.map(c => `${c.name} ($${c.total})`).join(', ')}. Goals: ${goals.map(g => `${g.name} ($${g.current_amount}/$${g.target_amount})`).join(', ')}.`

      const _content = await chatComplete({
        messages: [
          { role: 'system', content: 'You are a financial analyst. Respond ONLY with a valid JSON array of insight objects.' },
          { role: 'user', content: prompt },
        ],
        maxTokens: 800,
        jsonResponse: true,
      }) || '[]'
      const completion = { choices: [{ message: { content: _content } }] } as any
      const text = completion.choices[0]?.message?.content || '[]'
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      return jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch (e: any) {
      throw new Error(e.message || 'Failed to generate insights')
    }
  })

  // ─── Data Management ────────────────────────────────────────────────────
  ipcMain.handle('data:export', async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Data',
        defaultPath: join(app.getPath('downloads'), 'wealthos-backup.json'),
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      })
      if (result.canceled) return { cancelled: true }
      const db = getDb()
      const data = {
        income_sources: db.prepare('SELECT * FROM income_sources').all(),
        expenses: db.prepare('SELECT * FROM expenses').all(),
        categories: db.prepare('SELECT * FROM categories').all(),
        loans: db.prepare('SELECT * FROM loans').all(),
        loan_payments: db.prepare('SELECT * FROM loan_payments').all(),
        savings_goals: db.prepare('SELECT * FROM savings_goals').all(),
        investments: db.prepare('SELECT * FROM investments').all(),
        people_owed: db.prepare('SELECT * FROM people_owed').all(),
        people_payments: db.prepare('SELECT * FROM people_payments').all(),
        bad_habits: db.prepare('SELECT * FROM bad_habits').all(),
        bad_habit_log: db.prepare('SELECT * FROM bad_habit_log').all(),
        subscriptions: db.prepare('SELECT * FROM subscriptions').all(),
        date_budgets: db.prepare('SELECT * FROM date_budgets').all(),
        date_budget_items: db.prepare('SELECT * FROM date_budget_items').all(),
        financial_mood_log: db.prepare('SELECT * FROM financial_mood_log').all(),
        reminders: db.prepare('SELECT * FROM reminders').all(),
        settings: db.prepare('SELECT * FROM settings').all(),
        net_worth_history: db.prepare('SELECT * FROM net_worth_history').all(),
        insights: db.prepare('SELECT * FROM insights').all(),
      }
      writeFileSync(result.filePath!, JSON.stringify(data, null, 2))
      return { success: true, path: result.filePath }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Export failed' }
    }
  })

  ipcMain.handle('data:import', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Data',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
      })
      if (result.canceled) return { cancelled: true }
      const raw = readFileSync(result.filePaths[0], 'utf-8')
      const data = JSON.parse(raw)
      const db = getDb()
      const tables = [
        'income_sources', 'expenses', 'categories', 'loans', 'loan_payments',
        'savings_goals', 'investments', 'people_owed', 'people_payments',
        'bad_habits', 'bad_habit_log', 'subscriptions', 'date_budgets',
        'date_budget_items', 'financial_mood_log', 'reminders', 'settings',
        'net_worth_history', 'insights'
      ]
      for (const table of tables) {
        if (Array.isArray(data[table]) && data[table].length > 0) {
          const columns = Object.keys(data[table][0]).filter(c => c !== 'id')
          if (columns.length === 0) continue
          const placeholders = columns.map(() => '?').join(',')
          const insert = db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`)
          const insertMany = db.transaction((rows: any[]) => {
            for (const row of rows) {
              try {
                insert.run(columns.map(c => row[c] ?? null))
              } catch { /* skip duplicates or errors */ }
            }
          })
          insertMany(data[table])
        }
      }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Import failed' }
    }
  })

  ipcMain.handle('data:clearAll', () => {
    const db = getDb()
    const tables = [
      'income_sources', 'expenses', 'categories', 'loans', 'loan_payments',
      'savings_goals', 'investments', 'people_owed', 'people_payments',
      'bad_habits', 'bad_habit_log', 'subscriptions', 'date_budgets',
      'date_budget_items', 'financial_mood_log', 'reminders',
      'net_worth_history', 'insights'
    ]
    for (const table of tables) {
      try { db.prepare(`DELETE FROM ${table}`).run() } catch { /* ignore */ }
    }
    return { success: true }
  })

  ipcMain.handle('data:clearCategory', (_e, category: string) => {
    const db = getDb()
    const tableMap: Record<string, string[]> = {
      expenses: ['expenses'],
      income: ['income_sources'],
      investments: ['investments'],
      loans: ['loans', 'loan_payments'],
      goals: ['savings_goals'],
      subscriptions: ['subscriptions'],
      habits: ['bad_habits', 'bad_habit_log'],
      mood: ['financial_mood_log']
    }
    const tables = tableMap[category] || []
    for (const table of tables) {
      try { db.prepare(`DELETE FROM ${table}`).run() } catch { /* ignore */ }
    }
    return { success: true }
  })

  // ─── Generic AI Completion (structured messages array) ──────────────
  ipcMain.handle('ai:complete', async (_e, opts: { messages: any[]; maxTokens?: number; jsonResponse?: boolean }) => {
    console.log('[IPC ai:complete] Request received, maxTokens:', opts.maxTokens, 'jsonResponse:', opts.jsonResponse)
    try {
      if (!isLLMConfigured()) throw new Error('No LLM provider configured')
      const text = await chatComplete({
        messages: opts.messages,
        maxTokens: opts.maxTokens || 500,
        jsonResponse: opts.jsonResponse,
      })
      return { ok: true, text }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'AI request failed' }
    }
  })

}
