import { IpcMain, app } from 'electron'
import { join } from 'path'
import { writeFileSync, mkdirSync, existsSync, unlinkSync, readFileSync } from 'fs'
import { getDb } from '../db/database'

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `business-${Date.now()}`
}

function uniqueSlug(base: string): string {
  const db = getDb()
  let slug = base
  let counter = 1
  while (db.prepare('SELECT 1 FROM businesses WHERE slug = ?').get(slug)) {
    slug = `${base}-${counter++}`
  }
  return slug
}

function businessAssetsDir(businessId: number): string {
  const dir = join(app.getPath('userData'), 'businesses', String(businessId))
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function setupBusinessHandlers(ipcMain: IpcMain): void {
  // ─── Businesses CRUD ──────────────────────────────────────────────────
  ipcMain.handle('businesses:list', () => {
    const db = getDb()
    return db.prepare(`
      SELECT b.*,
        (SELECT COUNT(*) FROM agents WHERE business_id = b.id AND is_active = 1) as agent_count,
        (SELECT COUNT(*) FROM business_assets WHERE business_id = b.id) as asset_count,
        (SELECT COUNT(*) FROM social_accounts WHERE business_id = b.id AND is_active = 1) as social_account_count
      FROM businesses b
      WHERE is_active = 1
      ORDER BY created_at DESC
    `).all()
  })

  ipcMain.handle('businesses:get', (_e, id: number) => {
    const db = getDb()
    return db.prepare('SELECT * FROM businesses WHERE id = ?').get(id)
  })

  ipcMain.handle('businesses:create', (_e, data: {
    name: string
    description?: string
    industry?: string
    website?: string
    founded_date?: string
    currency?: string
    brand_color?: string
    mission?: string
    target_audience?: string
    logo_base64?: string
  }) => {
    const db = getDb()
    if (!data?.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      return { ok: false, error: 'Business name is required' }
    }
    const slug = uniqueSlug(slugify(data.name))
    const res = db.prepare(`
      INSERT INTO businesses (name, slug, description, industry, website, founded_date, currency, brand_color, mission, target_audience)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name.trim(),
      slug,
      data.description || null,
      data.industry || null,
      data.website || null,
      data.founded_date || null,
      data.currency || 'USD',
      data.brand_color || '#3b82f6',
      data.mission || null,
      data.target_audience || null,
    )
    const id = res.lastInsertRowid as number

    // Save logo if provided
    if (data.logo_base64) {
      try {
        const match = data.logo_base64.match(/^data:image\/(\w+);base64,(.+)$/)
        if (match) {
          const ext = match[1]
          const buffer = Buffer.from(match[2], 'base64')
          const logoPath = join(businessAssetsDir(id), `logo.${ext}`)
          writeFileSync(logoPath, buffer)
          db.prepare('UPDATE businesses SET logo_path = ? WHERE id = ?').run(logoPath, id)
        }
      } catch (e) {
        console.error('[businesses:create] logo save failed', e)
      }
    }
    return { ok: true, id, business: db.prepare('SELECT * FROM businesses WHERE id = ?').get(id) }
  })

  ipcMain.handle('businesses:update', (_e, id: number, data: Record<string, unknown>) => {
    const db = getDb()
    const allowed = ['name', 'description', 'industry', 'website', 'founded_date', 'currency', 'brand_color', 'mission', 'target_audience']
    const updates: string[] = []
    const values: unknown[] = []
    for (const key of allowed) {
      if (key in data) {
        updates.push(`${key} = ?`)
        values.push(data[key])
      }
    }
    if (updates.length === 0) return { ok: false, error: 'No valid fields to update' }
    updates.push("updated_at = datetime('now')")
    values.push(id)
    db.prepare(`UPDATE businesses SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    // Handle logo update separately
    if (typeof data.logo_base64 === 'string' && data.logo_base64.startsWith('data:image/')) {
      try {
        const match = data.logo_base64.match(/^data:image\/(\w+);base64,(.+)$/)
        if (match) {
          const ext = match[1]
          const buffer = Buffer.from(match[2], 'base64')
          const logoPath = join(businessAssetsDir(id), `logo.${ext}`)
          writeFileSync(logoPath, buffer)
          db.prepare('UPDATE businesses SET logo_path = ? WHERE id = ?').run(logoPath, id)
        }
      } catch (e) {
        console.error('[businesses:update] logo save failed', e)
      }
    }
    return { ok: true, business: db.prepare('SELECT * FROM businesses WHERE id = ?').get(id) }
  })

  ipcMain.handle('businesses:delete', (_e, id: number) => {
    const db = getDb()
    // Soft delete - keeps data, hides from UI
    db.prepare('UPDATE businesses SET is_active = 0 WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('businesses:getLogo', (_e, id: number) => {
    const db = getDb()
    const row = db.prepare('SELECT logo_path FROM businesses WHERE id = ?').get(id) as any
    if (!row?.logo_path || !existsSync(row.logo_path)) return null
    try {
      const buffer = readFileSync(row.logo_path)
      const ext = row.logo_path.split('.').pop() || 'png'
      return `data:image/${ext};base64,${buffer.toString('base64')}`
    } catch {
      return null
    }
  })

  // ─── Knowledge Base ───────────────────────────────────────────────────
  ipcMain.handle('businesses:kb:list', (_e, businessId: number) => {
    return getDb().prepare('SELECT * FROM business_knowledge WHERE business_id = ? ORDER BY pinned DESC, updated_at DESC').all(businessId)
  })

  ipcMain.handle('businesses:kb:add', (_e, businessId: number, data: { type?: string; title?: string; content: string; tags?: string }) => {
    const db = getDb()
    if (!data?.content) return { ok: false, error: 'Content is required' }
    const res = db.prepare(`
      INSERT INTO business_knowledge (business_id, type, title, content, tags)
      VALUES (?, ?, ?, ?, ?)
    `).run(businessId, data.type || 'note', data.title || null, data.content, data.tags || null)
    return { ok: true, id: res.lastInsertRowid }
  })

  ipcMain.handle('businesses:kb:update', (_e, id: number, data: Record<string, unknown>) => {
    const db = getDb()
    const allowed = ['type', 'title', 'content', 'tags', 'pinned']
    const updates: string[] = []
    const values: unknown[] = []
    for (const key of allowed) {
      if (key in data) {
        updates.push(`${key} = ?`)
        values.push(data[key])
      }
    }
    if (updates.length === 0) return { ok: false, error: 'No fields to update' }
    updates.push("updated_at = datetime('now')")
    values.push(id)
    db.prepare(`UPDATE business_knowledge SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    return { ok: true }
  })

  ipcMain.handle('businesses:kb:delete', (_e, id: number) => {
    getDb().prepare('DELETE FROM business_knowledge WHERE id = ?').run(id)
    return { ok: true }
  })

  // ─── Metrics ──────────────────────────────────────────────────────────
  ipcMain.handle('businesses:metrics:list', (_e, businessId: number, metricType?: string) => {
    const db = getDb()
    if (metricType) {
      return db.prepare('SELECT * FROM business_metrics WHERE business_id = ? AND metric_type = ? ORDER BY period_start DESC').all(businessId, metricType)
    }
    return db.prepare('SELECT * FROM business_metrics WHERE business_id = ? ORDER BY period_start DESC').all(businessId)
  })

  ipcMain.handle('businesses:metrics:add', (_e, businessId: number, data: {
    metric_type: string
    value: number
    unit?: string
    period_start: string
    period_end?: string
    source?: string
    notes?: string
  }) => {
    const db = getDb()
    const res = db.prepare(`
      INSERT INTO business_metrics (business_id, metric_type, value, unit, period_start, period_end, source, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(businessId, data.metric_type, data.value, data.unit || '', data.period_start, data.period_end || null, data.source || null, data.notes || null)
    return { ok: true, id: res.lastInsertRowid }
  })

  ipcMain.handle('businesses:metrics:delete', (_e, id: number) => {
    getDb().prepare('DELETE FROM business_metrics WHERE id = ?').run(id)
    return { ok: true }
  })

  // ─── Agents (Phase 2 — endpoints exist, full logic comes next) ────────
  ipcMain.handle('businesses:agents:list', (_e, businessId: number) => {
    return getDb().prepare('SELECT * FROM agents WHERE business_id = ? ORDER BY parent_agent_id NULLS FIRST, created_at ASC').all(businessId)
  })

  ipcMain.handle('businesses:agents:create', (_e, businessId: number, data: {
    role?: string; name: string; avatar?: string; system_prompt: string; parent_agent_id?: number; tools_json?: string
  }) => {
    const db = getDb()
    const res = db.prepare(`
      INSERT INTO agents (business_id, parent_agent_id, role, name, avatar, system_prompt, tools_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      businessId,
      data.parent_agent_id || null,
      data.role || 'custom',
      data.name,
      data.avatar || '🤖',
      data.system_prompt,
      data.tools_json || '[]'
    )
    return { ok: true, id: res.lastInsertRowid }
  })

  ipcMain.handle('businesses:agents:delete', (_e, id: number) => {
    getDb().prepare('UPDATE agents SET is_active = 0 WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('businesses:agents:tasks', (_e, businessId: number) => {
    return getDb().prepare(`
      SELECT t.*, a.name as agent_name, a.avatar as agent_avatar, a.role as agent_role
      FROM agent_tasks t
      LEFT JOIN agents a ON a.id = t.agent_id
      WHERE t.business_id = ?
      ORDER BY t.created_at DESC
      LIMIT 100
    `).all(businessId)
  })

  // ─── Assets (Phase 3 endpoints) ───────────────────────────────────────
  ipcMain.handle('businesses:assets:list', (_e, businessId: number, type?: string) => {
    const db = getDb()
    if (type) {
      return db.prepare('SELECT * FROM business_assets WHERE business_id = ? AND type = ? ORDER BY updated_at DESC').all(businessId, type)
    }
    return db.prepare('SELECT * FROM business_assets WHERE business_id = ? ORDER BY updated_at DESC').all(businessId)
  })

  ipcMain.handle('businesses:assets:save', (_e, businessId: number, data: {
    id?: number; type: string; name: string; canvas_json: string; thumbnail_base64?: string; width?: number; height?: number
  }) => {
    const db = getDb()
    let assetId = data.id
    let thumbnailPath: string | null = null

    if (data.thumbnail_base64) {
      try {
        const match = data.thumbnail_base64.match(/^data:image\/(\w+);base64,(.+)$/)
        if (match) {
          const buffer = Buffer.from(match[2], 'base64')
          thumbnailPath = join(businessAssetsDir(businessId), `asset-thumb-${Date.now()}.${match[1]}`)
          writeFileSync(thumbnailPath, buffer)
        }
      } catch (e) { console.error('[assets:save] thumb failed', e) }
    }

    if (assetId) {
      db.prepare(`
        UPDATE business_assets SET name = ?, canvas_json = ?, ${thumbnailPath ? 'thumbnail_path = ?,' : ''} updated_at = datetime('now')
        WHERE id = ?
      `).run(...(thumbnailPath ? [data.name, data.canvas_json, thumbnailPath, assetId] : [data.name, data.canvas_json, assetId]))
    } else {
      const res = db.prepare(`
        INSERT INTO business_assets (business_id, type, name, canvas_json, thumbnail_path, width, height)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(businessId, data.type, data.name, data.canvas_json, thumbnailPath, data.width || null, data.height || null)
      assetId = res.lastInsertRowid as number
    }
    return { ok: true, id: assetId }
  })

  ipcMain.handle('businesses:assets:delete', (_e, id: number) => {
    const db = getDb()
    const row = db.prepare('SELECT thumbnail_path, export_path FROM business_assets WHERE id = ?').get(id) as any
    if (row?.thumbnail_path && existsSync(row.thumbnail_path)) {
      try { unlinkSync(row.thumbnail_path) } catch {}
    }
    if (row?.export_path && existsSync(row.export_path)) {
      try { unlinkSync(row.export_path) } catch {}
    }
    db.prepare('DELETE FROM business_assets WHERE id = ?').run(id)
    return { ok: true }
  })

  // ─── Social Accounts (Phase 4 endpoints — encryption added later) ─────
  ipcMain.handle('businesses:social:list', (_e, businessId: number) => {
    return getDb().prepare(`
      SELECT id, business_id, platform, account_handle, account_id_remote, expires_at, scopes, connected_at, is_active
      FROM social_accounts WHERE business_id = ?
    `).all(businessId)
  })

  // ─── Posts ────────────────────────────────────────────────────────────
  ipcMain.handle('businesses:posts:list', (_e, businessId: number, status?: string) => {
    const db = getDb()
    if (status) {
      return db.prepare('SELECT * FROM social_posts WHERE business_id = ? AND status = ? ORDER BY scheduled_at DESC').all(businessId, status)
    }
    return db.prepare('SELECT * FROM social_posts WHERE business_id = ? ORDER BY scheduled_at DESC LIMIT 200').all(businessId)
  })

  ipcMain.handle('businesses:posts:create', (_e, businessId: number, data: {
    platform: string; content_text: string; hashtags?: string; scheduled_at?: string; asset_id?: number; account_id?: number
  }) => {
    const db = getDb()
    const res = db.prepare(`
      INSERT INTO social_posts (business_id, platform, content_text, hashtags, scheduled_at, asset_id, account_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(businessId, data.platform, data.content_text, data.hashtags || null, data.scheduled_at || null, data.asset_id || null, data.account_id || null, data.scheduled_at ? 'scheduled' : 'draft')
    return { ok: true, id: res.lastInsertRowid }
  })
}
