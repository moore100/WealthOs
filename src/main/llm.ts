import OpenAI from 'openai'
import { getDb } from '../db/database'

export type LLMProvider = 'openai' | 'ollama'

export interface LLMSettings {
  provider: LLMProvider
  openaiKey: string | null
  openaiModel: string
  ollamaUrl: string
  ollamaModel: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  messages: ChatMessage[]
  maxTokens?: number
  jsonResponse?: boolean
  temperature?: number
}

export function getLLMSettings(): LLMSettings {
  const db = getDb()
  const get = (key: string): any => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any
    if (!row) return null
    try { return JSON.parse(row.value) } catch { return row.value }
  }
  const settings: LLMSettings = {
    provider: (get('llm_provider') || 'openai') as LLMProvider,
    openaiKey: get('openai_key'),
    openaiModel: get('openai_model') || 'gpt-4o-mini',
    ollamaUrl: (get('ollama_url') || 'http://localhost:11434').replace(/\/+$/, ''),
    ollamaModel: get('ollama_model') || 'llama3.2',
  }
  console.log('[LLM Settings]', settings)
  return settings
}

export async function chatComplete(opts: ChatOptions): Promise<string> {
  const cfg = getLLMSettings()
  console.log(`[LLM] Provider: ${cfg.provider}, Ollama URL: ${cfg.ollamaUrl}, Model: ${cfg.ollamaModel}`)
  if (cfg.provider === 'ollama') return chatOllama(opts, cfg)
  return chatOpenAI(opts, cfg)
}

async function chatOpenAI(opts: ChatOptions, cfg: LLMSettings): Promise<string> {
  if (!cfg.openaiKey) throw new Error('No OpenAI API key configured')
  const client = new OpenAI({ apiKey: cfg.openaiKey })
  const completion = await client.chat.completions.create({
    model: cfg.openaiModel,
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? 1200,
    temperature: opts.temperature ?? 0.7,
    ...(opts.jsonResponse ? { response_format: { type: 'json_object' as const } } : {}),
  })
  return completion.choices[0]?.message?.content || ''
}

async function chatOllama(opts: ChatOptions, cfg: LLMSettings): Promise<string> {
  const url = `${cfg.ollamaUrl}/api/chat`
  console.log(`[LLM] Sending request to Ollama: ${url}, model: ${cfg.ollamaModel}`)
  const body: any = {
    model: cfg.ollamaModel,
    messages: opts.messages,
    stream: false,
    options: {
      num_predict: opts.maxTokens ?? 1200,
      temperature: opts.temperature ?? 0.7,
    },
  }
  if (opts.jsonResponse) body.format = 'json'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    console.log(`[LLM] Ollama response status: ${res.status}`)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Ollama error ${res.status}: ${text || res.statusText}`)
    }
    const data: any = await res.json()
    return data?.message?.content || ''
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}

export async function listOllamaModels(url: string): Promise<string[]> {
  const cleanUrl = (url || 'http://localhost:11434').replace(/\/+$/, '')
  const res = await fetch(`${cleanUrl}/api/tags`)
  if (!res.ok) throw new Error(`Ollama unreachable (${res.status})`)
  const data: any = await res.json()
  return (data?.models || []).map((m: any) => m?.name).filter(Boolean)
}

export async function testOllama(url: string, model: string): Promise<{ ok: boolean; error?: string; sample?: string }> {
  try {
    const cleanUrl = (url || 'http://localhost:11434').replace(/\/+$/, '')
    const res = await fetch(`${cleanUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
        stream: false,
        options: { num_predict: 20 },
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status}: ${text || res.statusText}` }
    }
    const data: any = await res.json()
    return { ok: true, sample: data?.message?.content || '' }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Connection failed' }
  }
}

export function isLLMConfigured(): boolean {
  const cfg = getLLMSettings()
  if (cfg.provider === 'openai') return !!cfg.openaiKey
  return true // assume Ollama is local; will error at call time if not running
}
