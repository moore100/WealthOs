export async function chatComplete(opts: { messages: any[]; maxTokens?: number; jsonResponse?: boolean }): Promise<string> {
  const res = await window.api?.llm?.complete(opts)
  if (!res?.ok) throw new Error(res?.error || 'AI request failed')
  return res.text || ''
}

export async function isLLMConfigured(): Promise<boolean> {
  try {
    const settings = await window.api?.llm?.getSettings()
    return !!settings && !!settings.provider
  } catch {
    return false
  }
}
